# AccidentAlarm — Road Accident Detection, Reporting and Emergency Response System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

> An Android-based system for rapid accident reporting and co-ordinated emergency dispatch.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         MONOREPO ROOT                           │
│  Accident_Alarm/                                                │
│  ├─ apps/                                                       │
│  │   ├─ android/          Jetpack Compose Android app           │
│  │   └─ web-dashboard/    React + Vite dispatcher dashboard     │
│  ├─ services/                                                   │
│  │   ├─ api/              Express REST API (Node.js/TypeScript)  │
│  │   └─ worker/           Notification outbox worker            │
│  ├─ packages/                                                   │
│  │   └─ api-contracts/    Shared TypeScript DTOs & enums        │
│  └─ infra/                                                      │
│      └─ docker-compose.yml  PostgreSQL + Redis (dev only)       │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Tech | Purpose |
|---|---|---|
| **Android App** | Kotlin, Jetpack Compose, Retrofit | Witness incident reporting with GPS capture |
| **Web Dashboard** | React 18, Vite, TypeScript | Dispatcher triage, assignment, status management |
| **REST API** | Node.js, Express, TypeScript | Single-entry API gateway; in-memory store (dev) or PostgreSQL (prod) |
| **Notification Worker** | TypeScript | Transactional outbox processor with exponential back-off |
| **api-contracts** | TypeScript | Single source of truth for DTOs, enums, API response shapes |

---

## Quick Start (Development)

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Java 17 (for Android builds)
- Android Studio (for running/debugging the Android app)
- Docker + Docker Compose (optional — for PostgreSQL)

### 1. Clone & Install

```bash
git clone <repo-url>
cd Accident_Alarm
npm install            # installs all workspaces
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env — at minimum set AUTH_SECRET and GUEST_TOKEN_SECRET to
# random 32+ character strings for any non-trivial testing
```

### 3. Start the API (in-memory mode — no database required)

```bash
# From repo root:
npm run dev --workspace=services/api
# API starts on http://localhost:4000
```

### 4. Start the Notification Worker

```bash
npm run dev --workspace=services/worker
```

### 5. Start the Web Dashboard

```bash
npm run dev --workspace=apps/web-dashboard
# Opens http://localhost:3000
```

### 6. Run the Android App

Open `apps/android/` in Android Studio, sync Gradle, and run on an emulator or device.

> **Note:** The Android emulator uses `10.0.2.2` to reach the host API (`ApiClient.DEFAULT_BASE_URL`). If using a real device on the same Wi-Fi, update `ApiClient.setCustomBaseUrl()` to your host machine's IP.

---

## Default Development Credentials

| Role | Email | Password |
|---|---|---|
| Dispatcher (Supervisor) | `dispatcher@accidentalarm.gov` | `DispatchPass123!` |
| Responder | `responder1@accidentalarm.gov` | `ResponderPass123!` |
| Admin | `admin@accidentalarm.gov` | `AdminPass123!` |

These are seeded by `seedDefaultData()` in `services/api/src/db/index.ts` at startup.

---

## Testing

### API Integration Tests (Jest + Supertest)

```bash
npm test --workspace=services/api
```

Tests cover:
- `FR-02`: Incident submission validation
- `FR-04`: Guest token status polling
- `FR-06`: Staff triage & status transitions
- `FR-07`: Assignment lifecycle
- Auth login / JWT validation
- Worker outbox processing

### Android Unit Tests (JUnit 4 + MockWebServer)

```bash
# From Android Studio: Run > Run Tests in 'app'
# Or via Gradle:
cd apps/android
./gradlew test
```

Tests cover:
- GPS coordinate boundary validation
- `CreateIncidentRequest` model construction
- Retrofit serialisation / deserialisation via MockWebServer
- HTTP 429 rate-limit error handling

---

## API Reference

Base URL: `http://localhost:4000/api/v1`

