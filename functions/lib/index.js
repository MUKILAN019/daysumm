import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { z } from 'zod';
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
function stripMarkdownCodeFences(value) {
    return value
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();
}
async function getDigestFromOpenRouter(apiKey, systemPrompt, userPrompt, model) {
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
    const result = (await response.json());
    const content = result.choices?.[0]?.message?.content;
    return (typeof content === 'string'
        ? content
        : Array.isArray(content)
            ? content
                .map((item) => (typeof item === 'string' ? item : item.text ?? ''))
                .join('\n')
            : '').trim();
}
async function getValidatedDigest(apiKey, systemPrompt, userPrompt) {
    const strictPrompt = `${systemPrompt}\n\nIMPORTANT: Respond with valid JSON only, matching this exact schema: ${JSON.stringify({
        headline: 'string',
        highlights: ['string'],
        actionItems: ['string'],
        decisions: ['string'],
        blockers: ['string'],
        statusUpdate: 'string',
    })}`;
    let lastError;
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
        }
        catch (error) {
            lastError = error;
        }
        if (index < openRouterModels.length - 1) {
            try {
                const retryText = await getDigestFromOpenRouter(apiKey, strictPrompt, userPrompt, openRouterModels[index + 1]);
                const cleanedRetryText = stripMarkdownCodeFences(retryText);
                const parsedRetry = JSON.parse(cleanedRetryText);
                const retryResult = DigestSchema.safeParse(parsedRetry);
                if (retryResult.success) {
                    return retryResult.data;
                }
                lastError = retryResult.error;
            }
            catch (error) {
                lastError = error;
            }
        }
    }
    return degradedDigest;
}
export const generateDigest = onCall({ secrets: [OPENROUTER_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Authentication is required to generate a digest.');
    }
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const [entriesSnapshot, settingsSnapshot] = await Promise.all([
        db.collection('entries').where('uid', '==', uid).get(),
        db.collection('userSettings').doc(uid).get(),
    ]);
    const entries = entriesSnapshot.docs
        .map((doc) => doc.data())
        .filter((entry) => {
        const createdAt = entry.createdAt;
        const date = createdAt instanceof Date
            ? createdAt
            : typeof createdAt?.toDate === 'function'
                ? createdAt.toDate()
                : new Date(createdAt);
        return date >= startOfDay && date <= endOfDay;
    });
    const settings = (settingsSnapshot.exists ? settingsSnapshot.data() : undefined);
    const role = settings?.role?.trim() || 'user';
    const timezone = settings?.timezone?.trim() || 'UTC';
    const entryText = entries
        .map((entry) => (typeof entry.text === 'string' ? entry.text.trim() : '').trim())
        .filter(Boolean)
        .join('\n- ');
    const systemPrompt = `You are an expert executive assistant. Create a concise, polished daily digest for a user with the role "${role}" in timezone "${timezone}". Use the provided entries to produce a professional summary in this exact structure and style:\n\nheadline: One clear sentence that captures the day\nhighlights: 3 short bullet points with the most meaningful achievements, progress, or important moments\nactionItems: 2-3 short bullet points with concrete next steps\ndecisions: 1-3 short bullet points for decisions made or confirmed\nblockers: 0-3 short bullet points for anything that needs attention\nstatusUpdate: One concise sentence summarizing overall progress\n\nRules:\n- Keep the tone professional, helpful, and concise\n- Prefer clear business-style phrasing\n- If there are no entries, return a calm, professional empty-state summary\n- Return ONLY raw JSON matching the schema below\n- Do not include markdown fences or any preamble\n- The JSON shape must be exactly: {"headline":"string","highlights":["string"],"actionItems":["string"],"decisions":["string"],"blockers":["string"],"statusUpdate":"string"}`;
    const userPrompt = `Today's entries:\n- ${entryText || 'No entries captured yet.'}`;
    try {
        const digest = await getValidatedDigest(OPENROUTER_API_KEY.value(), systemPrompt, userPrompt);
        return { digest };
    }
    catch (error) {
        return {
            digest: degradedDigest,
        };
    }
});
export const transcribeAudio = onCall({ secrets: [GROQ_API_KEY] }, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Authentication is required to transcribe audio.');
    }
    const { audioBase64, mimeType } = request.data;
    if (!audioBase64) {
        throw new HttpsError('invalid-argument', 'audioBase64 is required.');
    }
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const form = new FormData();
    form.append('file', new Blob([audioBuffer], { type: mimeType || 'audio/m4a' }), 'entry.m4a');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    // No `language` field — lets Whisper auto-detect, which is what gives you multilingual support
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
    const result = (await response.json());
    return { text: result.text };
});
