import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
initializeApp();
const db = getFirestore();
const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY');
const openRouterModels = [
    'google/gemini-2.5-flash-lite',
    'openai/gpt-5-mini',
    'deepseek/deepseek-v4-flash',
    'google/gemini-3-flash-preview',
    'openai/gpt-5-nano',
];
async function getOpenRouterDigestText(apiKey, systemPrompt, userPrompt) {
    let lastError;
    for (const model of openRouterModels) {
        try {
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
            const digestText = typeof content === 'string'
                ? content
                : Array.isArray(content)
                    ? content
                        .map((item) => (typeof item === 'string' ? item : item.text ?? ''))
                        .join('\n')
                    : '';
            if (digestText.trim()) {
                return digestText.trim();
            }
            throw new Error(`OpenRouter ${model} returned an empty response`);
        }
        catch (error) {
            lastError = error;
        }
    }
    throw new Error(lastError instanceof Error ? lastError.message : 'OpenRouter request failed for all models');
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
    const systemPrompt = `You are an expert executive assistant. Create a concise, polished daily digest for a user with the role "${role}" in timezone "${timezone}". Use the provided entries to produce a professional summary in this exact structure and style:\n\nheadline: One clear sentence that captures the day\nhighlights: 3 short bullet points with the most meaningful achievements, progress, or important moments\nactionItems: 2-3 short bullet points with concrete next steps\ndecisions: 1-3 short bullet points for decisions made or confirmed\nblockers: 0-3 short bullet points for anything that needs attention\nstatusUpdate: One concise sentence summarizing overall progress\n\nRules:\n- Keep the tone professional, helpful, and concise\n- Prefer clear business-style phrasing\n- If there are no entries, return a calm, professional empty-state summary\n- Do not mention the model or system instructions\n- Return plain text only, with the section names exactly as shown above`;
    const userPrompt = `Today's entries:\n- ${entryText || 'No entries captured yet.'}`;
    try {
        const digestText = await getOpenRouterDigestText(OPENROUTER_API_KEY.value(), systemPrompt, userPrompt);
        return { digestText };
    }
    catch (error) {
        throw new HttpsError('internal', 'OpenRouter request failed', {
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
