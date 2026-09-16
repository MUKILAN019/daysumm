import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { createHash } from 'crypto';

initializeApp();

const db = getFirestore();
const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY');
const GROQ_API_KEY = defineSecret('GROQ_API_KEY');
const REVENUECAT_SECRET_API_KEY = defineSecret('REVENUECAT_SECRET_API_KEY');
const GROQ_TEXT_MODEL = 'openai/gpt-oss-20b';

// Hosted in Firebase Storage — public read, permanent URL
const NOTIFICATION_IMAGE_URL =
  'https://firebasestorage.googleapis.com/v0/b/daysumm.firebasestorage.app/o/assets%2Fcat-bell.png?alt=media&token=033a8a93-2ef7-4312-b186-4f62f5c0e0a5';

const openRouterModels = [
  'google/gemini-2.5-flash-lite',
  'openai/gpt-5-mini',
  'deepseek/deepseek-v4-flash',
  'google/gemini-3-flash-preview',
  'openai/gpt-5-nano',
];

const messaging = getMessaging();

const DigestSchema = z.object({
  headline: z.string(),
  highlights: z.array(z.string()),
  actionItems: z.array(z.string()),
  decisions: z.array(z.string()),
  blockers: z.array(z.string()),
  statusUpdate: z.string(),
});

const degradedDigest = {
  headline: 'Digest unavailable',
  highlights: [],
  actionItems: [],
  decisions: [],
  blockers: [],
  statusUpdate: "We couldn't generate today's digest. Your entries are saved and you can try again.",
};