### Public Endpoints (no auth)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe |
| `GET` | `/api/v1/config/public` | Emergency helpline numbers + disclaimer |
| `POST` | `/api/v1/incidents` | Submit incident report (`Idempotency-Key` header required) |
| `GET` | `/api/v1/incidents/{id}/status` | Status poll (`X-Guest-Token` header) |

### Staff Endpoints (Bearer JWT)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Obtain JWT |
| `GET` | `/api/v1/auth/me` | Current user profile |
| `GET` | `/api/v1/staff/incidents` | List with filters (status, severity, search…) |
| `GET` | `/api/v1/staff/incidents/{id}` | Full incident detail |
| `PATCH` | `/api/v1/staff/incidents/{id}/triage` | Set priority, verification, notes |
| `POST` | `/api/v1/staff/incidents/{id}/status-events` | Advance lifecycle status |
| `POST` | `/api/v1/staff/incidents/{id}/notes` | Add internal note |
| `POST` | `/api/v1/staff/incidents/{id}/assignments` | Create assignment |
| `PATCH` | `/api/v1/staff/assignments/{id}` | Update assignment |
| `GET` | `/api/v1/staff/agencies` | List registered agencies |
| `GET` | `/api/v1/staff/notifications` | Notification outbox |

### Admin Endpoints (Bearer JWT + ADMIN role)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/admin/users` | List all staff users |
| `POST` | `/api/v1/admin/users/invitations` | Invite new staff |
| `PATCH` | `/api/v1/admin/users/{id}` | Update user / change role |
| `GET` | `/api/v1/admin/audit-logs` | Immutable audit trail |

---

## Security Controls

| Requirement | Implementation |
|---|---|
| JWT authentication | HS256, configurable expiry (default 24h) |
| Password hashing | bcrypt, cost factor 12 |
| Guest access tokens | Signed HS256 JWT, scoped to single incident |
| Rate limiting | express-rate-limit — 10 submits / 15 min per IP |
| Security headers | helmet.js |
| CORS | Allowlist of known origins only |
| Location privacy | Coordinates rounded to ~1 km precision in public API |
| No background tracking | PRD NFR-04: one-time GPS capture only |
| Audit logging | Every state change recorded with actor + timestamp |

---

## Hosted Deployment (Render + Supabase + Vercel)

The repository includes a Render Blueprint (`render.yaml`) for the API and notification worker, plus a Vercel config (`vercel.json`) for the dashboard. The API now uses Prisma/PostgreSQL whenever `DATABASE_URL` is configured; demo accounts and sample incidents are seeded only outside production.

1. Create a Supabase project and copy the **Session pooler** connection string (Supavisor, port 5432) from **Project Settings > Database > Connection string**. Use this for Render's API and worker: the direct database hostname may resolve only to IPv6 and may not be reachable from Render. The pooler username normally includes the project reference, such as `postgres.<project-ref>`. Add `?schema=public` if it is absent. Keep the database password private and never put it in `.env.example` or source control.
2. Connect the Git repository to Render and create services from `render.yaml`. Set `DATABASE_URL` on both the API and worker to the same Supabase URL. Set `INITIAL_ADMIN_EMAIL` and a unique `INITIAL_ADMIN_PASSWORD` (at least 12 characters) on the API. Render generates `AUTH_SECRET` and `GUEST_TOKEN_SECRET`.
3. Create the Vercel project from the repository with the repository root as its Root Directory. Set `VITE_API_BASE_URL` to the API origin, for example `https://accident-alarm-api.onrender.com`, with no trailing slash. Deploy, then copy the resulting dashboard origin into the Render API's `WEB_APP_ORIGIN` and redeploy the API.
4. Wait for `/health/ready` to report `UP` and `CONNECTED`. Render runs the checked-in Prisma migration before API deployment. Production starts with the initial admin but does not seed demo agencies or incidents; add agency records through a controlled admin provisioning process before testing assignment workflows. Log in with the initial admin email/password and invite named staff accounts; do not use development seed credentials.
5. Build the Android release against that API URL and install-test it on real devices before sharing it:

  ```powershell
  $env:API_BASE_URL = "https://accident-alarm-api.onrender.com/api/v1/"
  cd apps/android
  .\gradlew.bat clean testDebugUnitTest assembleRelease
  ```

