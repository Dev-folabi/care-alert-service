# 🚨 Care Alert Notification Service

A real-time clinical alert notification system that ingests webhook events from monitoring devices, applies suppression rules to reduce noise, and delivers alerts to the right clinician or patient — without leaking data between patients.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start Redis (Docker or local)
docker compose up -d redis
# OR: redis-server --daemonize yes

# 3. Set up the database
cd packages/server
npx prisma db push
npm run db:seed

# 4. Start the backend (in one terminal)
npm run dev:server

# 5. Start the frontend (in another terminal)
npm run dev:web
```

**Open:** http://localhost:3000

**Demo credentials:**
| Role | Email | Password |
|------|-------|----------|
| Clinician | clinician@carealert.io | password123 |
| Patient (PT-001) | patient1@carealert.io | password123 |
| Patient (PT-002) | patient2@carealert.io | password123 |

---

## Stack & Why

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime** | Node.js + TypeScript | Type safety, async-native, fast to build |
| **Framework** | Express | Lightweight, unopinionated — easy to structure modularly |
| **Database** | Prisma + SQLite (dev) / PostgreSQL (prod) | Prisma gives type-safe queries + migration workflow. SQLite = zero setup for reviewers. PostgreSQL for real deployments. |
| **Queue** | BullMQ + Redis | Reliable job processing with retries, backoff, and concurrency control. Keeps webhook ingestion fast (return 202, process async). |
| **Cache** | Redis | Already required by BullMQ. Dual-purpose for idempotency keys and API response caching. |
| **Real-time** | Socket.io | JWT-authenticated WebSocket connections with room-based targeting. Clinicians get all alerts; patients get only their own. |
| **Auth** | JWT + bcrypt | Stateless authentication. Token carries `{ userId, role, patientId }` — no server-side sessions needed. |
| **Frontend** | Next.js 15 (App Router) | Server components where possible, file-based routing, built-in API proxy via rewrites. |
| **State** | Zustand + TanStack Query | Zustand for auth/socket state (persisted to localStorage). TanStack Query for all server data — caching, refetching, and invalidation on socket events. |
| **Styling** | Tailwind CSS | Utility-first, responsive, no external component library needed. |
| **Testing** | Vitest | Fast, ESM-native, runs against real SQLite + Redis for confidence. |

---

## Architecture

```
Monitoring Provider
       │
       │ POST /api/webhooks/alerts (HMAC-signed)
       ▼
  ┌─────────┐     ┌──────────────┐     ┌──────────────┐
  │  HMAC    │────▶│  Idempotency │────▶│   BullMQ     │
  │  Verify  │     │  (Redis+DB)  │     │   Queue      │
  └─────────┘     └──────────────┘     └──────┬───────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │   Worker      │
                                       │  - Suppression│
                                       │  - Status     │
                                       │  - Cache inv. │
                                       └──────┬───────┘
                                              │
                              ┌────────────────┼────────────────┐
                              ▼                ▼                ▼
                        ┌──────────┐    ┌──────────┐    ┌──────────┐
                        │ Event Bus│    │  Redis   │    │ Database │
                        │(in-proc) │    │  Cache   │    │ (Prisma) │
                        └────┬─────┘    └──────────┘    └──────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │  Socket.io   │
                      │  Gateway     │
                      └──────┬───────┘
                             │
                 ┌───────────┼───────────┐
                 ▼                       ▼
          ┌─────────────┐        ┌─────────────┐
          │  Clinician  │        │   Patient   │
          │  Dashboard  │        │  Dashboard  │
          └─────────────┘        └─────────────┘