function stripMarkdownCodeFences(value: string): string {
  return value
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

async function getDigestFromOpenRouter(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  model: string,
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://daysumm.app',
      'X-Title': 'DaySumm',
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenRouter ${model} failed: ${details}`);
  }

  const result = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  const content = result.choices?.[0]?.message?.content;
  return (
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
          .map((item) => (typeof item === 'string' ? item : item.text ?? ''))
          .join('\n')
        : ''
  ).trim();
}

async function getValidatedDigest(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<z.infer<typeof DigestSchema>> {
  const strictPrompt = `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only, matching this exact schema: ${JSON.stringify({
    headline: 'string',
    highlights: ['string'],
    actionItems: ['string'],
    decisions: ['string'],
    blockers: ['string'],
    statusUpdate: 'string',
  })}`;

  let lastError: unknown;

  for (let index = 0; index < openRouterModels.length; index += 1) {
    const model = openRouterModels[index];

    try {
      const rawText = await getDigestFromOpenRouter(apiKey, systemPrompt, userPrompt, model);
      const cleanedText = stripMarkdownCodeFences(rawText);
      const parsed = JSON.parse(cleanedText);
      const result = DigestSchema.safeParse(parsed);

      if (result.success) {
        return result.data;
      }

      lastError = result.error;
    } catch (error) {
      lastError = error;
    }

    if (index < openRouterModels.length - 1) {
      try {
        const retryText = await getDigestFromOpenRouter(
          apiKey,
          strictPrompt,
          userPrompt,
          openRouterModels[index + 1],
        );
        const cleanedRetryText = stripMarkdownCodeFences(retryText);
        const parsedRetry = JSON.parse(cleanedRetryText);
        const retryResult = DigestSchema.safeParse(parsedRetry);

        if (retryResult.success) {
          return retryResult.data;
        }

        lastError = retryResult.error;
      } catch (error) {
        lastError = error;
      }
    }
  }

  console.warn('Falling back to degraded digest', lastError);
  return degradedDigest;
}

interface BuildDigestOptions {
  allowRegenerate: boolean;
  sendPush: boolean;
  enforceFreeLimit: boolean;
  revenueCatSecretKey?: string;
}

/**
 * Shared core: builds, validates, and stores a digest for a single uid.
 * Used by BOTH the client-facing `generateDigest` callable AND `digestDispatcher`,
 * so the prompt/OpenRouter/Zod logic lives in exactly one place.
 */
async function buildAndStoreDigestForUser(
  uid: string,
  apiKey: string,
  options: BuildDigestOptions = { allowRegenerate: false, sendPush: true, enforceFreeLimit: false },
): Promise<z.infer<typeof DigestSchema>> {
  const settingsSnapshot = await db.collection('userSettings').doc(uid).get();
  const settings = (settingsSnapshot.exists ? settingsSnapshot.data() : undefined) as
    | { role?: string; timezone?: string; fcmToken?: string }
    | undefined;
  const role = settings?.role?.trim() || 'user';
  const timezone = settings?.timezone?.trim() || 'UTC';
  const fcmToken = settings?.fcmToken;

  const dateKey = DateTime.now().setZone(timezone).toFormat('yyyy-LL-dd');
  const dailyUsageRef = db.collection('dailyUsage').doc(`${uid}_${dateKey}`);
  const dailyUsageDoc = await dailyUsageRef.get();

  const existingDigestRecordId = dailyUsageDoc.data()?.digestRecordId as string | undefined;
  const existingPushSent = dailyUsageDoc.data()?.pushSent === true;

  const localNow = DateTime.now().setZone(timezone);
  const startOfDay = localNow.startOf('day').toJSDate();
  const endOfDay = localNow.endOf('day').toJSDate();

  const entriesSnapshot = await db.collection('entries').where('uid', '==', uid).get();

  const entries = entriesSnapshot.docs
    .map((doc) => doc.data())
    .filter((entry) => {
      if ((entry as any).deleted === true) {
        return false;
      }

      const createdAt = (entry as any).createdAt;
      const date =
        createdAt instanceof Date
          ? createdAt
          : typeof createdAt?.toDate === 'function'
            ? createdAt.toDate()
            : new Date(createdAt);

      return date >= startOfDay && date <= endOfDay;
    });

  const highlights: string[] = [];
  const actionItems: string[] = [];
  const blockers: string[] = [];
  const decisions: string[] = [];
  const notes: string[] = [];
  const uncategorized: string[] = [];

  entries.forEach((entry: any) => {
    const text = typeof entry.textEn === 'string' && entry.textEn.trim()
      ? entry.textEn.trim()
      : typeof entry.text === 'string'
        ? entry.text.trim()
        : '';

    if (!text) return;

    const tags = Array.isArray(entry.tags) ? entry.tags : [];

    if (tags.length === 0) {
      uncategorized.push(text);
      return;
    }

    if (tags.includes('highlight')) highlights.push(text);
    if (tags.includes('actionItem')) actionItems.push(text);
    if (tags.includes('blocker')) blockers.push(text);
    if (tags.includes('decision')) decisions.push(text);
    if (tags.includes('note')) notes.push(text);
  });

  let entryText = '';
  if (highlights.length) entryText += `\nCompleted Work & Highlights:\n- ${highlights.join('\n- ')}\n`;
  if (actionItems.length) entryText += `\nPlanned/Future Work:\n- ${actionItems.join('\n- ')}\n`;
  if (blockers.length) entryText += `\nActive Blockers:\n- ${blockers.join('\n- ')}\n`;
  if (decisions.length) entryText += `\nDecisions Made:\n- ${decisions.join('\n- ')}\n`;
  if (notes.length) entryText += `\nContext & Notes:\n- ${notes.join('\n- ')}\n`;
  if (uncategorized.length) entryText += `\nOther Entries:\n- ${uncategorized.join('\n- ')}\n`;

  entryText = entryText.trim();

  const entriesFingerprint = createHash('sha256').update(entryText).digest('hex');

  // If there are no meaningful entries for today, skip AI generation, push,
  // and streak updates. Return a friendly fallback digest so the client can
  // show a helpful message to the user instead of incrementing streaks.
  if (!entryText) {
    console.log(`No entries for uid ${uid} on ${dateKey} — skipping digest generation`);

    const noEntriesDigest: z.infer<typeof DigestSchema> = {
      headline: "No entries for today",
      highlights: [],
      actionItems: [],
      decisions: [],
      blockers: [],
      statusUpdate: "No entries were captured today. Add an entry and tap Generate to create your digest.",
    };

    // Record that we skipped generation due to no entries so the dispatcher
    // won't repeatedly attempt to regenerate/push for this user today.
    await dailyUsageRef.set({ uid, dateKey, status: 'no_entries' }, { merge: true });

    return noEntriesDigest;
  }

  let existingRecordData: (z.infer<typeof DigestSchema> & { entriesFingerprint?: string }) | undefined;
  if (existingDigestRecordId) {
    const snap = await db.collection('digestRecords').doc(existingDigestRecordId).get();
    existingRecordData = snap.exists
      ? (snap.data() as z.infer<typeof DigestSchema> & { entriesFingerprint?: string })
      : undefined;
  }

  const contentUnchanged = Boolean(
    existingRecordData && existingRecordData.entriesFingerprint === entriesFingerprint,
  );

  let digest: z.infer<typeof DigestSchema>;
  let digestRecordId = existingDigestRecordId;
  let didRegenerate = false;

  if (contentUnchanged && existingRecordData) {
    console.log(`Content unchanged for uid ${uid} on ${dateKey} — reusing existing digest, no AI call`);
    digest = existingRecordData;
  } else {
    // Entries changed (or no digest exists yet) — this run needs a fresh generation.
    if (options.enforceFreeLimit) {
      const currentDigestCount = (dailyUsageDoc.data()?.digestCount as number | undefined) ?? 0;

      if (currentDigestCount >= 3) {
        const isPro = await checkIsProEntitled(uid, options.revenueCatSecretKey!);

        if (!isPro) {
          throw new HttpsError(
            'resource-exhausted',
            "You've reached your daily limit of 3 free AI digests today. Upgrade to Pro for unlimited digest generations!",
          );
        }
      }
    }

    // Atomic claim so two near-simultaneous calls can't both trigger an AI call.
    const claimResult = await db.runTransaction(async (transaction) => {
      const freshDoc = await transaction.get(dailyUsageRef);
      if (freshDoc.data()?.status === 'generating') {
        return { claimedByAnother: true as const };
      }
      transaction.set(
        dailyUsageRef,
        { uid, dateKey, status: 'generating', claimedAt: new Date() },
        { merge: true },
      );
      return { claimedByAnother: false as const };
    });

    if (claimResult.claimedByAnother) {
      console.log(`uid ${uid} on ${dateKey} is already being generated by another invocation — skipping`);
      return existingRecordData ?? degradedDigest;
    }

    const systemPrompt = `You are an expert executive assistant. Create a concise, polished daily digest for a user with the role "${role}" in timezone "${timezone}". Use the provided categorized entries to produce a professional summary in this exact structure and style:

      headline: One clear sentence that captures the day
      highlights: 3 short bullet points with the most meaningful completed work, achievements, or important moments
      actionItems: 2-3 short bullet points for planned/future work or concrete next steps
      decisions: 1-3 short bullet points for decisions made or confirmed
      blockers: 0-3 short bullet points for active blockers or anything preventing progress
      statusUpdate: One concise sentence summarizing overall progress

      Rules:
      - The provided entries are already categorized. Use them to populate the corresponding sections.
      - Keep the tone professional, helpful, and concise
      - Prefer clear business-style phrasing
      - If there are no entries, return a calm, professional empty-state summary
      - Return ONLY raw JSON matching the schema below
      - Do not include markdown fences or any preamble
      - The JSON shape must be exactly: {"headline":"string","highlights":["string"],"actionItems":["string"],"decisions":["string"],"blockers":["string"],"statusUpdate":"string"}`;
    const userPrompt = `Today's entries:\n- ${entryText || 'No entries captured yet.'}`;

    try {
      digest = await getValidatedDigest(apiKey, systemPrompt, userPrompt);
    } catch (error) {
      console.warn(`Digest generation failed for uid ${uid}`, error);
      digest = degradedDigest;
    }

    didRegenerate = true;

    const deterministicId = `${uid}_${dateKey}`;
    await db.collection('digestRecords').doc(deterministicId).set({
      uid,
      dateKey,
      generatedAt: new Date(),
      entriesFingerprint,
      ...digest,
    });
    digestRecordId = deterministicId;
  }

  const dailyUsageUpdate: Record<string, unknown> = {
    uid,
    dateKey,
    status: 'complete',
    digestGeneratedAt: new Date(),
    digestRecordId,
  };

  if (options.allowRegenerate && didRegenerate) {
    // Only manual "Generate now" calls that actually triggered a fresh AI
    // generation count toward the free-tier daily cap.
    const currentCount = (dailyUsageDoc.data()?.digestCount as number | undefined) ?? 0;
    dailyUsageUpdate.digestCount = currentCount + 1;
  }

  await dailyUsageRef.set(dailyUsageUpdate, { merge: true });

  try {
    await updateStreakForUser(uid, dateKey, timezone);
  } catch (error) {
    console.warn(`Failed to update streak for uid ${uid}`, error);
  }

  if (!digestRecordId) {
    // Should be unreachable — every code path above either reuses an existing
    // record id or creates a new one — but guard so we never send a push
    // with a malformed data payload, and so TS knows digestRecordId is string below.
    console.warn(`digestRecordId unexpectedly missing for uid ${uid} on ${dateKey} — skipping push`);
    return digest;
  }

  // Push notification: decoupled from regeneration. The automatic dispatcher
  // should notify the user once per day that their digest is ready, whether
  // that digest was freshly generated just now or already existed from an
  // earlier manual "Generate now" call.
  if (options.sendPush && existingPushSent) {
    console.log(`Push already sent today for uid ${uid} — skipping duplicate push`);
  } else if (options.sendPush && fcmToken) {
    try {
      const decisionsCount = digest.decisions.length;
      const actionItemsCount = digest.actionItems.length;

      await messaging.send({
        token: fcmToken,
        notification: {
          title: 'Your daily digest is ready!',
          body: `${decisionsCount} decision${decisionsCount === 1 ? '' : 's'} · ${actionItemsCount} action item${actionItemsCount === 1 ? '' : 's'} — tap to read`,
          imageUrl: NOTIFICATION_IMAGE_URL,
        },
        data: { digestRecordId, dateKey },
        android: {
          priority: 'high',
          notification: {
            channelId: 'daysumm_digest',
            color: '#6C5CE7',
            imageUrl: NOTIFICATION_IMAGE_URL,
            sound: 'default',
            vibrateTimingsMillis: [0, 250, 250, 250],
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });

      await dailyUsageRef.set({ pushSent: true }, { merge: true });
      console.log(`Push sent to uid ${uid} for digest ${digestRecordId}`);
    } catch (pushError) {
      const err = pushError as { code?: string };
      console.warn(`Push send failed for uid ${uid}`, pushError);

      const isDeadToken =
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token';

      if (isDeadToken) {
        console.log(`Clearing dead fcmToken for uid ${uid}`);
        await db.collection('userSettings').doc(uid).set({ fcmToken: null }, { merge: true });
      }
    }
  } else if (options.sendPush && !fcmToken) {
    console.log(`No fcmToken for uid ${uid} — digest stored, push skipped`);
  } else {
    console.log(`Push skipped for uid ${uid} (manual regenerate, sendPush disabled)`);
  }

  return digest;
}

async function updateStreakForUser(uid: string, dateKey: string, timezone: string): Promise<void> {
  const userStatsRef = db.collection('userStats').doc(uid);

  await db.runTransaction(async (transaction) => {
    const userStatsDoc = await transaction.get(userStatsRef);
    const data = userStatsDoc.exists
      ? (userStatsDoc.data() as { currentStreak?: number; longestStreak?: number; lastEntryDate?: string })
      : undefined;

    const lastEntryDate = data?.lastEntryDate;

    if (lastEntryDate === dateKey) {
      // Already counted for this day (e.g. a same-day manual regenerate) — no-op.
      return;
    }

    // Yesterday, computed in THIS USER'S timezone — not server UTC, not device time.
    const yesterday = DateTime.fromFormat(dateKey, 'yyyy-LL-dd', { zone: timezone })
      .minus({ days: 1 })
      .toFormat('yyyy-LL-dd');

    const previousStreak = data?.currentStreak ?? 0;
    const newStreak = lastEntryDate === yesterday ? previousStreak + 1 : 1;
    const longestStreak = Math.max(data?.longestStreak ?? 0, newStreak);

    transaction.set(
      userStatsRef,
      { uid, currentStreak: newStreak, longestStreak, lastEntryDate: dateKey },
      { merge: true },
    );
  });
}

export const generateDigest = onCall(
  { secrets: [OPENROUTER_API_KEY, REVENUECAT_SECRET_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required to generate a digest.');
    }

    const digest = await buildAndStoreDigestForUser(uid, OPENROUTER_API_KEY.value(), {
      allowRegenerate: true,
      sendPush: false,
      enforceFreeLimit: true,
      revenueCatSecretKey: REVENUECAT_SECRET_API_KEY.value(),
    });
    return { digest };
  },
);

/**
 * Scheduled dispatcher: every 10 minutes, finds users whose local time is
 * currently ~4:50 PM and haven't received a digest yet today (in their own
 * local date), then generates + stores a digest for each.
 */
export const digestDispatcher = onSchedule(
  { schedule: 'every 10 minutes', secrets: [OPENROUTER_API_KEY, REVENUECAT_SECRET_API_KEY] },
  async () => {
    const now = new Date().toISOString();
    const userSettingsSnapshot = await db.collection('userSettings').get();

    console.log(`digestDispatcher fired at ${now} — userSettings document count: ${userSettingsSnapshot.size}`);

    const dueUsers: Array<{ uid: string; timezone: string; notificationTime: string }> = [];

    for (const settingsDoc of userSettingsSnapshot.docs) {
      const uid = settingsDoc.id;
      const settings = settingsDoc.data() as { timezone?: string; notificationTime?: string };
      const timezone = settings?.timezone;
      const notificationTime = settings?.notificationTime || '17:00';

      if (!timezone) {
        continue; // not onboarded yet — nothing to match against
      }

      try {
        const localNow = DateTime.now().setZone(timezone);

        if (!localNow.isValid) {
          console.warn(`Invalid timezone "${timezone}" for uid ${uid} — skipping`);
          continue;
        }

        const [hourStr, minStr] = notificationTime.split(':');
        const targetHour = parseInt(hourStr, 10);
        const targetMin = parseInt(minStr, 10);
        const targetMinutesSinceMidnight = targetHour * 60 + targetMin;

        const minutesSinceMidnight = localNow.hour * 60 + localNow.minute;

        // Window triggers 5-15 mins before target time (e.g. 16:45-16:55 for 17:00)
        // This ensures the digest is processed and ready right as the push goes out
        const windowStart = targetMinutesSinceMidnight - 15;
        const windowEnd = targetMinutesSinceMidnight - 5;
        const isDue = minutesSinceMidnight >= windowStart && minutesSinceMidnight <= windowEnd;

        if (!isDue) {
          continue;
        }

        dueUsers.push({ uid, timezone, notificationTime });
      } catch (error) {
        // One user's failure must not stop the batch.
        console.warn(`Failed checking due status for uid ${uid} in digestDispatcher`, error);
      }
    }

    const prioritizedUsers = await Promise.all(
      dueUsers.map(async (dueUser) => ({
        ...dueUser,
        isPro: await checkIsProEntitled(dueUser.uid, REVENUECAT_SECRET_API_KEY.value()),
      })),
    );

    prioritizedUsers.sort((a, b) => Number(b.isPro) - Number(a.isPro));

    for (const dueUser of prioritizedUsers) {
      const { uid, timezone, notificationTime, isPro } = dueUser;

      try {
        console.log(
          `Processing ${isPro ? 'PRO' : 'free/guest'} digest for uid ${uid} (local time ${DateTime.now().setZone(timezone).toFormat('HH:mm')}, zone ${timezone})`,
        );
        await buildAndStoreDigestForUser(uid, OPENROUTER_API_KEY.value());
        console.log(`Digest check complete for uid ${uid}`);
      } catch (error) {
        console.warn(`Failed processing uid ${uid} in digestDispatcher`, error);
      }
    }
  },
);

export const transcribeAudio = onCall(
  { secrets: [GROQ_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required to transcribe audio.');
    }

    const { audioBase64, mimeType } = request.data as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!audioBase64) {
      throw new HttpsError('invalid-argument', 'audioBase64 is required.');
    }

    const audioBuffer = Buffer.from(audioBase64, 'base64');

    const form = new FormData();
    form.append(
      'file',
      new Blob([audioBuffer], { type: mimeType || 'audio/m4a' }),
      'entry.m4a',
    );
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');

    const formTranslation = new FormData();
    formTranslation.append(
      'file',
      new Blob([audioBuffer], { type: mimeType || 'audio/m4a' }),
      'entry.m4a',
    );
    formTranslation.append('model', 'whisper-large-v3-turbo');
    formTranslation.append('response_format', 'json');

    const [transcriptionRes, translationRes] = await Promise.all([
      fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY.value()}`,
        },
        body: form,
      }),
      fetch('https://api.groq.com/openai/v1/audio/translations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY.value()}`,
        },
        body: formTranslation,
      })
    ]);

    if (!transcriptionRes.ok) {
      const details = await transcriptionRes.text();
      throw new HttpsError('internal', `Groq transcription failed: ${details}`);
    }

    if (!translationRes.ok) {
      const details = await translationRes.text();
      console.error(`Groq translation failed: ${details}`);
      // Fallback to transcription text if translation fails to not break the flow completely
      const transcription = (await transcriptionRes.json()) as { text: string };
      return { text: transcription.text, textEn: transcription.text };
    }

    const transcription = (await transcriptionRes.json()) as { text: string };
    const translation = (await translationRes.json()) as { text: string };

    return { text: transcription.text, textEn: translation.text };
  },
);