6. Check the generated release APK signature, login, guest reporting, location fallback, retry/idempotency, dashboard incident visibility, and operation over mobile data. Provide the client the APK, version, checksum, test URL/contact, and known limitations.

Do not use the demo emergency contacts as verified operational numbers. The notification adapters remain simulated, and this project is not ready for real emergency dispatch. Configure a custom Render domain if needed, update `WEB_APP_ORIGIN` and the Android build URL, and redeploy after changing origins.

---

## Project Structure

```
apps/android/
  app/src/main/java/com/accidentalarm/app/
    MainActivity.kt               — Compose entry point
    data/
      api/AccidentApiService.kt   — Retrofit interface + OkHttp client
      local/LocalStorage.kt       — SharedPreferences draft/report storage
      model/Models.kt             — DTOs and enums
      repository/IncidentRepository.kt  — Repository mediating API + local storage
    location/
      AccidentLocationManager.kt  — One-time GPS capture (PRD NFR-04)
    ui/
      navigation/AppNavigation.kt — NavHost with 4 destinations
      screens/
        HomeScreen.kt             — Landing + emergency dial
        ReportFlowScreen.kt       — 3-step reporting wizard
        MyReportsScreen.kt        — Past reports with live status polling
        SubmissionResultScreen.kt — Confirmation with reference code
      theme/
        Color.kt / Theme.kt / Type.kt  — Material 3 dark theme
      viewmodel/
        ReportViewModel.kt        — StateFlow-driven report wizard state

services/api/src/
  app.ts / server.ts              — Express app factory + HTTP server lifecycle
  config/                         — Environment configuration
  db/                             — In-memory store + Prisma schema for prod
  auth/                           — JWT auth middleware + service
  incidents/                      — Submission, validation, status events
  assignments/                    — Assignment CRUD
  admin/                          — User management + audit logs
  uploads/                        — Media attachment handling
  health/                         — Liveness endpoint
  common/                         — Rate limiting, error handling, middleware

services/worker/src/
  worker.ts                       — Notification outbox poll loop
  backoff.ts                      — Exponential back-off + dead-letter logic
  providers/channel-adapters.ts   — Simulated IN_APP / FCM / SMS / Email providers

packages/api-contracts/src/
  index.ts                        — All shared enums, DTOs, response types

apps/web-dashboard/src/
  App.tsx                         — Main dashboard shell
  services/api.ts                 — Typed fetch client
  context/AuthContext.tsx         — Auth state + login flow
  components/                     — IncidentQueue, IncidentDetail, TriageModal…
```

---

## Compliance Matrix (PRD Verification)

| Requirement | Status | Location |
|---|---|---|
| FR-01 Anonymous reporting | ✅ | `/api/v1/incidents` (no auth required) |
| FR-02 Structured form | ✅ | `ReportFlowScreen.kt` 3-step wizard |
| FR-03 GPS capture | ✅ | `AccidentLocationManager.kt` |
| FR-04 Guest status polling | ✅ | `getIncidentStatus()` with `X-Guest-Token` |
| FR-05 Emergency dial | ✅ | `HomeScreen.kt` → `tel:112` Intent |
| FR-06 Staff triage | ✅ | `PATCH /staff/incidents/{id}/triage` |
| FR-07 Assignment | ✅ | `POST /staff/incidents/{id}/assignments` |
| FR-08 Notifications | ✅ | `NotificationWorker` outbox processor |
| FR-09 Audit log | ✅ | `GET /admin/audit-logs` |
| NFR-01 Rate limiting | ✅ | `createRateLimiter()` in app.ts |
| NFR-02 Idempotency | ✅ | `Idempotency-Key` header dedup |
| NFR-03 JWT security | ✅ | `auth.middleware.ts` |
| NFR-04 No background tracking | ✅ | One-time capture only |
| NFR-05 Location privacy | ✅ | Coordinates rounded in public API |
