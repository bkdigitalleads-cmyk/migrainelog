# Migraine Log, App Store metadata (1.0.0)

Everything here is pasted into App Store Connect by Brian and Cowork. No em dashes anywhere, no brand words, no drug trademarks, no "Unlock", "Premium", "Seamless", "Effortless", "Welcome", "Let's" or exclamation marks.

App record: bundle id com.bwk.migrainelog, Expo project bkdeveloper123/migrainelog. ASC app id, Expo projectId and the RevenueCat public key are still placeholders (eas.json `ascAppId`, app.json `extra.eas.projectId` and `extra.revenueCatApiKeyIos`, all starting `TODO_COWORK_`); Cowork fills them before the first build.

## Name (30/30)
Migraine Log: Headache Tracker

("Migraine & Headache Tracker" and "Migraine Tracker: Headache Log" are taken.) Home screen name (app.json `name`): Migraine Log

## Subtitle (29/30)
Symptom Diary & Doctor Report

## Keywords (96/100)
migraines,headaches,pain,aura,trigger,medication,calendar,attack,relief,neurologist,journal,days

Rule: no word from the name or subtitle (migraine, log, headache, tracker, symptom, diary, doctor, report), no brand and no drug trademark. "migraines" and "headaches" are the plurals of name words; Apple says it matches plurals on its own, so they could be swapped for two new words later ("cluster" and "tension" are candidates) if Brian wants to test that in 1.0.1.

Research behind them (Oct 27 to 28): "migraine tracker" (Apple popularity 32), "headache tracker" (30), "symptom tracker" (34). Two strong incumbents; ranks 3 to 12 have 0 to 259 ratings.

## Promotional text (157/170)
Tap once when an attack starts. Add details later. See headache days, migraine days and medication days, and bring your doctor a report. Nothing is uploaded.

## Description
Log a migraine or headache in two seconds, see your headache days and medication days at a glance, and bring your doctor a report they can use. Migraine Log works offline, and nothing you log leaves your iPhone.

ONE TAP WHEN IT STARTS
• One huge button, low on the screen where your thumb is: Attack started saves the time
• Mild, Moderate or Severe as three big optional targets, no typing
• Attack over works out the length
• Touch and hold the app icon to start one from the home screen
• Dark by default, low contrast and big type, for when light hurts

DETAILS WHEN YOU FEEL BETTER
• Pain from 0 to 10, where it hurts, aura, symptoms and triggers, all tap first
• The medication you took from your own list, with the time, the dose as you write it, and how much it helped
• Whether it stopped you working or studying, and a note
• Add or change any past attack, including ones you remember later

COUNTS THAT ARE HONEST
• Mark headache-free days in one tap, or answer "Headache today?" in the evening
• A calendar shaded by the worst pain each day, with headache-free days and medication days marked
• Headache days, migraine days, days with attacks of 4 hours or more and average length, on the last 30 days or by month
• Days with acute medication by type, with a calm note when a count reaches the levels doctors watch

A REPORT FOR YOUR DOCTOR AND INSURER
• Last 30, 90 or 180 days
• Page 1: headache days and migraine days per month, attacks of 4 hours or more, medication days by type, preventives tried with start and stop dates and why they stopped, top triggers
• Then a day-by-day calendar and every attack
• Share as a PDF or print it; export every attack as a CSV

PRIVATE BY DESIGN
• Everything stays on your iPhone
• No account, no sign-in, no ads, no tracking
• Works in airplane mode

NOT MEDICAL ADVICE
Migraine Log is a personal log. It does not diagnose, treat, or give medical or dosing advice, and it does not predict attacks. Talk to your doctor about your headaches and your medications.

MIGRAINE LOG PRO
Free, always: logging and editing attacks, headache-free days, this month's calendar and the last 30 days of attacks. Pro adds the monthly numbers and medication-day counter, the doctor report to share and print, your whole history and the CSV export. Choose weekly (with a free trial for new subscribers) or yearly.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/migrainelog/privacy.html

## What's New (1.0.0)
First version. Log an attack in one tap, add details later, mark headache-free days, and make a report for your doctor, all on your iPhone.