export const classifyEntries = onCall(
  { secrets: [GROQ_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const { entries } = request.data as {
      entries?: { localId: string; text: string; textEn?: string }[];
    };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return { results: [] };
    }

    const systemPrompt = `You are a strict data classifier. You will receive a JSON array of journal entries.
For each entry, you must return a corresponding classification object in a JSON array.

Rules for each entry:
1. tags: Classify the entry using one or more of these exact strings: ['highlight', 'actionItem', 'blocker', 'decision', 'note'].
   - 'highlight': work already completed or significant achievements.
   - 'actionItem': planned or future work, or concrete next steps.
   - 'blocker': active blockers or things preventing progress.
   - 'decision': decisions made or confirmed.
   - 'note': contextual or informational entries that do NOT describe a completed accomplishment, a planned task, an active blocker, or a decision. Use this for meetings attended, observations, general context, ambient updates, or anything that is useful information but not a concrete action or result. Do NOT force-fit these into 'highlight'.
   - CRITICAL: If a single entry contains multiple clauses describing genuinely independent activities (e.g., one clause describing something already done, and another describing something planned for later), you MUST assign a separate tag to EACH clause, returning an array of multiple tags, rather than only tagging the dominant or first one.
2. textEn: If the input entry does not provide textEn, translate its 'text' to English. If textEn is provided, return it exactly as is.
3. confidence: A score between 0.0 and 1.0 indicating how confident you are in your tags.

Return ONLY a JSON object with a "results" array. Shape:
{
  "results": [
    {
      "localId": "string",
      "tags": ["string"],
      "confidence": number,
      "textEn": "string"
    }
  ]
}`;

    const userPrompt = JSON.stringify(entries);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq classification failed', errorText);
      throw new HttpsError('internal', 'Classification failed.');
    }

    const data = (await response.json()) as any;
    try {
      const parsed = JSON.parse(data.choices[0].message.content);
      // Map and inject classifierVersion=2
      if (parsed && Array.isArray(parsed.results)) {
        parsed.results = parsed.results.map((r: any) => ({
          ...r,
          classifierVersion: 2,
        }));
      }
      return parsed; // { results: [...] }
    } catch (e) {
      console.error('Failed to parse classification', e);
      throw new HttpsError('internal', 'Classification parsing failed.');
    }
  }
);