```

---

## Key Design Decisions & Tradeoffs

### 1. HMAC Signature Verification

**Decision:** Compute HMAC-SHA256 over the raw request body. Compare using `crypto.timingSafeEqual` to prevent timing side-channel attacks.

**Tradeoff:** Slightly slower than `===`, but timing attacks are a real threat in automated webhook environments. The security benefit far outweighs the nanosecond cost.

### 2. Dual-Layer Idempotency

**Decision:** Redis SET (fast path) + DB unique constraint on `eventId` (durable fallback).

**Tradeoff:**
| Approach | Pros | Cons |
|----------|------|------|
| Redis only | O(1), fast | Data lost if Redis crashes or TTL expires |
| DB only | Durable | Slower (DB query on every webhook) |
| **Hybrid (chosen)** | Fast for the common case, safe when Redis fails | Slightly more code |

If Redis TTL expires or Redis crashes, the DB unique constraint catches duplicates (Prisma P2002 error). The existing alert is fetched and returned — no double-processing.

### 3. Suppression Rule

**Decision:** If a patient has >3 LOW-severity alerts within a 5-minute sliding window, suppress subsequent ones. MEDIUM and HIGH are never suppressed.

**Why:** Low-severity alerts are often noise (e.g., slightly elevated BP). But 3+ in 5 minutes suggests a pattern worth noting — so we batch them into a single "N alerts suppressed" notification. Higher severities could be clinically critical and must always reach the clinician.

**Implementation:** Redis INCR + EXPIRE on `suppress:{patientId}`. First increment sets the TTL (starts the window). When TTL expires, the window resets automatically.

### 4. BullMQ for Async Processing

**Decision:** After webhook ingestion, enqueue the alert to BullMQ rather than processing synchronously.

**Tradeoff:** Adds Redis dependency and worker complexity. But the webhook endpoint returns 202 immediately (fast), BullMQ provides retry with exponential backoff, and processing is decoupled from ingestion. If the DB is temporarily slow, the queue absorbs the load.

### 5. Caching Strategy — Hybrid Invalidation

**Decision:** Event-driven invalidation (primary) + 60-second TTL (safety net).

**Tradeoff:**
| Approach | Pros | Cons |
|----------|------|------|
| TTL only | Simple | Could serve stale data for up to TTL duration — dangerous in a clinical context |
| Event-driven only | Always fresh | If invalidation fails (Redis blip), stale data persists indefinitely |
| **Hybrid (chosen)** | Event-driven keeps data fresh; TTL self-heals if an invalidation event is missed | Slightly more code, but the reliability is worth it for clinical data |

Cache keys: `cache:alerts:patient:{patientId}`, `cache:alerts:all:{queryParams}`. Both are deleted when a new alert is processed by the worker.

### 6. Access Control at the API Layer

**Decision:** Two middleware layers — `authGuard` (verify JWT) and `rbacGuard(roles[])` (check role). Enforcement at the route level, not just the UI.

- `GET /api/alerts` → `rbacGuard(['CLINICIAN'])` — patients get 403
- `GET /api/alerts/mine` → `rbacGuard(['PATIENT'])` — uses `req.user.patientId` from JWT
- `GET /api/alerts/:id` → ownership check in service: if patient, verify `alert.patientId === req.user.patientId`

**Why:** UI hiding is not security. Anyone can call the API directly. The server must enforce that Patient A never sees Patient B's alerts — this is a data isolation requirement, not a UX preference.

### 7. In-Process Event Bus

**Decision:** Node.js `EventEmitter` with typed events (`alert:created`, `alert:suppressed`).

**Tradeoff:** Only works within a single process. If scaling to multiple servers, replace with Redis Pub/Sub (we already have Redis). The interface stays the same; only the transport changes.

### 8. SQLite for Dev, PostgreSQL for Prod

**Decision:** SQLite in development (file-based, zero setup), PostgreSQL in production (concurrent writes, better scalability).

**Tradeoff:** SQLite has limited concurrent write support and doesn't support all PostgreSQL features. But for a take-home project, the zero-setup experience for the reviewer matters more. Prisma abstracts the SQL dialect, so the application code is identical.

---

## API Reference

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `POST` | `/api/auth/register` | — | — | Register a new user |
| `POST` | `/api/auth/login` | — | — | Login → JWT token |
| `GET` | `/api/auth/me` | JWT | Any | Current user profile |
| `POST` | `/api/webhooks/alerts` | HMAC | — | Ingest alert event |
| `GET` | `/api/alerts` | JWT | Clinician | All alerts (all patients) |
| `GET` | `/api/alerts/mine` | JWT | Patient | Own alerts only |
| `GET` | `/api/alerts/:id` | JWT | Both | Single alert (ownership check for patients) |

**Query params for alert lists:** `patientId`, `severity` (low/medium/high), `status` (active/suppressed/pending), `page`, `limit`

---

## WebSocket Events

| Direction | Event | Payload | Room |
|-----------|-------|---------|------|
| Server → Client | `alert:new` | `{ id, patientId, severity, message, triggeredAt }` | `clinicians`, `patient:{patientId}` |
| Server → Client | `alert:suppressed` | `{ id, patientId, suppressedCount, ... }` | `clinicians`, `patient:{patientId}` |
| Client → Server | `subscribe:patient` | `{ patientId }` | Clinician joins patient room |
| Client → Server | `unsubscribe:patient` | `{ patientId }` | Clinician leaves patient room |

**Authentication:** Pass JWT as `auth.token` in the Socket.io handshake. Connections without a valid token are rejected.

---

## Database Indexes

| Table | Index | Why |
|-------|-------|-----|
| Alert | `eventId` **UNIQUE** | Idempotency + fast dedup lookup |
| Alert | `patientId` | Most common filter (patient history) |
| Alert | `severity` | Filter by severity |
| Alert | `status` | Filter active vs suppressed |
| Alert | `(patientId, severity)` | Suppression window query |
| Alert | `(patientId, createdAt)` | Patient alert history sorted chronologically |
| Alert | `createdAt` | Pagination + ordering |
| User | `email` **UNIQUE** | Login lookup |

---

## Testing

```bash
# Run all tests (requires Redis running)
cd packages/server
npm test
```

### What We Test and Why

| Priority | Area | Tests | Why |
|----------|------|-------|-----|
| **1st** | HMAC verification | 17 | Security boundary — fake alerts could inject dangerous data into the clinical system |
| **2nd** | Idempotency | 7 | Data integrity — double-alerting causes alarm fatigue; covers both Redis and DB fallback |
| **3rd** | Access control | 11 | HIPAA-level concern — one patient seeing another's data is a data breach |
| **4th** | Suppression logic | 10 | Business rule correctness — wrong threshold = noise fatigue or missed patterns |

**Test design:** No mocks for DB/Redis — tests run against real SQLite + Redis for maximum confidence. Each suite creates and cleans its own records.

---

## Test Scripts

### Send a single webhook with HMAC signature:
```bash
bash scripts/seed-webhook.sh
```

### Simulate rapid alerts to demo suppression:
```bash
bash scripts/simulate-alerts.sh
```

---

## What I'd Do With More Time

- **Rate limiting** on the webhook endpoint (e.g., 100 req/min per IP) to prevent abuse
- **Database migrations** instead of `prisma db push` for production schema evolution
- **Pagination cursor** instead of offset-based for large datasets
- **Message queue (Redis Streams / RabbitMQ)** instead of in-process EventEmitter for multi-server scaling
- **Audit logging** — every alert access and status change recorded for compliance
- **Alert acknowledgment** — clinicians can mark alerts as "reviewed"
- **Escalation rules** — if HIGH alert not acknowledged in X minutes, escalate to another clinician
- **Full E2E tests** with Playwright covering the login → dashboard → real-time alert flow
- **CI/CD pipeline** with GitHub Actions (lint, test, build, deploy)
- **Dockerized deployment** with multi-stage builds for server + static export for web
- **Proper secret management** — vault/encrypted env vars instead of plaintext .env
- **Refresh token rotation** for longer sessions without re-authentication
- **Tenant isolation** — if supporting multiple hospitals, add organization-level scoping

---

## AI Tool Use

- **ChatGPT / Claude**: Used for architecture brainstorming and debugging BullMQ + ioredis type compatibility issues in the monorepo setup
- **GitHub Copilot**: Used for boilerplate generation (Express route patterns, Prisma queries, React component skeletons)
- All code was reviewed, understood, and can be walked through and defended in a follow-up call

---

## Project Structure

```
care-alert-service/
├── packages/
│   ├── server/                     # Express + TypeScript backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # DB schema with indexes
│   │   │   └── seed.ts             # Seed data
│   │   └── src/
│   │       ├── config/             # Env, Redis, BullMQ config
│   │       ├── db/                 # Prisma client singleton
│   │       ├── events/             # Typed event bus
│   │       ├── middleware/         # HMAC, auth, RBAC, validation
│   │       ├── modules/
│   │       │   ├── auth/           # Register, login, JWT
│   │       │   ├── webhook/        # Ingest, HMAC verify, enqueue
│   │       │   ├── alert/          # Read API + caching
│   │       │   └── worker/         # BullMQ processor + suppression
│   │       ├── socket/             # Socket.io gateway + handlers
│   │       ├── utils/              # Crypto, idempotency
│   │       ├── app.ts              # Express app factory
│   │       └── index.ts            # Server entry point
│   │
│   └── web/                        # Next.js frontend
│       └── src/
│           ├── app/                # Next.js App Router pages
│           ├── components/
│           │   ├── ui/             # Reusable primitives
│           │   ├── alerts/         # Alert-specific components
│           │   └── layout/         # Dashboard shell
│           ├── hooks/              # useAlerts, useAuth, useSocket, useLiveAlerts
│           ├── stores/             # Zustand: authStore, socketStore
│           ├── lib/                # API client, query client, socket, utils
│           └── types/              # TypeScript interfaces
│
├── scripts/                        # Test scripts
│   ├── seed-webhook.sh
│   └── simulate-alerts.sh
│
├── docker-compose.yml              # Redis + PostgreSQL
└── README.md
```
