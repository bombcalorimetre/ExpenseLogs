'use strict';

/**
 * database.js
 *
 * Initialises the sql.js database and exports a `db` proxy that routes all
 * better-sqlite3-style calls (.prepare, .exec, .pragma) through the wrapper.
 *
 * Because sql.js init is async, we export a Promise (`dbReady`) that resolves
 * to the db instance.  server.js awaits this before starting Express so every
 * route module that does `const db = require('../config/database')` receives
 * the resolved, ready-to-use Database object via the module-level `db` export.
 *
 * Pattern used:
 *   - server.js:  await require('./config/database').dbReady;
 *   - routes:     const db = require('../config/database');  // use db.prepare(…)
 */

const path      = require('path');
const bcrypt    = require('bcryptjs');
const { initDatabase } = require('./sqljs-wrapper');

const DB_PATH = path.join(__dirname, '../../data/expense_manager.db');

// `db` starts as null; gets assigned inside initDb() before any route fires.
let db = null;

// ─── schema + seed ───────────────────────────────────────────────────────────

function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT DEFAULT NULL,
      account_type TEXT DEFAULT 'Standard',
      base_currency TEXT DEFAULT 'USD',
      fiscal_year_start TEXT DEFAULT 'January 1st',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '💳',
      color TEXT DEFAULT '#00d4aa',
      budget_limit REAL DEFAULT 0,
      type TEXT DEFAULT 'expense',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      merchant TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      status TEXT DEFAULT 'approved' CHECK(status IN ('approved', 'pending', 'rejected')),
      date DATE NOT NULL,
      time TEXT,
      receipt_url TEXT,
      tags TEXT DEFAULT '[]',
      reference TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Budgets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      spent REAL DEFAULT 0,
      period TEXT DEFAULT 'monthly',
      start_date DATE,
      end_date DATE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0,
      deadline DATE,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // ─── Seed demo user ────────────────────────────────────────────────────────
  const demoUser = db.prepare('SELECT id FROM users WHERE email = ?').get('alex@fincorp.com');
  if (!demoUser) {
    const hash = bcrypt.hashSync('demo1234', 10);
    const result = db.prepare(`
      INSERT INTO users (name, email, password, account_type, base_currency)
      VALUES (?, ?, ?, ?, ?)
    `).run('Alex Sterling', 'alex@fincorp.com', hash, 'Premium Account', 'USD');

    const userId = result.lastInsertRowid;

    // Seed categories
    const categories = [
      { name: 'Housing & Living',  icon: '🏠', color: '#4F8EF7', budget_limit: 4500,  type: 'expense' },
      { name: 'Groceries',         icon: '🛒', color: '#00d4aa', budget_limit: 800,   type: 'expense' },
      { name: 'Dining & Drinks',   icon: '🍽️', color: '#FF6B6B', budget_limit: 600,   type: 'expense' },
      { name: 'Business Travel',   icon: '✈️', color: '#A78BFA', budget_limit: 5000,  type: 'expense' },
      { name: 'Luxury Travel',     icon: '🌍', color: '#F59E0B', budget_limit: 8000,  type: 'expense' },
      { name: 'Entertainment',     icon: '🎭', color: '#EC4899', budget_limit: 600,   type: 'expense' },
      { name: 'Investments',       icon: '📈', color: '#10B981', budget_limit: 0,     type: 'income'  },
      { name: 'Operations',        icon: '⚙️', color: '#6B7280', budget_limit: 10000, type: 'expense' },
      { name: 'Shopping',          icon: '🛍️', color: '#F97316', budget_limit: 2000,  type: 'expense' },
      { name: 'Transport',         icon: '🚗', color: '#3B82F6', budget_limit: 500,   type: 'expense' },
    ];

    const insertCategory = db.prepare(`
      INSERT INTO categories (user_id, name, icon, color, budget_limit, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const catIds = {};
    categories.forEach(cat => {
      const r = insertCategory.run(userId, cat.name, cat.icon, cat.color, cat.budget_limit, cat.type);
      catIds[cat.name] = r.lastInsertRowid;
    });

    // Seed transactions (last 6 months of data)
    const insertTx = db.prepare(`
      INSERT INTO transactions (user_id, category_id, merchant, description, amount, type, status, date, time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleTransactions = [
      // Oct 2023
      { cat: 'Shopping',         merchant: 'Apple Store Soho',         desc: 'Electronics',               amount: 1299.00,  type: 'expense', status: 'approved', date: '2023-10-24', time: '14:30' },
      { cat: 'Investments',      merchant: 'Monthly Dividends',         desc: 'Asset Yield Q3',             amount: 4500.20,  type: 'income',  status: 'approved', date: '2023-10-22', time: '09:00' },
      { cat: 'Dining & Drinks',  merchant: 'The Capital Grille',        desc: 'Client Dinner',              amount: 342.15,   type: 'expense', status: 'approved', date: '2023-10-21', time: '20:15' },
      { cat: 'Business Travel',  merchant: 'Delta Airlines',            desc: 'NYC to London',              amount: 850.00,   type: 'expense', status: 'approved', date: '2023-10-20', time: '11:00' },
      { cat: 'Business Travel',  merchant: 'Emirates Airlines',         desc: 'Dubai Terminal 3 • Ref: EM-4920', amount: 3450.00, type: 'expense', status: 'approved', date: '2023-10-24', time: '08:00' },
      { cat: 'Entertainment',    merchant: 'The Alchemist Bar',         desc: 'Corporate Luncheon • London', amount: 184.20, type: 'expense', status: 'pending',  date: '2023-10-24', time: '13:30' },
      { cat: 'Investments',      merchant: 'Goldman Sachs Dividend',    desc: 'Asset Yield • Q3 Portfolio', amount: 12000.00, type: 'income',  status: 'approved', date: '2023-10-23', time: '09:00' },
      { cat: 'Operations',       merchant: 'Central Plaza Management',  desc: 'Office Rent • London HQ',    amount: 8500.00,  type: 'expense', status: 'approved', date: '2023-10-23', time: '10:00' },
      { cat: 'Dining & Drinks',  merchant: 'Gourmet Bistro',            desc: 'Business Lunch',             amount: 82.50,    type: 'expense', status: 'approved', date: '2023-10-04', time: '12:30' },
      { cat: 'Groceries',        merchant: 'Whole Foods',               desc: 'Weekly Groceries',           amount: 42.00,    type: 'expense', status: 'approved', date: '2023-10-04', time: '16:15' },
      { cat: 'Housing & Living', merchant: 'Metropolitan Estates',      desc: 'Rent & Maintenance',         amount: 4200.00,  type: 'expense', status: 'approved', date: '2023-10-01', time: '09:00' },
      // Sep 2023
      { cat: 'Business Travel',  merchant: 'Emirates Airlines',         desc: 'Business Class Return',      amount: 2840.50,  type: 'expense', status: 'approved', date: '2023-09-28', time: '14:00' },
      { cat: 'Entertainment',    merchant: 'Nobu Restaurant Group',     desc: 'Client Entertainment',       amount: 1120.00,  type: 'expense', status: 'approved', date: '2023-09-25', time: '19:30' },
      { cat: 'Housing & Living', merchant: 'Metropolitan Estates',      desc: 'Monthly Rent',               amount: 4200.00,  type: 'expense', status: 'approved', date: '2023-09-01', time: '09:00' },
      { cat: 'Investments',      merchant: 'Vanguard Portfolio',        desc: 'Q3 Returns',                 amount: 6800.00,  type: 'income',  status: 'approved', date: '2023-09-15', time: '09:00' },
      { cat: 'Shopping',         merchant: 'Harrods',                   desc: 'Luxury Purchase',            amount: 2300.00,  type: 'expense', status: 'approved', date: '2023-09-10', time: '15:00' },
      // Aug 2023
      { cat: 'Housing & Living', merchant: 'Metropolitan Estates',      desc: 'Monthly Rent',               amount: 4200.00,  type: 'expense', status: 'approved', date: '2023-08-01', time: '09:00' },
      { cat: 'Business Travel',  merchant: 'Marriott Hotels',           desc: 'NYC Conference Stay',         amount: 1890.00,  type: 'expense', status: 'approved', date: '2023-08-14', time: '14:00' },
      { cat: 'Investments',      merchant: 'Dividend Income',           desc: 'Quarterly Payout',           amount: 5200.00,  type: 'income',  status: 'approved', date: '2023-08-20', time: '09:00' },
      { cat: 'Dining & Drinks',  merchant: 'Per Se Restaurant',         desc: 'Anniversary Dinner',         amount: 480.00,   type: 'expense', status: 'approved', date: '2023-08-25', time: '19:00' },
      // Jul 2023
      { cat: 'Housing & Living', merchant: 'Metropolitan Estates',      desc: 'Monthly Rent',               amount: 4200.00,  type: 'expense', status: 'approved', date: '2023-07-01', time: '09:00' },
      { cat: 'Luxury Travel',    merchant: 'Four Seasons Resort',       desc: 'Summer Vacation',            amount: 6500.00,  type: 'expense', status: 'approved', date: '2023-07-15', time: '14:00' },
      { cat: 'Operations',       merchant: 'AWS Cloud Services',        desc: 'Monthly Subscription',       amount: 1240.00,  type: 'expense', status: 'approved', date: '2023-07-05', time: '00:00' },
      // Jun 2023
      { cat: 'Housing & Living', merchant: 'Metropolitan Estates',      desc: 'Monthly Rent',               amount: 4200.00,  type: 'expense', status: 'approved', date: '2023-06-01', time: '09:00' },
      { cat: 'Investments',      merchant: 'BlackRock ETF',             desc: 'Portfolio Growth',           amount: 8900.00,  type: 'income',  status: 'approved', date: '2023-06-30', time: '09:00' },
      // May 2023
      { cat: 'Housing & Living', merchant: 'Metropolitan Estates',      desc: 'Monthly Rent',               amount: 4200.00,  type: 'expense', status: 'approved', date: '2023-05-01', time: '09:00' },
      { cat: 'Business Travel',  merchant: 'Singapore Airlines',        desc: 'Asia Trip',                  amount: 3200.00,  type: 'expense', status: 'approved', date: '2023-05-20', time: '10:00' },
    ];

    sampleTransactions.forEach(tx => {
      const catId = catIds[tx.cat] || null;
      insertTx.run(userId, catId, tx.merchant, tx.desc, tx.amount, tx.type, tx.status, tx.date, tx.time);
    });

    // Seed budgets
    const insertBudget = db.prepare(`
      INSERT INTO budgets (user_id, category_id, name, amount, spent)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertBudget.run(userId, catIds['Housing & Living'], 'Housing Budget',     4500, 3200);
    insertBudget.run(userId, catIds['Groceries'],        'Groceries Budget',    800,  740);
    insertBudget.run(userId, catIds['Entertainment'],    'Entertainment Budget', 600,  120);

    // Seed goals
    const insertGoal = db.prepare(`
      INSERT INTO goals (user_id, name, description, target_amount, current_amount, deadline)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertGoal.run(userId, "European Summer '24", 'Saving for an unforgettable experience across Italy and France.', 12000, 4820, '2024-06-01');
    insertGoal.run(userId, 'Emergency Fund',       'Building a 6-month safety net.', 50000, 32000, '2024-12-31');
  }

  console.log('✅ Database initialized successfully');
}

// ─── async init ──────────────────────────────────────────────────────────────

const dbReady = (async () => {
  db = await initDatabase(DB_PATH);
  initializeDatabase();
  return db;
})();

// ─── exports ──────────────────────────────────────────────────────────────────

/**
 * Export `dbReady` so server.js can await startup,
 * and export `db` as a Proxy so that route files that do
 *   const db = require('../config/database');
 * can call db.prepare(…) etc. immediately after `dbReady` resolves.
 */
module.exports = new Proxy(
  { dbReady },
  {
    get(target, prop) {
      if (prop === 'dbReady') return target.dbReady;
      if (!db) throw new Error('Database not yet initialised — await dbReady first');
      return typeof db[prop] === 'function' ? db[prop].bind(db) : db[prop];
    },
  }
);