export const translateText = onCall(
  { secrets: [GROQ_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Authentication is required.');
    }

    const { text } = request.data as { text?: string };

    if (!text || text.trim().length === 0) {
      return { textEn: '' };
    }

    const systemPrompt = `Translate the following text to English. Return ONLY the translation, nothing else. Do not add any introductory or concluding text. If the text is already in English, return it exactly as is.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY.value()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq translation failed', errorText);
      throw new HttpsError('internal', 'Translation failed.');
    }

    const data = (await response.json()) as any;
    try {
      const translation = data.choices[0].message.content.trim();
      return { textEn: translation };
    } catch (e) {
      console.error('Failed to parse translation', e);
      throw new HttpsError('internal', 'Translation parsing failed.');
    }
  }
);


async function checkIsProEntitled(uid: string, secretApiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
      headers: {
        Authorization: `Bearer ${secretApiKey}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`RevenueCat subscriber lookup failed for uid ${uid}: ${response.status}`);
      return false; // fail closed — treat lookup failure as non-pro rather than granting unlimited access
    }

    const data = (await response.json()) as {
      subscriber?: { entitlements?: Record<string, { expires_date?: string | null }> };
    };

    const proEntitlement = data.subscriber?.entitlements?.pro;
    if (!proEntitlement) {
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`Error checking RevenueCat entitlement for uid ${uid}`, error);
    return false; // fail closed
  }
}

