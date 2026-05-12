# FinCorp Elite — Expense Management System

A full-stack wealth management and expense tracking application with real-time analytics, multi-user authentication, and a premium dark-themed UI.

---

## 📁 Repository Structure

```
expense-manager/
│
├── package.json                    ← Root scripts (run both servers)
│
├── backend/                        ← Node.js + Express + SQLite API
│   ├── .env                        ← Environment variables (PORT, JWT_SECRET)
│   ├── .env.example                ← Template for env vars
│   ├── package.json
│   ├── data/                       ← Auto-created; holds the SQLite database file
│   │   └── expense_manager.db      ← SQLite DB (auto-generated on first run)
│   └── src/
│       ├── server.js               ← Express app entry point
│       ├── config/
│       │   └── database.js         ← SQLite init, schema creation, seed data
│       ├── middleware/
│       │   └── auth.js             ← JWT verification middleware
│       └── routes/
│           ├── auth.js             ← POST /login, /register, GET /me, PUT /settings
│           ├── transactions.js     ← CRUD for transactions
│           ├── analytics.js        ← Dashboard stats, charts, budgets, goals
│           └── categories.js       ← CRUD for spending categories
│
└── frontend/                       ← React + Vite SPA
    ├── package.json
    ├── vite.config.js              ← Dev server with /api proxy to backend
    ├── public/
    │   └── index.html              ← HTML shell with Google Fonts
    └── src/
        ├── main.jsx                ← React root mount
        ├── App.jsx                 ← Router, auth guards, layout shell
        ├── styles/
        │   └── globals.css         ← CSS variables, animations, scrollbar, toast
        ├── services/
        │   └── api.js              ← Axios instance + all API call functions
        ├── context/
        │   └── AuthContext.jsx     ← Auth state, login/register/logout helpers
        ├── hooks/
        │   └── useToast.js         ← Toast notification hook
        ├── components/
        │   ├── Toast.jsx           ← Toast notification renderer
        │   ├── Auth/
        │   │   └── AuthPage.jsx    ← Login + Register page (two-panel layout)
        │   └── Layout/
        │       ├── Sidebar.jsx     ← Navigation sidebar with user card + logout
        │       └── Header.jsx      ← Top bar with search and notification bell
        └── pages/
            ├── Dashboard.jsx       ← Balance, recent transactions, spend chart, budgets
            ├── History.jsx         ← Full transaction list, filters, Add Expense modal
            ├── Trends.jsx          ← Analytics: KPIs, line chart, donut, top merchants
            ├── Calendar.jsx        ← Monthly calendar, day detail, spending velocity
            └── Settings.jsx        ← Profile, password, categories, appearance
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
