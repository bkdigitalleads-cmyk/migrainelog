@AGENTS.md

# Migraine Log (migrainelog)

App #12 in Brian's iOS app portfolio (seller bkdigitalleads-cmyk). Expo SDK 57, React Native, TypeScript, expo-sqlite, RevenueCat, expo-notifications (local only, one trial reminder), expo-quick-actions (one home-screen quick action), expo-print for the report PDF. Engine forked from Image to Text (main at 9714918, Oct 28, 2026), which came from Pumping and Odo 1.0.6. The Vision OCR module was dropped; there are no local native modules.

- App Store name: "Migraine Tracker for Headaches". Subtitle "Pain, Symptom & Medication Log". Home screen name and in-app name: "Migraine Log". Category Medical, secondary Health & Fitness. ASC app id 6827962061 (https://apps.apple.com/app/id6827962061). Bundle ID: com.bwk.migrainelog. Expo slug and scheme: migrainelog. GitHub: bkdigitalleads-cmyk/migrainelog.
- Set up (Oct 28, 2026): App Store app ID in eas.json `ascAppId`, Expo projectId in app.json `extra.eas.projectId` (project bkdeveloper123/migrainelog), RevenueCat public iOS key in app.json `extra.revenueCatApiKeyIos` (public SDK key, starts with `appl_`, so purchases are on). The app runs with purchases off whenever that key does not start with `appl_`.
- Not in the store yet. Version 1.0.0: build 1 went to TestFlight from PR #1 (merged); build 2 (TestFlight fixes) was committed to main.
- What it is: a headache and migraine diary for someone in pain. One tap logs an attack with the time; details come later; headache-free days are logged too; a calendar, monthly numbers and a doctor and insurance report (PDF) count headache days, migraine days, attacks of 4 hours or more, medication days by type and the preventives tried. No account, no network, nothing leaves the phone.
- Medical line, everywhere it appears (Settings About, the website, the App Review note): a personal log that does not diagnose, treat, or give medical or dosing advice, does not predict attacks; talk to your doctor. Never add dose suggestions, dosing math, predictions, weather or any network feature without Brian asking.
- No brand word anywhere (app, store text, keywords, website), and no drug trademarks in store text or keywords. Generic medication names the person types are theirs.

## How shipping works (read before every push)

- A push to `main` that touches app.json, eas.json, package*.json, App.tsx, index.ts, src/, assets/ or modules/ starts an EAS workflow (.eas/workflows/deploy.yml) once the Expo project is connected. It builds iOS in the cloud and uploads the build to App Store Connect / TestFlight. Every such push costs a paid build credit. (modules/ stays in the filter from the engine; this app has none.)
- Never merge to `main` without Brian. Work on a branch and open a PR.
- Pushes that only change Markdown files (CLAUDE.md, NOTES.md, README.md, store/metadata.md), store/icon.js or docs/ do not build.
- Version numbers are local (`appVersionSource: local`, no auto-increment). Before any push that builds: raise `ios.buildNumber` in app.json by 1, and raise `version` (for example 1.0.0 to 1.0.1) when it will become a new App Store release. A build number that was already used makes the upload fail.
- Before every commit: run `npx tsc --noEmit` and `npm test`, and fix every error.
- Batch the changes for one app into one push. Ask Brian before any push that builds, and say what is in it.
- Submitting for App Review, release dates, prices, the subtitle, keywords, the age rating and screenshots all happen in App Store Connect. Brian and his Cowork session handle that side. Do not try to do it from here.

## Rules

- Brian handles every credential and sign-in. Never type, paste, print or store passwords, tokens or API keys. If git push asks for credentials, stop and tell Brian. The RevenueCat public key, the Expo projectId and the ASC app id are filled in by Brian or Cowork.
- No spending (paid services, extra builds beyond what Brian approved) without Brian saying go.
- Never change the RevenueCat entitlement id `pro`, the product ids (migraine_pro_weekly, migraine_pro_yearly), the offering packages ($rc_weekly, $rc_annual) or the logic in src/purchases.ts (a copy of the engine's) without Brian asking. Paying users must never lose Pro.
- Logging, editing, headache-free days, the current month's calendar and the last 30 days of attacks are free forever. Never put logging behind the paywall (src/gates.ts holds the rules, with checks).
- After launch the SQLite schema must stay backward compatible: never drop or rename columns or tables. New columns go in through a new step in `migrate()` in src/db.ts (guarded by PRAGMA user_version), so they run on existing installs. Settings live as key/value rows; a new setting just gets a default in `parseSettings`. Logged doses keep their own copy of the medication's name and kind, so deleting a medication never changes history.
- Do not change the app name, subtitle, keywords or the rating-prompt triggers (first attack closed with details, first report preview, later-day launch; never while an attack is open) without asking.
- Keep changes small. Fix what the task needs and tidy only the files you already touch. List anything else you notice in NOTES.md under "Noticed, not changed" instead of fixing it. No broad refactors, dependency upgrades or Expo SDK upgrades unless Brian asks.
- Copy voice: plain, short and kind. No "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's", exclamation marks or em dashes in any user-facing text (app, PDFs, notifications, store text, website), and none in text Brian sends to other people.
- Design, "a dark room" (docs/design/NOTES.md): dark by default; the light theme only when the person turns on "Follow the phone's light mode", and never while an attack is open (src/rules.ts `schemeFor`, applied through Appearance so alerts and sheets match). The amber is for the live action only. Reduced motion for everyone (fades, no slides). The two main buttons fill the width and are at least 96 points tall. Use the theme's tokens, never ad hoc values: three type sizes (`type.display` 30, `type.heading`/`type.body` 17, `type.small` 13; no screen shows more than three, the open-attack clock is the one exception), the spacing scale (`space`: 4, 8, 12, 16, 24, 32), two corners (`radius.large` for cards, sheets and the main buttons, `radius.small` for chips, segments, inputs and plain buttons), and the second surface tone with the 1 px `edge` on cards, grouped rows and sheets. No drawings of objects on onboarding, the report screen or the paywalls.
- The medication-day note says only the count and "Doctors watch this number. Consider sharing this report at your next visit." No diagnosis, no advice to stop or change anything.
- plugins/withoutPushEntitlement.js stays last in app.json plugins. After touching plugins, check `npx expo config --type introspect` still shows `ios.entitlements` as `{}`, no camera, photo, location or microphone usage strings, and no `UIApplicationShortcutItems` (the one quick action is set at runtime in App.tsx; a static item would show twice).
- Health data never leaves the device. Never add analytics, a server, sync or a network call.

## Logging (so Brian's Cowork session can follow along)

- With every commit, add an entry at the top of NOTES.md in the same commit: date, version/build, what changed and why, and how it was checked.

## Testing

- Type check: `npx tsc --noEmit`. Unit checks (days and daylight saving, attack length, headache and migraine days on the rolling window and by month, attacks across midnight, 4-hour days, medication days by type and the watch notes, headache-free days, preventive course lengths, free versus Pro, the report model, HTML and CSV, theme and evening rules, rating guard, trial and plan rules): `npm test`. Bundle check: `npx expo export --platform ios`. Config: `npx expo config --type introspect`.
- Pure logic lives in src/days.ts, src/insights.ts, src/gates.ts, src/rules.ts, src/report.ts, src/labels.ts and src/offer.ts, with no React or native imports (they import each other with a `.ts` extension so Node runs them directly), so `npm test` checks exactly what the app runs.
- Simulator (needs Xcode): `npx expo start --ios`. Purchases do not complete in the simulator.
- Real-device check: TestFlight build from the EAS workflow, on Brian's iPhone. Haptics, the quick action, Dynamic Type at the largest sizes, VoiceOver, the native date pickers, the printed PDF (WebKit) and the theme override can only be judged there. NOTES.md has the TestFlight checklist.
