# Antariksha

**Crew health & wellbeing platform for simulated and research-oriented space missions.**

Astronauts get a simple, plain-language app: a one-minute daily check-in, "My body" readings (heart rate, oxygen, sweat, temperature, breathing, blood pressure) compared with *their own* usual, sleep / water / exercise / mood logs, and one tap to ask the doctor for help. Flight surgeons, commanders, researchers and administrators get their own role-scoped tools behind the scenes.

> Antariksha is research & simulation software. It is **not a medical device**, **not flight-certified**, **not an emergency service**, and **not affiliated with or endorsed by NASA**. NASA public data is research data, not a live feed of astronaut health.

---

## Quick start (no accounts needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and pick a role under **Explore the demo**. With no Firebase configured, the app uses a local data file (`.data/antariksha-local.json`) that is seeded automatically with clearly-labelled synthetic data (fictional crew, 35 days of records, alerts, mission events, habitat readings). You can also register a new account (local mode) — use invitation code `DEMO-CREW` to join the demo mission.

| Demo role | Person (fictional) | Lands on |
|---|---|---|
| Crew member | Anaya Rao "Vega" | `/app/crew/dashboard` |
| Flight surgeon | Dr. Priya Natarajan | `/app/medical/dashboard` |
| Mission commander | Elena Kovac "Polaris" | `/app/mission/dashboard` |
| Researcher | Dr. Samuel Achebe | `/app/research` |
| Administrator | Platform Admin | `/app/admin/users` |

Demo quirks you can see: Orion has a heart-rate rise and a headache report under review, Lyra has three short nights, Altair stopped checking in, Rigel reports sustained stress, and an overnight task conflicts with Lyra's sleep window in the planner.

To regenerate demo data with today's dates: **Admin → Settings → Regenerate demo data**, or `npm run seed:reset`.

## What's in the app

**Crew (astronaut) — kept deliberately simple**
- Home: greeting, today's check-in card, "My wellbeing" (sleep, water, exercise vs usual), heart-rate chart, one-tap mood, "Up next", "Need medical support?".
- Check-in, My body, Sleep, Water & food, Exercise, Mood (+ private journal, breathing exercise), Focus check (reaction / attention / memory games), Get help (symptom report + status tracking), Medicines (adherence), Plan & messages (care-plan tasks, consultations, care-team messages), History, Self-care tips.
- No research, datasets or model jargon is shown to crew.

**Medical** — dashboard, assigned crew, crew detail (trends, personal-baseline drift, sensor-state indicator, symptoms with append-only status updates, medication plans, care plans, append-only clinical notes), explainable alert centre (acknowledge / assign / escalate / resolve, audited), care plans, consultations & messages (communication-delay states), mission context timeline with habitat environment overlay, audit log, printable handover summary.

**Commander** — privacy-preserving readiness (check-in done?, "medical review in progress" without details, schedule conflicts), aggregates hidden below the privacy group size, mission timeline, workload & recovery planner.

**Research (staff only)** — NASA OSDR explorer (search, filters, pagination, study metadata, file listings linking to osdr.nasa.gov, provenance on every result, fixture fallback), GEODE mission/experiment counts, APOD card, de-identified aggregates, model evaluation, methodology.

**Admin** — users (role, mission, suspend — all audited; admins cannot change their own role), invitation codes, missions, permission matrix, settings (illustrative thresholds, privacy group size, simulated comm delay, feature flags, demo seeding).

**Shared** — notifications, profile & preferences (units, timezone, theme, hydration target, reminders), help & safety, crew knowledge capture (medical approves before publishing), global search (Ctrl+K), Antariksha Guide assistant (local and deterministic by default), offline queue with visible "Queued — not sent" state, PWA shell.

## Research-backed features (gaps with no existing crew tool found)