## Category
Primary: Medical. Secondary: Health & Fitness.

## Age rating (answer the medical questions honestly)
Every content question is None, except:
- Medical or treatment information: the app lists medication types (triptan, opioid and so on) and shows one neutral note when a person's own medication-day count reaches the level doctors watch. That is mild, infrequent medical information. Answering "Infrequent/Mild" is the honest answer, and App Store Connect then computes a rating above 4+ (12+ in the old scheme, 13+ in the current one, as far as we know; ASC shows the result before saving).
- Health or wellness topics (the newer questionnaire): Yes. On its own it does not raise the rating.
- No user-generated content shared with others, no web access, no gambling, no contests.

If Brian wants 4+, the case for answering "None" is that every medical word in the app is the person's own entry or a label for it and the app gives no advice. We recommend the honest answer above and accepting 12+/13+; ask Brian before choosing.

## App Privacy (nutrition label)
Data Not Collected. Everything the person logs stays in the app's storage on the device and is never uploaded; there is no account and no analytics. RevenueCat validates purchases with an anonymous app user id and purchase history; answer the purchase questions the same way as for Image to Text, Pumping and Odo.

## Pricing and RevenueCat
- Subscription group "Migraine Log Pro".
- `migraine_pro_weekly`: auto-renewing weekly, $4.99/week, 3-day free trial (introductory offer). RevenueCat package `$rc_weekly`. Preselected and listed first on the onboarding paywall.
- `migraine_pro_yearly`: auto-renewing yearly, $29.99/year, no trial. RevenueCat package `$rc_annual`. Preselected and listed first on the in-app paywall as "Yearly, best value".
- No lifetime product.
- RevenueCat: entitlement `pro`, offering `default` with the two packages above. Public iOS key in app.json `extra.revenueCatApiKeyIos` (placeholder now; the app runs with purchases off until it starts with `appl_`).
- Prices and trial text in the app always come from StoreKit.

## App Review note (paste into ASC, Notes)
Migraine Log is a personal headache and migraine diary. It does not diagnose, treat, or give medical or dosing advice, and it does not predict attacks; the app's About section and the website say so and tell the user to talk to their doctor. It has no account or sign-in, no network features, and nothing the user logs is sent anywhere.

Free use, always: logging an attack (tap Attack started, then Attack over), editing it, adding details and past attacks, marking headache-free days, this month's calendar and the last 30 days of attacks. Logging is never behind the paywall.

Pro adds the monthly numbers and medication-day counter, the doctor report as a PDF to share or print (free users can open a preview marked SAMPLE that cannot be shared or printed), history older than 30 days, earlier months in the calendar, and a CSV export.

On first launch: three short intro screens, a question about what the user mostly tracks (it changes words only), an optional screen to add medications (Skip is fine). If the Apple ID can still get the free trial, two screens explain the trial and the reminder; the reminder screen can ask for notification permission, used only for one local reminder the day before a free trial ends. Then the paywall opens. The close button (X, top right) appears after 3 seconds. Tap it to use the app for free.

To test: tap Attack started, tap Moderate, tap Attack over, then Add details. Open Calendar and tap a day to mark it headache-free. Open Report and tap Preview the report.

## Screenshot plan (iPhone 6.9" and 6.5", 6 shots; Brian captures from a TestFlight build)
1. One-tap attack button: Home with the month summary and the big Attack started button in the middle: "Log an attack in two seconds"
2. Calendar: October shaded by pain, headache-free rings, medication dots: "See your headache days at a glance"
3. Monthly numbers: headache days, migraine days, 4-hour days and the triptan day count: "The numbers your doctor asks for"
4. Doctor report: the report preview (Pro, no SAMPLE): "A one-page report for your doctor and insurer"
5. Details later: the details screen with pain, symptoms and medication: "Add details when you feel better"
6. Private and offline: Home with an attack open in the dark theme, airplane mode in the status bar: "Private. Offline. Nothing leaves your phone"

Renders of every screen are in docs/design/after for reference; the store shots come from a real device.
