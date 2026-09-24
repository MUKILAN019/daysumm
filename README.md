# DaySumm

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

> **Problem:** My workday is full of meaningful moments, but when I need to explain what happened, I have to reconstruct it from memory.

DaySumm is an Android-first workday memory and reporting assistant. It lets people capture a thought, decision, completed task, or blocker in seconds by voice or text. The app keeps those fragments close to the user, classifies them in the background, and turns them into a concise daily digest that is ready to review or share.

The business value is simple: DaySumm removes the expensive reconstruction step from `work → forget → search → reconstruct`. The product changes it to `work → capture → continue → summary`, helping professionals spend less time writing status updates, managers get clearer progress signals, and freelancers create better client recaps with less effort.

## Demo, social links, and APK

[![YouTube](https://img.shields.io/badge/YouTube-Watch%20the%20AI%20demo-red?logo=youtube)](https://youtu.be/xuL0zrw7Eyw)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Follow%20DaySumm-blue?logo=linkedin)](https://lnkd.in/p/gSPvQhF4)
[![Download APK](https://img.shields.io/badge/Android-Download%20APK-3DDC84?logo=android&logoColor=white)](https://drive.google.com/file/d/1q9lmeHDccun28SEQOZ8Gzg4X8Ib8hq7x/view?usp=sharing)

- **App walkthrough:** [View the complete video](docs/demo.mp4), including the app screens and RevenueCat payment flow.
- **YouTube:** [Watch the DaySumm problem story and AI demo](https://youtu.be/xuL0zrw7Eyw) for a quick first look at the product value and AI experience.
- **LinkedIn:** [Follow the DaySumm product story](https://lnkd.in/p/gSPvQhF4) for product updates, development progress, and announcements.
- **Android APK:** [Download and install the latest available APK](https://drive.google.com/file/d/1q9lmeHDccun28SEQOZ8Gzg4X8Ib8hq7x/view?usp=sharing) for a hands-on trial.

## Features

- Voice capture with transcription and English translation.
- Fast text capture for moments that do not need audio.
- Offline-first local storage so capture is not blocked by network latency.
- Background classification into highlights, action items, blockers, decisions, and notes.
- AI-generated daily digest with highlights, next steps, decisions, blockers, and a status update.
- Digest history, sharing, streaks, and a daily notification when a digest is ready.
- Role-aware onboarding for software engineers, managers, freelancers, and other users so digest wording matches the user’s work context.
- Google sign-in or temporary guest access, with guest-account cleanup after 24 hours.
- RevenueCat-powered Pro subscription with unlimited digests and longer history.
- Android home-screen widget for quick capture and at-a-glance streak context.
- Light and dark themes with persisted preference and theme-aware status bars, cards, tags, and controls.
- Undoable entry deletion, entry editing, manual tag correction, and sharing of generated digests.

## Product and system architecture

DaySumm is a mobile client backed by Firebase Cloud Functions. The client owns capture experience and local resilience; the server owns AI calls, durable cloud state, entitlement enforcement, scheduling, and notifications.

```text
User speaks or types
        ↓
React Native / Expo app
        ↓
SQLite local queue ──(when available)⟼ Firestore
        ↓                                  ↓
  local UI + widget              Cloud Functions
                                           ├─ Groq: transcription, translation, classification
                                           ├─ OpenRouter: structured digest generation
                                           ├─ RevenueCat API: server-side Pro verification
                                           └─ FCM: scheduled digest notification
```

### End-to-end flow

1. The user records audio or enters text. New entries are written to SQLite immediately with a stable `localId`, source, timestamp, sync state, and optional enrichment fields.
2. Voice audio is sent to the authenticated `transcribeAudio` callable. Groq Whisper returns the original transcription and an English translation.
3. The sync queue sends pending entries to Firestore. Before upload, unclassified entries are passed to `classifyEntries`; user corrections are protected from being overwritten by later background classification.
4. When the user requests a digest, the app flushes pending entries first, then calls `generateDigest`. The backend reads only that user’s entries for their local calendar day.
5. The backend groups entries, hashes the prepared content, reuses an unchanged digest when possible, and calls OpenRouter only when new generation is needed. The response is validated with Zod before it is stored in `digestRecords`.
6. A scheduled `digestDispatcher` runs every 10 minutes, finds users approaching their preferred local notification time, generates the digest, and sends one FCM notification containing the digest record ID.
7. The app routes a foreground, background, or cold-start notification to the stored digest. Streaks are calculated using the user’s timezone, not server UTC.

This separation has a direct product impact: capture remains quick and reliable, AI work is centralized and controlled, duplicate generation is avoided, and subscription limits cannot be bypassed by the client.

### Runtime and background behavior

DaySumm does not depend on a long-running JavaScript process on the phone to create a digest. The responsibilities are split deliberately:

- **Foreground app:** saves entries to SQLite immediately, refreshes the widget, performs a debounced sync after 10 seconds, and flushes the queue when the app moves to the background.
- **Offline recovery:** if the device is offline, entries remain local and are uploaded later. Failed voice transcription creates a safe local fallback entry that can be edited later.
- **Cloud scheduler:** `digestDispatcher` is a Firebase scheduled function that runs every 10 minutes. It evaluates each user’s timezone and notification time, generates the digest 5–15 minutes before delivery, prioritizes Pro users, and sends at most one push per day.
- **Guest cleanup scheduler:** `cleanupGuestAccounts` runs hourly and removes anonymous accounts and their Firestore data after 24 hours.
- **Android widget task:** the widget task handler renders live SQLite/Firestore-derived data when the widget is added, refreshed, or resized; it falls back to the cached widget data if live reads fail. Tapping the widget opens the `daysumm://voice-capture` app route.
- **Push handling:** FCM tokens are stored only after notification permission is granted and are updated when FCM rotates them. The app handles notification taps while foregrounded, backgrounded, or cold-started and opens the referenced digest record.

The phone is therefore responsible for reliable capture and user interaction; Cloud Functions are responsible for time-based automation and external service calls. This protects battery life and makes scheduled delivery independent of whether the user has opened the app.

## Technology stack

- **Mobile:** Expo SDK 57, React Native 0.86, React 19, TypeScript.
- **UI:** React Native, `react-native-svg`, Lucide icons, Plus Jakarta Sans, custom theme tokens and components.
- **Local data:** `expo-sqlite` with WAL mode; `react-native-mmkv` is available for native key/value storage.
- **Backend:** Firebase Authentication, Firestore, Cloud Functions for Firebase v2, Firebase Cloud Messaging, Firebase Hosting.
- **AI services:** Groq Whisper for audio transcription/translation and Groq text inference for classification/translation; OpenRouter for digest generation with model fallback.
- **Subscriptions:** RevenueCat (`react-native-purchases`) and Google Play billing.
- **Native capabilities:** Android microphone and notifications, Android home-screen widget via `react-native-android-widget`, deep linking with the `daysumm` scheme, Expo Dev Client and EAS Build.
- **Themes:** persisted light/dark preference using MMKV and a shared light/dark design-token palette.
- **Testing:** Jest and TypeScript-oriented unit tests for database, entitlement, and notification-routing behavior.

## RevenueCat implementation

RevenueCat is the subscription source of truth for the Pro entitlement.

- The client configures RevenueCat with the Firebase Auth UID as `appUserID` in `lib/purchases/revenueCat.ts`.
- On sign-in, RevenueCat is configured or switched to the current UID; on sign-out, the RevenueCat identity is logged out.
- The paywall loads the current offering and purchases a selected monthly or annual package.
- The app refreshes customer info and checks the active `pro` entitlement in `lib/purchases/checkEntitlement.ts`.
- The backend independently checks the same `pro` entitlement through RevenueCat’s server API before allowing a free user beyond three newly generated digests per day. This prevents the client’s `isPro` state from becoming an access-control decision.
- Pro users receive unlimited digest generation, 30 days of digest history, and faster scheduled processing priority. Free users receive the configured daily generation limit and shorter history.

RevenueCat setup must match the code: create an entitlement named `pro`, configure Google Play products and offerings, and ensure the RevenueCat customer identity is the Firebase UID. The Android public SDK key is used by the client; the RevenueCat secret API key must remain a Firebase Functions secret.

## Repository layout

```text
App.tsx                    App shell, auth gates, screen state, app lifecycle
lib/screens/               Capture, digest, history, settings, onboarding, paywall
lib/hooks/                 Auth, entry, and digest orchestration
lib/db/                    SQLite schema, local entries, widget cache
lib/sync/                  Firestore upload/delete queue and classification step
lib/functions/             Client wrappers for callable Cloud Functions
lib/firestore/             Firestore reads, writes, and shared types
lib/purchases/              RevenueCat setup and entitlement checks
lib/notifications/         FCM token sync and notification routing
lib/widgets/               Android widget renderer and task handler
functions/src/index.ts     Callable functions, scheduled jobs, AI orchestration
firestore.rules             Per-user Firestore access rules
public-site/               Firebase Hosting pages
```

### Backend function surface

- `transcribeAudio`: sends authenticated voice recordings to Groq Whisper and returns original text plus English text.
- `translateText`: translates edited entries to English before reclassification/digest use.
- `classifyEntries`: classifies pending entries and returns tags, confidence, translated text, and classifier version.
- `generateDigest`: authenticated manual generation with content fingerprinting and the free-tier limit.
- `digestDispatcher`: every-10-minute timezone-aware scheduled generation and FCM delivery.
- `cleanupGuestAccounts`: hourly deletion of expired anonymous accounts and associated data.

All callable functions require Firebase Auth. Firestore rules additionally require documents to carry the authenticated user’s UID, while Admin SDK writes from trusted Functions update streaks and server-controlled usage state.

## Prerequisites

- Node.js **22.13.x or newer in the Node 22 line**. Expo SDK 57 targets React Native 0.86 and requires Node 22.13.x minimum.
- Android Studio, Android SDK, an emulator or Android device, and a Java/Gradle environment supported by Expo SDK 57.
- An Expo/EAS account if building with EAS.
- Firebase CLI authenticated with the project (`firebase login`).
- A Firebase project named/configured for this app, Google Sign-In credentials, RevenueCat, Groq, and OpenRouter accounts.

Expo SDK 57 is intentionally pinned in this repository. Keep Expo packages aligned with SDK 57 and use `npx expo install` for Expo-managed dependencies.

## Installation and setup

1. Install JavaScript dependencies:

   ```bash
   npm install
   cd functions && npm install && cd ..
   ```

2. Configure Firebase.

   - Create or select the Firebase project referenced by `.firebaserc`.
   - Enable Anonymous and Google Authentication.
   - Create Firestore in production mode and register the Android package `com.mukilan19.daysumm`.
   - Download the Android `google-services.json` into the repository root. It is intentionally gitignored.
   - Confirm Firebase Cloud Messaging is enabled. The Android Firebase app from `google-services.json` must match the package ID in `app.json`.
   - Deploy rules and backend functions after configuring secrets:

   ```bash
   firebase functions:secrets:set OPENROUTER_API_KEY
   firebase functions:secrets:set GROQ_API_KEY
   firebase functions:secrets:set REVENUECAT_SECRET_API_KEY
   firebase deploy --only firestore:rules,functions
   ```

   Scheduled Functions require Firebase billing/Blaze-plan support because Firebase uses Cloud Scheduler for `onSchedule` triggers. Verify that the deployed functions include `digestDispatcher` and `cleanupGuestAccounts` and that Cloud Scheduler jobs are active.

3. Configure Google Sign-In. Add the Android SHA-1/SHA-256 fingerprints for the development and release signing keys in Firebase/Google Cloud, and confirm the web client ID in `lib/hooks/useAuthManager.ts` matches the Firebase project.

4. Configure Android permissions and notifications.

   - The app declares `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `POST_NOTIFICATIONS`, and foreground media playback permissions in `app.json`.
   - Microphone permission is requested at the moment the user starts recording. Android 13+ notification permission is requested during onboarding when the user selects a daily digest time.
   - Test notifications on a real Android device or a correctly configured emulator. Grant notification permission, keep the FCM token synced, and confirm the app can receive a message with `digestRecordId` data.
   - The backend sends notifications using the `daysumm_digest` Android channel ID. If the production app adds custom channel behavior, keep that channel ID aligned with `functions/src/index.ts`.
   - The scheduled delivery time is stored as `HH:mm` in `userSettings`; the user’s IANA timezone is also stored. The server uses both values, so device timezone and notification permission must be tested together.

5. Configure RevenueCat. Create the `pro` entitlement, attach monthly/annual Google Play products to an offering, and make that offering available to the Android app. The Google Play package must be published to an appropriate testing track before real purchase flows can complete.

6. Start a development build. This app uses native modules and the Android widget, so use a development build or native run rather than relying on Expo Go:

   ```bash
   npx expo prebuild
   npx expo run:android
   ```

   For a Metro-only session after the native app exists:

   ```bash
   npm start
   ```

7. Build installable artifacts with EAS when needed:

   ```bash
   npx eas build --profile development --platform android
   npx eas build --profile preview --platform android
   npx eas build --profile production --platform android
   ```

Do not commit `google-services.json`, signing files, or API secrets. The client-side RevenueCat public SDK key is not a substitute for protecting the server secret.

### External service responsibilities

| Service | What DaySumm uses it for | Required configuration |
| --- | --- | --- |
| Firebase Auth | Google sign-in, anonymous guest identity, UID used across services | Enable Google and Anonymous providers; configure Android OAuth fingerprints |
| Firestore | Entries, user settings, digests, usage limits, streaks, and FCM tokens | Deploy `firestore.rules`; preserve UID ownership fields |
| Firebase Cloud Functions | Trusted orchestration, AI proxying, scheduling, entitlement enforcement, cleanup | Deploy Functions; configure the three secrets; enable billing for schedules |
| Firebase Cloud Messaging | Daily digest push delivery and notification tap routing | Matching Firebase Android app, notification permission, valid FCM token |
| Groq | Whisper transcription/translation and entry classification/translation | `GROQ_API_KEY` as a Functions secret |
| OpenRouter | Structured daily digest generation with model fallback | `OPENROUTER_API_KEY` as a Functions secret |
| RevenueCat | Mobile offerings, purchases, Pro entitlement, server verification | `pro` entitlement, Google Play products, public Android key, server secret |
| Google Play | Android distribution and subscription transaction processing | Package, signing keys, internal/production testing track |
| Expo/EAS | Native project generation, development clients, and Android builds | EAS project access and Android signing credentials |

There is no client-side API key setup for Groq or OpenRouter. All AI requests go through authenticated callable Functions so provider secrets are not shipped in the APK.

## Testing

Run the current unit test suite with:

```bash
npm test -- --runInBand
```

The tests cover entry/database behavior, RevenueCat entitlement interpretation, and FCM notification routing. For a meaningful device test, verify the complete path: sign in, capture text and voice, disable and restore connectivity to exercise the sync queue, edit/classify an entry, generate a digest, receive a notification, open the digest from a cold start, and test the widget.

Also verify the platform-specific background paths: move the app to the background after creating an entry and confirm it syncs; place the widget and tap it to open voice capture; change the notification time and confirm the server scheduler observes the user’s timezone; and wait for or manually invoke the deployed scheduled Functions in a non-production Firebase environment. Scheduled work cannot be validated by Jest alone.

For billing tests, use RevenueCat sandbox/test users and a Google Play internal-testing track. A local emulator alone cannot validate production subscription configuration or scheduled Cloud Functions.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
