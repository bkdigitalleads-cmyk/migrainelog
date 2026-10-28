# Migraine Log design notes (1.0.0, Oct 28, 2026)

## Concept: a dark room

The person opening this app is often mid-attack: light hurts, sound hurts, reading is hard and the hands are not steady. So the app is a dark room. The screen is a dim charcoal (#1A191C), never pure black, because white text on black glows and smears for people with light sensitivity. Text is a soft warm grey-white (#D6D1C9) at a lower contrast than white, still well above 4.5:1 for body text. There is one warm, low-saturation amber (#B98B5E), and it means one thing only: the live action, the one thing to do now (Attack started, Attack over, Continue, Save). Everything else stays quiet: surfaces are one step lighter than the room, chosen chips and segments get a lighter well and an outline rather than the accent, and the calendar's pain shades are a muted plum that never competes with the amber.

Nothing moves for show. Sheets and modals fade instead of sliding (reduced motion for everyone, not only when iOS asks), the running clock moves once a minute rather than counting seconds, and feedback comes by touch: a heavy tap on Attack started, a success pattern on Attack over, a selection tick on chips and the pain scale.

The light theme exists for people who ask for it: Settings, "Follow the phone's light mode". It is a soft paper grey (#ECE8E2), never bright white, and it never appears while an attack is open. App.tsx and state.tsx set the scheme with Appearance.setColorScheme before the first frame, so system alerts, the keyboard and the date pickers follow it too; the splash and the root view are the room's charcoal, so launch never flashes white.

Renders: `after/` holds the screens at 393x852 @3x, reduced to 160 colors, dark unless the name says light. They come from a throwaway web copy of the app (not in the repo): an in-memory SQLite (sql.js) seeded with three months of attacks, medications and headache-free days, a stubbed store with $4.99 weekly with 3 days free and $29.99 yearly, a fixed clock (Tue Oct 27, 2026, 2:40 pm, 7:40 pm for the evening question) and fixed iPhone safe areas with a drawn status bar. Fonts and layout match the app. The switches are the browser's teal and the date pickers are drawn stand-ins for the iOS compact pickers; haptics, Dynamic Type and VoiceOver are not visible in them.

## The system

- Type: Nunito (SIL OFL, `assets/fonts/OFL-Nunito.txt`), static SemiBold and Regular instances made from the variable Nunito in google/fonts ofl/nunito. SemiBold for titles, buttons and labels; Regular for the big numbers (the clock, the counts), where its round, open figures read calmly; all of its figures are the same width, so counts never jitter. The system font for everything else. Nunito was picked over Literata (too bookish, uneven figures) and Fraunces (too much character for someone in pain).
- Glyphs: `src/ui/Glyph.tsx`, drawn for this app on a 28 grid with soft curves and round ends: the wave (an attack rising and settling: logging), the pill (medications), the calendar, the document (the report), a tally (numbers), a dial (settings), and the small ones (close, check, back, chevron, plus, trash, share, print, pencil, clock, moon, ring, table). No icon pack and no lightning bolt.
- Corners: soft 22 pt on the two big buttons and sheets, 16 pt cards and buttons, 14 pt chips, square full-bleed lists split by hairlines.
- Sizes: the two main buttons fill the width and are 96 pt tall (the brief asks 88 or more), set low on the screen where the thumb rests. Severity targets are 72 pt tall and a third of the width each. Every other target is at least 44 pt. Big text caps at 1.3 to 1.6x for Dynamic Type so nothing clips; body text scales freely.
- Components (`src/ui/`, all new, nothing reused from Image to Text's paper set): Press (the only way something becomes tappable, always with a pressed state), BigAction, Button, IconButton, TextLink, Header, ScreenTitle, Chip and Chips, Segment, Card, Label, Numeral, ProTag, Notice, Section, Line, SwitchLine, PickLine, Sheet, PainScale, MonthGrid and MonthKey, When (the date and time pickers), TabBar, and the drawings (OneTap, MonthAtAGlance, ReportPage, TrialDays).

## Screens

- Home, no attack (`01-home-empty`, `02-home`): the name and Settings, the last three attacks (with "Add details" on the ones that have none), All attacks, and at the bottom the one big amber button, "Attack started", with "Add a past attack" under it. Empty: the wave and "When one starts, tap the button below. That is all. Details can wait until you feel better."
- Home, attack open (`03-home-attack-open`, `04-home-quick-severity`): when it started, the length in big quiet numbers, "so far", Add details, Started by mistake; at the bottom "Attack over" and under it "How bad is it? Optional" with Mild, Moderate, Severe. Tapping the chosen one again clears it.
- Saved (`05-home-saved`): "Saved. Add details when you feel better." with the length and times, Add details and Not over yet.
- Evening (`06-home-evening`): a card, "Headache today?", No and Yes, and an X that puts it away for the day.
- Details (`07-details`, `08-details-medication`, `09-details-past`): blocks with a hairline between them, each a heading and big tap targets; free text only for the dose, your own trigger and the note.
- Calendar (`10-calendar`, `11-calendar-day`): the month grid with the key under it and one line of counts; a tapped day opens a sheet with its attacks, the headache-free switch and "Add an attack on this day".
- Numbers (`12-numbers`, `13-numbers-medication`, `14-numbers-free`): four big counts, how many days have an entry, medication days by type with the calm note set off by a thin line (not a warning color), triggers, work or study. Free users see what it holds and "See my numbers".
- Report (`15-report`, `16-report-preview-free`, `17-report-preview-pro`): what the report is for, the range, an optional name, Preview the report (amber), Share PDF and Print, the CSV. The preview is the printed layout on dimmed paper (#D9D4CC, never white in the dark room), SAMPLE across it for free users.
- Paywalls (`18-paywall-onboarding`, `19-paywall-in-app`): the report drawing as the hero, one headline by why it opened, "Logging is always free.", the plans as radio rows, an amber Continue, and the 3.1.2(c) disclosure with Restore, Terms and Privacy always visible. Onboarding: Weekly first and preselected with "3 days free, then $4.99 a week" and "No payment now", X after 3 seconds. In the app: "Yearly, best value" first and preselected, no trial wording.
- Medications (`20-medications`), All attacks (`21-history`), Settings (`22-settings`): ruled lists. Settings holds Pro, what you mostly track, the evening question, light, your own triggers, the CSV, purchases and help, About (the medical line) and Start over.
- Onboarding (`23` to `29`): three value screens, each one drawing and one outcome (log in two seconds, headache days at a glance, a report your doctor can use), what you mostly track, add your medications, try it free, the reminder.
- Light (`30-home-light`, `31-calendar-light`, `32-settings-light`): the same screens when the person follows a light phone.

## Icon

Three options in `icon-options.png`, each big and at 60 px on a light and a dark wallpaper, drawn by `store/icon.js` (`node icon.js options`; `node icon.js` writes `assets/` and the website images):

1. wave (picked): the app's own glyph, one soft amber swell rising and settling back to a quiet line, over a faint baseline, on the room's charcoal. It reads at 60 px on both wallpapers, says "an attack, logged" without a body part, and uses the app's one accent the way the app does.
2. days: a 3 by 3 block of rounded day cells in the calendar's pain shades, two headache-free rings and one amber cell. Clear at 60 px, but reads as a generic calendar or habit app.
3. dimmer: an amber light half covered by shadow, a lamp turned down. Calm, but at 60 px it reads as a moon, a sleep app.

No lightning bolt, no brain, no head in profile. The splash shows the wave alone on the charcoal.

## The report

`report-sample.pdf` is a 90-day report from made-up data, printed in Chromium from the same HTML the app prints with expo-print (the phone uses WebKit; page breaks may differ slightly). Page 1 is built to be read in 20 seconds: four counts in boxes, a table by month, medication days by type, preventives tried, top triggers. Then the day-by-day calendar (M, H, a ring for headache-free, the worst pain, a dot for medication, + for 4 hours or more) and every attack. Plain black on white: it is a document for a clinic.

## Checklist

- [x] Concept and tokens in `src/theme.ts`; dark by default; light only on request and never during an attack; no white flash (splash, root view, alerts through Appearance).
- [x] One calm display font, bundled, OFL, with even figures.
- [x] Drawn glyph set (wave, pill, calendar, document), own component kit, no Image to Text styling reused.
- [x] The two main buttons full width and 96 pt; severity as three large targets; haptic on Attack started; reduced motion by default.
- [x] VoiceOver labels on every control, calendar days read as sentences, the pain scale is adjustable, live regions on the clock and the notices.
- [x] Dynamic Type: body text scales; display text caps at 1.3 to 1.6x. Designed for, not yet checked on a device.
- [x] Copy voice grep-checked.
- [x] `after/*.png`: Home (empty, recent, attack open, quick severity, saved, evening), details (top, medication, past attack), calendar and day sheet, numbers (Pro, medication, free), report, both previews, both paywalls, medications, all attacks, settings, all seven onboarding steps, and three light screens.
- [x] Icon options drawn; wave picked and written to `assets/` and the website images.
