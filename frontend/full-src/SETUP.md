# FinCorp Elite — Setup Guide

## Prerequisites
- Node.js (any version — no native compilation needed now)
- Two terminal windows

---

## Step 1 — Project structure
Make sure your project looks like this:

```
ExpenseLogs/
├── backend/          ← the backend-sqljs folder you got earlier
├── frontend/         ← your existing frontend folder
└── package.json
```

---

## Step 2 — Replace frontend/src

Extract the `src` folder from this zip and replace `frontend/src` with it entirely:

```bash
# From your project root:
rm -rf frontend/src
cp -r path/to/extracted/src frontend/src
```

---

## Step 3 — Install dependencies

**Terminal 1 — Backend:**
```bash
cd backend
npm install
```
This should complete in seconds (no compilation).

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
```

---

## Step 4 — Run both servers

**Terminal 1 — Backend (port 5000):**
```bash
cd backend
npm run dev
```
You should see:
```
✅ Database initialized successfully
🚀 FinCorp Elite API running on http://localhost:5000
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend
npm run dev
```
You should see:
```
  VITE v5.x  ready in Xms
  ➜  Local:   http://localhost:5173/
```

---

## Step 5 — Open in browser

Go to: **http://localhost:5173**

Demo login:
- Email: `alex@fincorp.com`
- Password: `demo1234`

---

## Troubleshooting

**Blank page / module errors:**  
Make sure you replaced the ENTIRE `frontend/src` folder, not just the `pages` subfolder.

**Backend 500 errors:**  
Delete `backend/data/expense_manager.db` and restart — the database will reseed.

**Port already in use:**  
Kill whatever is on port 5000: `fuser -k 5000/tcp`
