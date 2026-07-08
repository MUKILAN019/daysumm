import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
initializeApp();
const db = getFirestore();
export const generateDigest = onCall(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new HttpsError('unauthenticated', 'Authentication is required to generate a digest.');
    }
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const entriesSnapshot = await db
        .collection('entries')
        .where('uid', '==', uid)
        .get();
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
    return {
        headline: 'Placeholder digest',
        highlights: [`Captured ${entries.length} entries for today.`],
        actionItems: ['Review the day summary later.'],
        decisions: ['No decisions captured yet.'],
        blockers: [],
        statusUpdate: 'Digest plumbing is working.',
    };
});
