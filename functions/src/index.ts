import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getMessaging } from 'firebase-admin/messaging';
import { DateTime } from 'luxon';
import { z } from 'zod';
import { createHash } from 'crypto';

initializeApp();

const db = getFirestore();
const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY');
const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

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
}

/**
 * Shared core: builds, validates, and stores a digest for a single uid.
 * Used by BOTH the client-facing `generateDigest` callable AND `digestDispatcher`,
 * so the prompt/OpenRouter/Zod logic lives in exactly one place.
 */
async function buildAndStoreDigestForUser(
  uid: string,
  apiKey: string,
  options: BuildDigestOptions = { allowRegenerate: false, sendPush: true },
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

  let existingDigestRecordId: string | undefined;

  if (!options.allowRegenerate) {
    // Automatic/default path: atomic check-and-claim, never regenerate once done today.
    const claimResult = await db.runTransaction(async (transaction) => {
      const dailyUsageDoc = await transaction.get(dailyUsageRef);
      const recordId = dailyUsageDoc.data()?.digestRecordId as string | undefined;

      if (dailyUsageDoc.exists && recordId) {
        return { alreadyExists: true as const, digestRecordId: recordId };
      }

      if (dailyUsageDoc.exists && dailyUsageDoc.data()?.status === 'generating') {
        // Another concurrent call already claimed this slot moments ago.
        return { alreadyExists: false as const, claimedByAnother: true as const };
      }

      // Claim it now, before doing any expensive work.
      transaction.set(
        dailyUsageRef,
        { uid, dateKey, status: 'generating', claimedAt: new Date() },
        { merge: true },
      );

      return { alreadyExists: false as const, claimedByAnother: false as const };
    });

    if (claimResult.alreadyExists) {
      console.log(`Digest already exists for uid ${uid} on ${dateKey} — returning existing record`);
      const existingRecord = await db.collection('digestRecords').doc(claimResult.digestRecordId).get();
      if (existingRecord.exists) {
        return existingRecord.data() as z.infer<typeof DigestSchema>;
      }
      // Referenced record missing — fall through and regenerate below.
    }

    if (claimResult.claimedByAnother) {
      console.log(`uid ${uid} on ${dateKey} is already being generated by another invocation — skipping`);
      return degradedDigest;
    }
  } else {
    // Manual "Generate now": may regenerate, but only if entries actually changed.
    const dailyUsageDoc = await dailyUsageRef.get();
    existingDigestRecordId = dailyUsageDoc.data()?.digestRecordId as string | undefined;
    console.log(`Manual regenerate requested for uid ${uid} on ${dateKey}`);
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

  const entriesSnapshot = await db.collection('entries').where('uid', '==', uid).get();

  const entries = entriesSnapshot.docs
    .map((doc) => doc.data())
    .filter((entry) => {
      const createdAt = (entry as any).createdAt;
      const date =
        createdAt instanceof Date
          ? createdAt
          : typeof createdAt?.toDate === 'function'
          ? createdAt.toDate()
          : new Date(createdAt);

      return date >= startOfDay && date <= endOfDay;
    });

  const entryText = entries
    .map((entry) => (typeof entry.text === 'string' ? entry.text.trim() : '').trim())
    .filter(Boolean)
    .join('\n- ');

  const entriesFingerprint = createHash('sha256').update(entryText).digest('hex');

  // Manual regenerate: if the entries haven't actually changed since the last
  // generation, skip the AI call entirely and return the existing digest as-is.
  if (options.allowRegenerate && existingDigestRecordId) {
    const existingRecordSnapshot = await db.collection('digestRecords').doc(existingDigestRecordId).get();
    const existingData = existingRecordSnapshot.exists
      ? (existingRecordSnapshot.data() as (z.infer<typeof DigestSchema> & { entriesFingerprint?: string }))
      : undefined;

    if (existingData && existingData.entriesFingerprint === entriesFingerprint) {
      console.log(`No entry changes for uid ${uid} on ${dateKey} — returning existing digest, skipping AI call`);
      return existingData;
    }
  }

  const systemPrompt = `You are an expert executive assistant. Create a concise, polished daily digest for a user with the role "${role}" in timezone "${timezone}". Use the provided entries to produce a professional summary in this exact structure and style:\n\nheadline: One clear sentence that captures the day\nhighlights: 3 short bullet points with the most meaningful achievements, progress, or important moments\nactionItems: 2-3 short bullet points with concrete next steps\ndecisions: 1-3 short bullet points for decisions made or confirmed\nblockers: 0-3 short bullet points for anything that needs attention\nstatusUpdate: One concise sentence summarizing overall progress\n\nRules:\n- Keep the tone professional, helpful, and concise\n- Prefer clear business-style phrasing\n- If there are no entries, return a calm, professional empty-state summary\n- Return ONLY raw JSON matching the schema below\n- Do not include markdown fences or any preamble\n- The JSON shape must be exactly: {"headline":"string","highlights":["string"],"actionItems":["string"],"decisions":["string"],"blockers":["string"],"statusUpdate":"string"}`;
  const userPrompt = `Today's entries:\n- ${entryText || 'No entries captured yet.'}`;

  let digest: z.infer<typeof DigestSchema>;

  try {
    digest = await getValidatedDigest(apiKey, systemPrompt, userPrompt);
  } catch (error) {
    console.warn(`Digest generation failed for uid ${uid}`, error);
    digest = degradedDigest;
  }

  let digestRecordId: string;

  if (existingDigestRecordId) {
    // Overwrite the same document — any existing notification/deep link to it stays valid.
    await db.collection('digestRecords').doc(existingDigestRecordId).set({
      uid,
      dateKey,
      generatedAt: new Date(),
      entriesFingerprint,
      ...digest,
    });
    digestRecordId = existingDigestRecordId;
  } else {
    const newRecordRef = await db.collection('digestRecords').add({
      uid,
      dateKey,
      generatedAt: new Date(),
      entriesFingerprint,
      ...digest,
    });
    digestRecordId = newRecordRef.id;
  }

  await dailyUsageRef.set(
    {
      uid,
      dateKey,
      status: 'complete',
      digestGeneratedAt: new Date(),
      digestRecordId,
    },
    { merge: true },
  );

  try {
    await updateStreakForUser(uid, dateKey, timezone);
  } catch (error) {
    console.warn(`Failed to update streak for uid ${uid}`, error);
  }
  
  if (options.sendPush && fcmToken) {
    try {
      const decisionsCount = digest.decisions.length;
      const actionItemsCount = digest.actionItems.length;

      await messaging.send({
        token: fcmToken,
        notification: {
          title: 'Your digest is ready',
          body: `${decisionsCount} decision${decisionsCount === 1 ? '' : 's'} · ${actionItemsCount} action item${actionItemsCount === 1 ? '' : 's'}`,
        },
        data: { digestRecordId, dateKey },
        android: { priority: 'high' },
      });

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
  } else if (!fcmToken) {
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

export const generateDigest = onCall({ secrets: [OPENROUTER_API_KEY] }, async (request) => {
  const uid = request.auth?.uid;

  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication is required to generate a digest.');
  }

  try {
    const digest = await buildAndStoreDigestForUser(uid, OPENROUTER_API_KEY.value(), {
      allowRegenerate: true,
      sendPush: false,
    });
    return { digest };
  } catch (error) {
    console.warn(`generateDigest callable failed for uid ${uid}`, error);
    return { digest: degradedDigest };
  }
});

/**
 * Scheduled dispatcher: every 10 minutes, finds users whose local time is
 * currently ~4:50 PM and haven't received a digest yet today (in their own
 * local date), then generates + stores a digest for each.
 */
export const digestDispatcher = onSchedule(
  { schedule: 'every 10 minutes', secrets: [OPENROUTER_API_KEY] },
  async () => {
    const now = new Date().toISOString();
    const userSettingsSnapshot = await db.collection('userSettings').get();

    console.log(`digestDispatcher fired at ${now} — userSettings document count: ${userSettingsSnapshot.size}`);

    for (const settingsDoc of userSettingsSnapshot.docs) {
      const uid = settingsDoc.id;
      const settings = settingsDoc.data() as { timezone?: string };
      const timezone = settings?.timezone;

      if (!timezone) {
        continue; // not onboarded yet — nothing to match against
      }

      try {
        const localNow = DateTime.now().setZone(timezone);

        if (!localNow.isValid) {
          console.warn(`Invalid timezone "${timezone}" for uid ${uid} — skipping`);
          continue;
        }

        const minutesSinceMidnight = localNow.hour * 60 + localNow.minute;
        const windowStart = 16 * 60 + 45; // 4:45 PM
        const windowEnd = 16 * 60 + 55; // 4:55 PM
        const isDue = minutesSinceMidnight >= windowStart && minutesSinceMidnight <= windowEnd;

        if (!isDue) {
          continue;
        }

        const dateKey = localNow.toFormat('yyyy-LL-dd');
        const dailyUsageDoc = await db.collection('dailyUsage').doc(`${uid}_${dateKey}`).get();

        if (dailyUsageDoc.exists && dailyUsageDoc.data()?.digestGeneratedAt) {
          console.log(`uid ${uid} already has a digest for ${dateKey} — skipping`);
          continue;
        }

        console.log(`uid ${uid} is due for a digest (local time ${localNow.toFormat('HH:mm')}, zone ${timezone})`);
        await buildAndStoreDigestForUser(uid, OPENROUTER_API_KEY.value());
        console.log(`Digest generated for uid ${uid}`);
      } catch (error) {
        // One user's failure must not stop the batch.
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

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY.value()}`,
      },
      body: form,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new HttpsError('internal', `Groq transcription failed: ${details}`);
    }

    const result = (await response.json()) as { text: string };
    return { text: result.text };
  },
);

export const triggerDigestForUser = onCall(
  { secrets: [OPENROUTER_API_KEY] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
      throw new HttpsError('unauthenticated', 'Sign in required.');
    }

    await buildAndStoreDigestForUser(uid, OPENROUTER_API_KEY.value());
    return { triggered: true };
  },
);