# TaskFlow — Cloud-Based Task Management Platform

A production-deployed, full-stack web application that manages outsourced academic work between clients (Work Distributors) and freelancers (Service Providers). Built with a modern TypeScript stack, cloud-native file storage, and a multi-step task lifecycle backed by a relational database.

**Live demo →** [taskflow-frontend-mocha-tau.vercel.app](https://taskflow-frontend-mocha-tau.vercel.app)

---

## Overview

TaskFlow solves the coordination problem between a party distributing tasks and a party fulfilling them. It handles the full workflow — from task creation, competitive quoting, file submission with automatic versioning, revision cycles, messaging, and expense analytics — all without any manual file sharing or external communication tools.

---

## Tech Stack

| Layer | Technology | Hosting |
|---|---|---|
| **Frontend** | React 18 · Vite · TypeScript · Tailwind CSS | Vercel |
| **Backend** | Node.js 20 · Express · TypeScript · Prisma ORM | Render |
| **Database** | PostgreSQL (Neon serverless) | Neon |
| **File Storage** | Storj (S3-compatible, 150 GB free tier) | Storj |
| **Auth** | JWT (RS256 access tokens, bcrypt password hashing) | — |

---

## Key Features

### For the Work Distributor
- Create tasks with title, description, task type, word count, deadline, and university
- Upload reference materials — stored in a named folder on Storj cloud storage
- Review, accept, or reject provider price quotes
- Request revisions with written feedback; track revision rounds automatically
- Accept final submissions and mark tasks complete
- **Expense analytics dashboard** — monthly spend, task-type breakdown, provider leaderboard, month-over-month trends

### For the Service Provider
- Browse all available tasks and submit competitive price quotes
- Upload and submit work files — each submission is automatically versioned (`v1`, `v2`, `v3`, …)
- In-task messaging with the distributor
- Receive and act on revision feedback; re-submit to trigger a new version

### Shared / Platform
- Real-time red-dot notification badge when there are unseen updates (polling-based)
- In-task file viewer with direct Storj linksharing URLs
- Stage tracking for multi-part tasks
- Role-based access control (DISTRIBUTOR vs PROVIDER) enforced on every API route

---

## Architecture

```
taskflow/
├── backend/                          Node.js / Express / Prisma
│   ├── prisma/schema.prisma          7-model schema: User · Task · TaskFile · Quote
│   │                                                  Revision · TaskStage · Message
│   └── src/
│       ├── lib/
│       │   ├── drive.ts              Storj S3 upload helper (Materials / Submitted Work/v<n>)
│       │   ├── jwt.ts                Token sign / verify
│       │   └── prisma.ts             Singleton Prisma client
│       ├── middleware/
│       │   ├── auth.ts               JWT guard + role-check decorator
│       │   └── errorHandler.ts       Centralised error → HTTP response
│       └── routes/
│           ├── auth.ts               Register · Login
│           ├── tasks.ts              CRUD · file upload · submit · stage management
│           ├── quotes.ts             Submit · accept · reject
│           ├── messages.ts           In-task chat thread
│           └── expenses.ts           Monthly analytics aggregation
│
└── frontend/                         React 18 / Vite / Tailwind CSS
    └── src/
        ├── components/               Layout · TaskCard · StatusTimeline
        │                             FileDropzone · MessageThread
        ├── pages/                    Login · Register · Dashboard
        │                             CreateTask · TaskDetail · Expenses
        ├── context/AuthContext.tsx   Global auth state + JWT storage
        ├── lib/
        │   ├── api.ts                Axios instance with auth interceptor
        │   └── constants.ts          Status/type labels & Tailwind badge colours
        └── types/index.ts            Shared TypeScript interfaces
```

---

## Task Lifecycle

```
PENDING_QUOTE → QUOTED → IN_PROGRESS → SUBMITTED → COMPLETED
                   ↑                        ↓
                   └───────── REVISION ──────┘
```

Providers must upload **at least one file** when submitting. Each submission is versioned automatically:

```
<bucket>/
  20260801-MAN7INE Assignment 2/     ← yyyymmdd-TaskName folder
    Materials/                        ← original task files & general uploads
    Submitted Work/
      v1/                             ← first submission
      v2/                             ← after revision #1
      v3/ …
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/tasks` | Any | List tasks (filterable by status, type) |
| POST | `/api/tasks` | Distributor | Create task + upload materials |
| GET | `/api/tasks/:id` | Any | Full task detail (files, quotes, messages, stages) |
| PATCH | `/api/tasks/:id/status` | Any | Advance the task state machine |
| PATCH | `/api/tasks/:id/seen` | Distributor | Mark task seen (clears notification) |
| POST | `/api/tasks/:id/files` | Any | Upload to `Materials/` on Storj |
| POST | `/api/tasks/:id/submit` | Provider | Upload to `Submitted Work/v<n>/` + set SUBMITTED |
| PATCH | `/api/tasks/:id/stages/:stageId` | Any | Update stage status |
| GET | `/api/tasks/:id/messages` | Any | Fetch chat thread |
| POST | `/api/tasks/:id/messages` | Any | Post a message |
| GET | `/api/tasks/unseen-count` | Distributor | Count of tasks with unseen updates |
| POST | `/api/quotes` | Provider | Submit a quote (triggers distributor notification) |
| PATCH | `/api/quotes/:id` | Distributor | Accept or reject a quote |
| GET | `/api/expenses` | Any | Monthly analytics (filterable by year) |

---

## Local Development

### Prerequisites
- Node.js 20+
- A [Storj](https://storj.io) account with a bucket and S3 credentials (free tier: 150 GB)
- A [Neon](https://neon.tech) PostgreSQL project (free tier) — or use the SQLite swap below for quick local dev

### Setup

```bash
# 1. Clone and install all workspaces
git clone https://github.com/tomylam/taskflow.git
cd taskflow
npm install          # installs root + backend + frontend via workspaces

# 2. Configure environment
cp .env.example backend/.env
# Edit backend/.env — minimum required values:
#   DATABASE_URL   — Neon connection string, or "file:./dev.db" for SQLite
#   JWT_SECRET     — any long random string
#   STORJ_*        — credentials from your Storj dashboard (see .env.example)

# 3. (Optional) Switch to SQLite for local dev — no Neon account needed
# In backend/prisma/schema.prisma, change provider = "postgresql" → "sqlite"

# 4. Run migrations and seed demo accounts
cd backend
npx prisma migrate dev --name init
npm run db:seed

# 5. Start both servers
cd ..
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:5173
```

### Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Work Distributor | `distributor@demo.com` | `password123` |
| Service Provider | `provider@demo.com` | `password123` |

---

## Deployment

The app is configured for a zero-cost cloud deployment:

| Service | Platform | Config |
|---|---|---|
| Frontend | Vercel | Root: `frontend` · Framework: Vite |
| Backend | Render | Root: `backend` · `render.yaml` included |
| Database | Neon | Free serverless PostgreSQL |
| Storage | Storj | Free S3-compatible object storage |

Required backend environment variables (set in Render's Environment tab):

```
DATABASE_URL        Neon PostgreSQL connection string
JWT_SECRET          A long, random secret string
STORJ_ENDPOINT      https://gateway.storjshare.io
STORJ_ACCESS_KEY    Storj S3 access key
STORJ_SECRET_KEY    Storj S3 secret key
STORJ_BUCKET        Your Storj bucket name
STORJ_LINK_ACCESS   Storj linksharing access grant (for public file URLs)
```

Required frontend environment variable (set in Vercel's Environment tab):

```
VITE_API_BASE_URL   https://<your-render-backend>.onrender.com/api
```

---

## Security Notes

- Passwords are hashed with **bcrypt** (cost factor 10)
- All state-mutating routes are protected by a **JWT middleware** that verifies both token validity and user role
- Secrets are never committed — use `.env.example` as a reference template
- Storj file URLs use a read-only linksharing access grant scoped to a single bucket

---

## License

MIT
