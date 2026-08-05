# TaskFlow — Cloud-Based Academic Task Manager

A full-stack web application for managing outsourced university assignments between a **Work Distributor** and **Service Providers**, with Storj cloud file storage.

---

## 🌐 Live Deployment

| Service | URL |
|---|---|
| Frontend | https://taskflow-frontend-mocha-tau.vercel.app |
| Backend | https://taskflow-backend-68rs.onrender.com |
| Health check | https://taskflow-backend-68rs.onrender.com/api/health |

---

## Stack

| Layer | Technology | Hosting | Cost |
|---|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Vercel | Free |
| Backend | Node.js 20 + Express + Prisma | Render | Free |
| Database | PostgreSQL | Neon | Free |
| File Storage | Storj (S3-compatible, 150 GB free) | Storj | Free |

---

## Architecture

```
taskflow/
├── backend/
│   ├── prisma/schema.prisma       ← 7-model DB schema (User, Task, TaskFile, Quote, Revision, TaskStage, Message)
│   ├── render.yaml                ← Render deployment config
│   └── src/
│       ├── lib/
│       │   ├── drive.ts           ← Storj S3-compatible upload (Materials / Submitted Work/v<n>)
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
    ├── vercel.json                ← SPA routing config for Vercel
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

## ☁️ Deploy (Vercel + Render + Neon)

### Step 1 — Push code to GitHub

```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

> **Note:** GitHub no longer accepts passwords — use a Personal Access Token.
> Go to github.com → Settings → Developer settings → Personal access tokens → Generate new token (check `repo` scope). Use the token as your password when pushing.

### Step 2 — Create Neon database (free PostgreSQL)

1. Go to [neon.tech](https://neon.tech) → **New Project** → name it `taskflow`
2. Copy the connection string: `postgresql://...`  — you'll need this as `DATABASE_URL`

### Step 3 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New Web Service** → connect your GitHub repo
2. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. Add environment variables:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string from Step 2 |
| `JWT_SECRET` | Any long random string |
| `STORJ_ENDPOINT` | `https://gateway.storjshare.io` |
| `STORJ_ACCESS_KEY` | Storj S3 access key ID |
| `STORJ_SECRET_KEY` | Storj S3 secret key |
| `STORJ_BUCKET` | Your bucket name (e.g. `taskflow`) |
| `STORJ_LINK_ACCESS` | Storj linksharing access grant |

### Step 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
2. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Output Directory**: `dist`
3. Add environment variable:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<your-render-backend-url>/api` |

### Step 5 — Seed demo accounts

Run from your local machine (with `DATABASE_URL` pointing at Neon in `backend/.env`):

```bash
cd backend
npx prisma generate
npm run db:seed
```

---

## 🔑 Getting Your Free Credentials

### Neon (PostgreSQL) — FREE forever

1. Go to [neon.tech](https://neon.tech) → sign up → **New Project**
2. Copy the `postgresql://...` connection string from the dashboard

### Storj (File Storage) — FREE

1. Sign up at [storj.io](https://storj.io)
2. **Create a bucket** (e.g. `taskflow`) — set it to **public**
3. **S3 credentials** — Buckets → your bucket → **Access** → **Create S3 Credentials**:
   - Copy `Endpoint` → `STORJ_ENDPOINT`
   - Copy `Access Key` → `STORJ_ACCESS_KEY`
   - Copy `Secret Key` → `STORJ_SECRET_KEY` *(shown once — save it immediately)*
4. **Linksharing grant** (for public download URLs) — **Access Keys** → **Create Access Grant**:
   - Permission: **Download only** · Bucket: `taskflow`
   - Click **Generate** → copy the access grant string → `STORJ_LINK_ACCESS`

**Free tier:** 150 GB storage · 150 GB/month bandwidth · no per-file size limit

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
# Edit backend/.env — set at minimum:
#   DATABASE_URL="file:./dev.db"        ← SQLite for local dev
#   JWT_SECRET="any-local-secret"
#   STORJ_ENDPOINT="https://gateway.storjshare.io"
#   STORJ_ACCESS_KEY="your-access-key"
#   STORJ_SECRET_KEY="your-secret-key"
#   STORJ_BUCKET="taskflow"
#   STORJ_LINK_ACCESS="your-link-access-grant"

# 3. Switch schema to SQLite (local only)
# In backend/prisma/schema.prisma change:
#   provider = "sqlite"

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
| POST | `/api/tasks` | Distributor | Create task + upload materials |
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