export const cleanupGuestAccounts = onSchedule('every 1 hours', async () => {
  const auth = getAuth();
  const db = getFirestore();
  const now = Date.now();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

  let pageToken: string | undefined;

  do {
    const listUsersResult = await auth.listUsers(1000, pageToken);
    pageToken = listUsersResult.pageToken;

    for (const user of listUsersResult.users) {
      const isGuest = user.providerData.length === 0;

      if (isGuest && user.metadata.creationTime) {
        const creationTime = new Date(user.metadata.creationTime).getTime();
        if (now - creationTime > TWENTY_FOUR_HOURS) {
          const uid = user.uid;
          console.log(`Cleaning up expired guest account: ${uid}`);

          // Delete collections by querying uid
          const collectionsToQuery = ['entries', 'digestRecords', 'dailyUsage'];
          for (const collectionName of collectionsToQuery) {
            const snapshot = await db.collection(collectionName).where('uid', '==', uid).get();
            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
            });
            if (!snapshot.empty) {
              await batch.commit();
            }
          }

          // Delete documents where ID is uid
          const collectionsById = ['userSettings', 'userStats'];
          const batch = db.batch();
          for (const collectionName of collectionsById) {
            batch.delete(db.collection(collectionName).doc(uid));
          }
          await batch.commit();

          // Finally, delete the user from Auth
          try {
            await auth.deleteUser(uid);
            console.log(`Successfully deleted guest account ${uid}`);
          } catch (error) {
            console.error(`Failed to delete Auth user ${uid}`, error);
          }
        }
      }
    }
  } while (pageToken);
});
