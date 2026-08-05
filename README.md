# TaskFlow — Cloud-Based Academic Task Manager

A full-stack web application for managing outsourced university assignments between a **Work Distributor** and **Service Providers**, with AI-powered task analysis and Storj cloud file storage.

---

## Stack

| Layer | Technology | Cost |
|---|---|---|
| Backend | Node.js 20 + Express + Prisma (ORM) | Free |
| Database | PostgreSQL (Railway plugin) | Free tier |
| File Storage | **Storj** (S3-compatible, 150 GB free) | **Free** (150 GB storage · 150 GB/mo bandwidth · no file size limit) |
| AI Analysis | **OpenRouter** — Gemma 4 free model | **Free** (no credit card) |
| Hosting | Railway | Free tier (~$5 credit/mo) |
| Frontend | React 18 + Vite + Tailwind CSS | Free (static) |

---

## Architecture

```
taskflow/
├── backend/
│   ├── prisma/schema.prisma       ← 7-model DB schema (User, Task, TaskFile, Quote, Revision, TaskStage, Message)
│   ├── nixpacks.toml              ← Railway build config
│   └── src/
│       ├── lib/
│       │   ├── drive.ts           ← Storj S3-compatible upload (Materials / Submitted Work/v<n>)
│       │   ├── llm.ts             ← OpenRouter LLM task analyser
│       │   ├── jwt.ts
│       │   └── prisma.ts
│       ├── middleware/
│       │   ├── auth.ts            ← JWT guard + role check
│       │   └── errorHandler.ts
│       └── routes/
│           ├── auth.ts            ← register · login
│           ├── tasks.ts           ← CRUD · file upload · submit · stages
│           ├── quotes.ts          ← submit · accept · reject
│           ├── messages.ts        ← in-task chat
│           └── expenses.ts        ← monthly expense analytics
└── frontend/
    └── src/
        ├── components/            ← Layout · TaskCard · StatusTimeline · FileDropzone · MessageThread
        ├── pages/                 ← Login · Register · Dashboard · CreateTask · TaskDetail · Expenses
        ├── context/AuthContext.tsx
        ├── lib/
        │   ├── api.ts             ← Axios instance
        │   └── constants.ts       ← status/type labels & badge colours
        └── types/index.ts         ← shared TypeScript interfaces
```

---

## Task Lifecycle

```
PENDING_QUOTE → QUOTED → IN_PROGRESS → SUBMITTED → COMPLETED
                   ↑                       ↓
                   └──────── REVISION ─────┘
```

Providers must upload **at least one file** when submitting. Each submission is versioned automatically:

```
<bucket>/
  20260801-MAN7INE Assignment 2/    ← yyyymmdd-TaskName folder
    Materials/                       ← original task files + general uploads
    Submitted Work/
      v1/                            ← first submission
      v2/                            ← after revision #1
      v3/ …
```

---

## ☁️ Deploy to Railway (Recommended)

Railway gives you a free PostgreSQL database and auto-deploys from GitHub.

### Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your `taskflow` repo

### Step 3 — Add a PostgreSQL database

In your Railway project dashboard:
- Click **+ New** → **Database** → **PostgreSQL**
- Railway automatically injects `DATABASE_URL` — no copy/paste needed

### Step 4 — Configure the Backend service

