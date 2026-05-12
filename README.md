# FinCorp Elite — Expense Management System

A full-stack wealth management and expense tracking application with real-time analytics, multi-user authentication, and a premium dark-themed UI.

---

## 📁 Repository Structure

Every file listed below is exactly what you'll find inside the zip:

```
expense-manager/                         ← project root
│
├── README.md                            ← this file
├── package.json                         ← root convenience scripts
│
├── backend/                             ← Node.js · Express · SQLite
│   ├── .env                             ← PORT + JWT_SECRET (edit before deploy)
│   ├── .env.example                     ← safe template to commit
│   ├── package.json                     ← backend dependencies
│   └── src/
│       ├── server.js                    ← Express entry point, mounts all routes
│       ├── config/
│       │   └── database.js              ← opens SQLite, creates tables, seeds demo data
│       ├── middleware/
│       │   └── auth.js                  ← JWT Bearer token verification
│       └── routes/
│           ├── auth.js                  ← /login  /register  /me  /settings  /password
│           ├── transactions.js          ← GET / POST / PUT / DELETE  /transactions
│           ├── analytics.js             ← overview, trends, categories, budgets, goals, calendar
│           └── categories.js            ← GET / POST / PUT / DELETE  /categories
│
└── frontend/                            ← React 18 · Vite · Recharts
    ├── package.json                     ← frontend dependencies
    ├── vite.config.js                   ← dev server + /api proxy → localhost:5000
    ├── public/
    │   └── index.html                   ← HTML shell (Google Fonts: Syne + DM Sans)
    └── src/
        ├── main.jsx                     ← ReactDOM.createRoot entry
        ├── App.jsx                      ← BrowserRouter, auth guard, layout wrapper
        ├── styles/
        │   └── globals.css              ← CSS variables, keyframes, scrollbar, toasts
        ├── services/
        │   └── api.js                   ← Axios instance + every API helper function
        ├── context/
        │   └── AuthContext.jsx          ← global auth state (login / register / logout)
        ├── hooks/
        │   └── useToast.js              ← lightweight toast queue hook
        ├── components/
        │   ├── Toast.jsx                ← renders toast stack in top-right corner
        │   ├── Auth/
        │   │   └── AuthPage.jsx         ← two-panel Login + Register screen
        │   └── Layout/
        │       ├── Sidebar.jsx          ← left nav with active-link highlight + logout
        │       └── Header.jsx           ← top search bar + notification bell
        └── pages/
            ├── Dashboard.jsx            ← balance card, bar chart, transactions, budgets
            ├── History.jsx              ← filterable transaction list + Add Expense modal
            ├── Trends.jsx               ← KPI cards, line chart, donut, top merchants
            ├── Calendar.jsx             ← monthly calendar, day detail, velocity chart
            └── Settings.jsx             ← profile, password change, categories, theme
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **npm** v9+

### 1. Clone / download and enter the project
```bash
cd expense-manager
```

### 2. Install all dependencies
```bash
# Install backend deps
cd backend && npm install && cd ..

# Install frontend deps
cd frontend && npm install && cd ..
```

### 3. Configure backend environment
The `.env` file is already included with defaults. To customize:
```bash
# backend/.env
PORT=5000
JWT_SECRET=your_custom_secret_here   # Change in production!
NODE_ENV=development
```

### 4. Start the backend
```bash
cd backend
npm run dev          # Uses nodemon for hot-reload
# OR
npm start            # Plain node
```
The API runs on **http://localhost:5000**

On first start, the database is created automatically at `backend/data/expense_manager.db` with:
- A demo user: **alex@fincorp.com** / **demo1234**
- Sample transactions for the last 6 months
- Pre-configured categories and budgets

### 5. Start the frontend (new terminal)
```bash
cd frontend
npm run dev
```
The app runs on **http://localhost:5173**

Vite proxies all `/api/*` requests to the backend automatically — no CORS issues.

---

## 🔐 Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (auth required) |
| PUT | `/api/auth/settings` | Update profile (auth required) |
| PUT | `/api/auth/password` | Change password (auth required) |

JWT token is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every request.

---

## 📊 API Reference

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List with pagination + filters |
| POST | `/api/transactions` | Create new transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |

Query params for GET: `page`, `limit`, `type`, `category_id`, `status`, `from`, `to`, `search`

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Balance, monthly stats, MoM change |
| GET | `/api/analytics/monthly-trends` | Last 6 months expenses + income |
| GET | `/api/analytics/category-distribution` | Spending breakdown by category |
| GET | `/api/analytics/budgets` | Budget usage per category |
| GET | `/api/analytics/spending-velocity` | Daily spend for last 30 days |
| GET | `/api/analytics/goals` | Savings goals list |
| POST | `/api/analytics/goals` | Create new goal |
| GET | `/api/analytics/calendar/:year/:month` | Daily totals for calendar view |
| GET | `/api/analytics/top-merchants` | Top spending merchants |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all user categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

---

## 🗄️ Database Schema

**users** — id, name, email, password (bcrypt), account_type, base_currency, fiscal_year_start

**transactions** — id, user_id, category_id, merchant, description, amount, type (income/expense), status (approved/pending/rejected), date, time, tags, reference

**categories** — id, user_id, name, icon, color, budget_limit, type

**budgets** — id, user_id, category_id, name, amount, spent, period

**goals** — id, user_id, name, description, target_amount, current_amount, deadline

All user data is fully isolated — each user only sees their own records.

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Charts | Recharts |
| HTTP Client | Axios |
| Backend | Node.js + Express |
| Database | SQLite via better-sqlite3 |
| Auth | JWT + bcrypt |
| Fonts | Syne (display) + DM Sans (body) |

---

## 🌐 Deployment Tips

### Production build
```bash
cd frontend && npm run build
# Outputs to frontend/dist/
```

Then serve `frontend/dist` as static files from your backend:
```js
// In backend/src/server.js, add:
const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')));
```

### Environment variables for production
```
PORT=5000
JWT_SECRET=<strong-random-secret>
NODE_ENV=production
```

---

## 📝 Demo Account
- **Email:** alex@fincorp.com
- **Password:** demo1234

Or register a new account — default categories are created automatically.