Each feature targets a documented long-duration-mission problem. Before building, we searched for existing tools; where something similar already existed (circadian lighting apps, the TEAMSTaR team-dynamics dashboard, a vendor's ISS medicine-expiry forecaster) we did **not** build it.

| Feature | Problem it addresses | Where |
|---|---|---|
| **Ask the Doctor** — delay-aware question queue | Mars one-way delays of ~3–24 min make live calls impossible; NASA calls store-and-forward "underutilized" and no crew-facing question-queue app was found. Crew attach only the data summaries they choose; a live tracker shows *waiting for link → travelling → with your doctor → reply on its way → answered*, with honest countdowns. Doctors can't read a question before it physically arrives. | Crew: Ask the doctor · Medical: Crew questions · Admin: link window setting |
| **Menu Fatigue Radar** | Food is a NASA "red risk"; menu fatigue onset varies widely between people, and crews stop eating disliked items. No detection/rotation tool found. Three-tap meal ratings; detects items the person is tiring of (vs their *own* earlier ratings), appetite dips week-over-week, and suggests favourites not eaten lately or untried pantry items. | Crew: Water & food · Medical: crew detail |
| **Exercise Balance** | Bone and muscle loss continue despite ~10 h/week of exercise. No crew-side "countermeasure debt" tracker found. Rings show the last 7 days vs weekly targets set by the medical team, and free schedule slots (from the mission timeline) to catch up. | Crew: Exercise & home · Medical: crew detail (targets) |
| **Skill Keeper** | Non-physician crew medical officers' skills decay; NASA recommends refreshers but no spaced-repetition tool for them was found. Medical team writes short practice cards; crew get a 2-minute flashcard session; freshness decays with a configurable half-life and lengthens with spaced practice. | Crew: Skill practice · Medical: Skill Keeper grid · Commander: skill readiness |

The crew home shows a short **"Today for you"** list (new answers, skills to refresh, exercise to catch up, meal to rate). Decay rates, targets and thresholds are configurable placeholders, not validated clinical values.

Sources: NASA HRP gap & risk material; npj Microgravity 2024 (ISS formulary expiration); NASA store-and-forward telemedicine notes; NASA/Frontiers 2025 ISS food-acceptability work; npj Microgravity & BJSM work on bone loss with ARED; NASA skill-retention literature reviews.

## Sensors & the trained model

Monitored signals: heart rate, oxygen (SpO₂), sweat level (electrodermal activity), core and skin temperature, breathing rate, blood pressure and heart-rate variability. Each reading stores value, unit, time, source (manual / device / imported / simulated), device and quality.

An **experimental physiological-state model** is trained from the open **PhysioNet "Non-EEG Dataset for Assessment of Neurological Status"** (Birjandtalab et al., ODC-By 1.0; 20 healthy volunteers; wrist HR, SpO₂, EDA, skin temperature, motion) by `ml/train-physio-state.ts` — a dependency-free multinomial logistic regression on 30 s windows, with every feature relative to the person's own relaxed baseline.

- Leave-one-subject-out evaluation: **68% accuracy, 66% balanced accuracy** across 4 states (chance 25%). Physical exertion is recognised best; cognitive and emotional states are often confused.
- Crew see only a plain label ("Calm / Active / Focused / Tense", "an automatic estimate — not a medical check"). Staff see probabilities, factors, and the full evaluation.
- It is **not validated for astronauts or microgravity**, never diagnostic, and never used for fitness-for-duty decisions.

Retrain: download the dataset (3.7 MB) from https://physionet.org/content/noneeg/1.0.0/ and unzip into `ml/data/noneeg/`, then `npm run ml:train`. See `ml/README.md`.

## Architecture

```
src/
  app/                    Next.js 16 App Router (public pages, /app/* role sections, /api/* route handlers)
  proxy.ts                optimistic auth redirect (authoritative checks are server-side)
  lib/
    firebase/             client.ts (web SDK, optional App Check), admin.ts (server-only Admin SDK), config.ts
    auth/                 signed session cookie (jose), current user, local password (scrypt), rate limiting, onboarding
    permissions/          pure, unit-tested authorisation rules (mirrored in firestore.rules)
    validation/           Zod schemas used by forms and re-checked on the server
    data/                 DocStore interface → FirestoreStore | LocalStore; typed repositories; synthetic seed
    health/               personal baseline & drift, readiness factors, chart series, vital metadata
    alerts/               versioned rules engine + idempotent alert service
    ml/                   trained model JSON + inference with per-feature contributions
    mission/              privacy-thresholded commander summaries, overlay, workload planner rules
    nasa/                 OSDR + APOD server-side clients (cache, timeouts, fixture fallback)
    offline/              client offline queue (non-emergency kinds only)
    actions/              server actions (each re-authenticates, re-authorises, validates, audits)
    guide/                Antariksha Guide: local responder + optional provider interface
  components/             UI kit (cards, pills, pastel tiles), shell, charts, crew/medical/mission components
ml/                       training script (dataset is git-ignored)
tests/                    unit, integration, e2e (Playwright), Firestore rules
firestore.rules, storage.rules, firebase.json
```

All data access is server-side. The browser never talks to Firestore directly; the security rules are defence in depth.

### Firestore schema

`users/{uid}` (role, status, missionId — server-set only) with subcollections `checkIns, vitals, wearableSessions, sleepLogs, hydrationLogs, mealLogs, activityLogs, moodLogs, journal, cognitiveTests, symptomReports, medications, medicationLogs, clinicalNotes, notifications`; `missions/{id}` with `crew, alerts, carePlans, missionEvents, environmentReadings, messages, consultations, auditLogs`; plus `lessons, invites, config/platform, platformAudit` and (local mode only) `authCredentials`.

## Environment variables

Copy `.env.example` to `.env.local` (never commit it).

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web config (public identifiers) |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | Optional App Check (reCAPTCHA v3) |
| `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Admin SDK service account (**secret**, server only) |
| `SESSION_SECRET` | ≥ 32 random chars for signing session cookies (**required in production**) |
| `DEMO_MODE` | `true` to allow demo role entry in production; unset = on in dev, off in prod |
| `NASA_API_KEY` | api.nasa.gov key (falls back to `DEMO_KEY` for low-volume local use) |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | Optional Guide provider (`anthropic` or `openai-compatible`); also needs Admin → Settings toggle |

## Firebase setup

1. Create a Firebase project. Add a **Web app** and copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables.
2. **Authentication → Sign-in method**: enable *Email/Password* and (optionally) *Google*. Add your domain to *Authorized domains*.
3. **Firestore**: create a database in production mode.
4. **Storage** (for symptom attachments): enable the default bucket.
5. **Service account**: Project settings → Service accounts → *Generate new private key*. Put `client_email` in `FIREBASE_CLIENT_EMAIL` and `private_key` in `FIREBASE_PRIVATE_KEY` (keep the `\n` sequences; wrap in quotes). Delete the downloaded JSON or store it outside the repo.
6. Deploy rules:
   ```bash
   npx firebase-tools login
   npx firebase-tools use <project-id>
   npx firebase-tools deploy --only firestore:rules,storage
   ```
7. **App Check** (recommended): register the web app with reCAPTCHA v3, set `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`, then enforce App Check for Firestore/Storage in the console once traffic is verified.
8. Seed demo data (optional, never into a project with real data): `DEMO_MODE=true npm run seed`, or sign in as an admin and use **Admin → Settings → Seed demo data**.
9. Create your first real admin: register normally, then in the Firestore console set `users/{uid}.role = "admin"` (one-time bootstrap). After that, grant roles from **Admin → Users** or with invitation codes.

When Firebase variables are present the app automatically switches from the local store to Firestore and from local passwords to Firebase Authentication (including password-reset emails and Google sign-in).

## Commands

```bash
npm run dev          # development server
npm run build        # production build
npm start            # serve the build
npm run lint         # ESLint
npm run typecheck    # TypeScript (strict)
npm test             # unit + integration tests (Vitest)
npm run test:e2e     # Playwright e2e (build first). Uses installed Chrome with PW_CHANNEL=chrome
npm run test:rules   # Firestore rules tests (needs firebase-tools + Java 11+)
npm run seed         # seed synthetic demo data
npm run seed:reset   # wipe the LOCAL store and re-seed
npm run ml:train     # retrain the physiological-state model
```

## Deploying to Vercel

1. Push to GitHub and import the repo in Vercel (framework: Next.js).
2. Add all environment variables from the table above (Production + Preview). Set a strong `SESSION_SECRET`.
3. Configure Firebase (above). Without Firebase the app would use an ephemeral `/tmp` store on Vercel — fine for a throwaway demo, not for real use.
4. Leave `DEMO_MODE` unset (off) on any deployment that holds real data.
5. Add the Vercel domain to Firebase Auth *Authorized domains*.

## Security checklist before deployment

- [ ] Firebase configured; `firestore.rules` and `storage.rules` deployed; rules tests pass against the emulator.
- [ ] `SESSION_SECRET` set (≥ 32 random chars); `.env.local` and service-account JSON not committed.
- [ ] `DEMO_MODE` off; no demo data in the production project.
- [ ] App Check enforced for Firestore and Storage.
- [ ] First admin bootstrapped; review roles in Admin → Users.
- [ ] Mission medical team has configured mission-specific thresholds (defaults are illustrative).
- [ ] Rate limiter replaced with a shared store (e.g. Redis) if running multiple instances.
- [ ] Guide AI provider left disabled unless privacy review is complete.
- [ ] Emergency procedures for the mission are documented outside this app.

Built-in protections: default-deny rules; server-side role checks on every page, action and route; Zod validation on the server; roles/mission never read from the client or cookie; no self-assigned roles; append-only clinical notes and symptom history; private journals (author-only); mood shared with medical only on opt-in; commander aggregates suppressed below k; cross-mission 404s; audit log for record views, exports and changes; rate limits on auth, records, sync, guide and NASA proxy; no health content in logs or audit entries; security headers; service worker never caches API/health data.

## Tests (last run)

- `npm run typecheck` — clean. `npm run lint` — clean. `npm run build` — passes.
- `npm test` — **68 tests** (permissions incl. negative cases, alert rules, validation, baseline, model, planner, comm-delay states, offline queue, NASA failure/fallback, repository integration incl. offline-replay idempotency and cross-mission isolation).
- `npm run test:e2e` — **25 tests** (auth redirect, register → logout → login, role routing & blocking, check-in, crew can't see research, offline queue, alert acknowledgement + audit, OSDR search, every page for every role, cross-mission 404).
- `npm run test:rules` — written (cross-user, cross-role, journal, self-role, append-only); requires Java 11+ for the emulator.

## Troubleshooting

- **"Demo data has not been seeded"** — run `npm run seed`, or delete `.data/antariksha-local.json` and restart `npm run dev`.
- **Demo dates look old** — Admin → Settings → *Regenerate demo data*.
- **Research shows "Live NASA OSDR request failed"** — the OSDR API is down or rate-limited; a labelled fixture is shown. Retry later.
- **APOD card unavailable** — `DEMO_KEY` is heavily rate-limited; set `NASA_API_KEY`.
- **Firebase sign-in works but the app says "Could not verify sign-in"** — check `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` (newline escaping) and that the project IDs match.
- **"Another next dev server is already running"** — Next 16 allows one dev server per folder; stop the other one.
- **Playwright can't find a browser** — run with `PW_CHANNEL=chrome` (uses installed Chrome) or `npx playwright install chromium`.

## Limitations

- Sensor data is simulated in the demo; real device integrations are adapters you add (records are tagged `device` / `imported`).
- Thresholds are illustrative; nothing here is clinically validated.
- The physiological-state model was trained on 20 healthy people on Earth — experimental only.
- Email / push / SMS notifications are optional adapters and are not implemented; only in-app notifications are delivered.
- Photo attachments for symptom reports require Firebase Storage (rules provided); the local mode does not store files.
- The in-memory rate limiter is per-instance.

## Data sources

NASA Open Science Data Repository (osdr.nasa.gov) — public research data, fetched server-side with provenance. NASA API portal (api.nasa.gov) — APOD only. PhysioNet Non-EEG dataset (doi:10.13026/C2J01F, ODC-By 1.0) — model training. All demo people and records are synthetic.