In Railway, select the **backend** service → **Variables** tab. Add:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Any long random string |
| `OPENROUTER_API_KEY` | Your key from [openrouter.ai](https://openrouter.ai) |
| `STORJ_ENDPOINT` | `https://gateway.storjshare.io` |
| `STORJ_ACCESS_KEY` | Storj S3 access key ID |
| `STORJ_SECRET_KEY` | Storj S3 secret key |
| `STORJ_BUCKET` | Your bucket name (e.g. `taskflow`) |
| `STORJ_LINK_ACCESS` | Storj linksharing access grant *(see Storj setup below)* |

In the **Settings** tab:
- **Root Directory**: `backend`
- **Build command**: `npm run build`
- **Start command**: `npm start` *(auto-runs DB migrations on every deploy)*

### Step 5 — Configure the Frontend service

Add a **second service** from the same repo:
- **Root Directory**: `frontend`
- **Build command**: `npm run build`
- **Start command**: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Add variable: `VITE_API_BASE_URL` = `https://<your-backend-railway-url>/api`

### Step 6 — Seed demo accounts (optional)

In Railway → Backend service → **Shell** tab:
```bash
npm run db:seed
```

---

## 🔑 Getting Your Free Credentials

### OpenRouter (AI Analysis) — FREE

1. Go to [openrouter.ai](https://openrouter.ai) → **Sign in** → **Keys** → **Create key**
2. Copy the key (starts with `sk-or-v1-`)
3. Free tier uses `google/gemma-4-26b-a4b-it:free` — no credit card required

### Storj (File Storage) — FREE

1. Sign up at [storj.io](https://storj.io) → create an account
2. **Create a bucket** (e.g. `taskflow`) — set it to **public**
3. **S3 credentials** — Buckets → your bucket → **Access** → **Create S3 Credentials**:
   - Copy `Endpoint` → `STORJ_ENDPOINT`
   - Copy `Access Key` → `STORJ_ACCESS_KEY`
   - Copy `Secret Key` → `STORJ_SECRET_KEY` *(shown once — save it immediately)*
4. **Linksharing grant** (for public download URLs) — **Access Keys** → **Create Access Grant**:
   - Permission: **Download only** · Bucket: `taskflow`
   - Click **Generate** → copy the access grant string → `STORJ_LINK_ACCESS`

**Free tier:** 150 GB storage · 150 GB/month bandwidth · no per-file size limit · all file types

---

## 💻 Local Development

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/taskflow.git
cd taskflow
cd backend && npm install
cd ../frontend && npm install

# 2. Configure backend env
cp .env.example backend/.env
# Edit backend/.env — minimum required:
#   DATABASE_URL="file:./dev.db"        ← SQLite for local dev
#   JWT_SECRET="any-local-secret"
#   OPENROUTER_API_KEY="sk-or-v1-..."
#   STORJ_ENDPOINT="https://gateway.storjshare.io"
#   STORJ_ACCESS_KEY="your-access-key"
#   STORJ_SECRET_KEY="your-secret-key"
#   STORJ_BUCKET="taskflow"
#   STORJ_LINK_ACCESS="your-link-access-grant"

# 3. Switch schema to SQLite (local only)
# In backend/prisma/schema.prisma:
#   provider = "sqlite"    (change from "postgresql")

# 4. Migrate & seed
cd backend
npx prisma migrate dev --name init
npm run db:seed

# 5. Start both servers
npm run dev                          # backend  → http://localhost:4000
cd ../frontend && npm run dev        # frontend → http://localhost:5173
```

---

## Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Work Distributor | `distributor@demo.com` | `password123` |
| Service Provider | `provider@demo.com` | `password123` |

---

## Features

### Work Distributor
- Create tasks with title, description, task type, word count, deadline, university
- AI-powered task brief generated automatically from the description (OpenRouter)
- Upload reference materials (stored in `Materials/` on Storj)
- Review and accept/reject provider quotes
- Request revisions with written feedback
- Accept completed submissions
- Expense analytics dashboard — monthly spend, task type breakdown, provider leaderboard, MoM trends

### Service Provider
- Browse all available tasks
- Submit price quotes with notes
- Upload and submit work files (versioned automatically as `Submitted Work/v1`, `v2`, …)
- In-task messaging with the distributor
- View revision feedback and re-submit

### Both roles
- Real-time red-dot notifications when there are unseen updates
- In-task file viewer (direct Storj linksharing URLs)
- Stage tracking for long-term multi-part tasks
- Full message thread per task

---

## API Reference

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register new account |
| POST | `/api/auth/login` | — | Login → JWT token |
| GET | `/api/tasks` | Any | List tasks (filterable by status, type) |
| POST | `/api/tasks` | Distributor | Create task + AI analysis + upload materials |
| GET | `/api/tasks/:id` | Any | Task detail (files, quotes, messages, stages) |
| PATCH | `/api/tasks/:id/status` | Any | Advance task state machine |
| PATCH | `/api/tasks/:id/seen` | Distributor | Mark task as seen (clears red dot) |
| POST | `/api/tasks/:id/files` | Any | Upload files to `Materials/` on Storj |
| POST | `/api/tasks/:id/submit` | Provider | Upload files to `Submitted Work/v<n>/` + set SUBMITTED |
| PATCH | `/api/tasks/:id/stages/:stageId` | Any | Update stage status |
| GET | `/api/tasks/:id/messages` | Any | Get chat thread |
| POST | `/api/tasks/:id/messages` | Any | Send message |
| GET | `/api/tasks/unseen-count` | Distributor | Count of tasks with unseen provider updates |
| POST | `/api/quotes` | Provider | Submit a quote (triggers red dot for distributor) |
| PATCH | `/api/quotes/:id` | Distributor | Accept or reject a quote |
| GET | `/api/expenses` | Any | Monthly expense analytics (filterable by year) |
