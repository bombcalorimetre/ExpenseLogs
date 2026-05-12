const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/overview
router.get('/overview', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);

  // Total balance (all-time income - expenses)
  const balanceRow = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as balance
    FROM transactions WHERE user_id = ?
  `).get(userId);

  // Current month stats
  const currentStats = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
      COUNT(*) as transaction_count
    FROM transactions WHERE user_id = ? AND strftime('%Y-%m', date) = ?
  `).get(userId, currentMonth);

  // Last month stats
  const lastStats = db.prepare(`
    SELECT
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expense,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income
    FROM transactions WHERE user_id = ? AND strftime('%Y-%m', date) = ?
  `).get(userId, lastMonth);

  // Pending transactions
  const pending = db.prepare(`
    SELECT COUNT(*) as count, SUM(amount) as total
    FROM transactions WHERE user_id = ? AND status = 'pending'
  `).get(userId);

  // Month over month change
  const momChange = lastStats.total_expense > 0
    ? ((currentStats.total_expense - lastStats.total_expense) / lastStats.total_expense * 100).toFixed(1)
    : 0;

  res.json({
    total_balance: balanceRow.balance || 0,
    current_month: {
      total_expense: currentStats.total_expense || 0,
      total_income: currentStats.total_income || 0,
      transaction_count: currentStats.transaction_count || 0,
    },
    last_month: {
      total_expense: lastStats.total_expense || 0,
      total_income: lastStats.total_income || 0,
    },
    mom_change: Number(momChange),
    pending_transactions: {
      count: pending.count || 0,
      total: pending.total || 0,
    },
  });
});

// GET /api/analytics/monthly-trends (last 6 months)
router.get('/monthly-trends', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const data = months.map(month => {
    const row = db.prepare(`
      SELECT
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income
      FROM transactions WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    `).get(userId, month);

    const label = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return {
      month,
      label,
      expenses: row.expenses || 0,
      income: row.income || 0,
      net: (row.income || 0) - (row.expenses || 0),
    };
  });

  res.json(data);
});

// GET /api/analytics/category-distribution
router.get('/category-distribution', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { month } = req.query;
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const data = db.prepare(`
    SELECT c.name, c.icon, c.color, c.type,
      SUM(t.amount) as total,
      COUNT(t.id) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? AND strftime('%Y-%m', t.date) = ? AND t.type = 'expense'
    GROUP BY c.id
    ORDER BY total DESC
  `).all(userId, targetMonth);

  const grandTotal = data.reduce((s, r) => s + r.total, 0);
  const result = data.map(r => ({
    ...r,
    percentage: grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : 0,
  }));

  res.json({ categories: result, total: grandTotal });
});

// GET /api/analytics/budgets
router.get('/budgets', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const currentMonth = new Date().toISOString().slice(0, 7);

  const budgets = db.prepare(`
    SELECT c.name, c.icon, c.color, c.budget_limit,
      COALESCE(SUM(t.amount), 0) as spent
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.user_id = c.user_id
      AND t.type = 'expense'
      AND strftime('%Y-%m', t.date) = ?
    WHERE c.user_id = ? AND c.budget_limit > 0
    GROUP BY c.id
    ORDER BY (COALESCE(SUM(t.amount), 0) / c.budget_limit) DESC
  `).all(currentMonth, userId);

  res.json(budgets.map(b => ({
    ...b,
    percentage: b.budget_limit > 0 ? Math.min(100, (b.spent / b.budget_limit * 100)).toFixed(0) : 0,
    is_near_limit: b.spent / b.budget_limit >= 0.85,
    is_over: b.spent > b.budget_limit,
  })));
});

// GET /api/analytics/spending-velocity
router.get('/spending-velocity', authMiddleware, (req, res) => {
  const userId = req.user.id;
  // Daily spend for last 30 days
  const data = db.prepare(`
    SELECT date, SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as spent
    FROM transactions
    WHERE user_id = ?
      AND date >= date('now', '-30 days')
    GROUP BY date
    ORDER BY date ASC
  `).all(userId);
  res.json(data);
});

// GET /api/analytics/goals
router.get('/goals', authMiddleware, (req, res) => {
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(goals);
});

// POST /api/analytics/goals
router.post('/goals', authMiddleware, (req, res) => {
  const { name, description, target_amount, current_amount = 0, deadline } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'Name and target_amount required' });
  const result = db.prepare(`
    INSERT INTO goals (user_id, name, description, target_amount, current_amount, deadline)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, description, target_amount, current_amount, deadline || null);
  res.status(201).json(db.prepare('SELECT * FROM goals WHERE id = ?').get(result.lastInsertRowid));
});

// GET /api/analytics/calendar/:year/:month
router.get('/calendar/:year/:month', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { year, month } = req.params;
  const monthStr = `${year}-${month.padStart(2, '0')}`;

  const daily = db.prepare(`
    SELECT date,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expenses,
      SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
      COUNT(*) as count
    FROM transactions
    WHERE user_id = ? AND strftime('%Y-%m', date) = ?
    GROUP BY date
    ORDER BY date
  `).all(userId, monthStr);

  res.json(daily);
});

// GET /api/analytics/top-merchants
router.get('/top-merchants', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { limit = 5 } = req.query;
  const data = db.prepare(`
    SELECT merchant, SUM(amount) as total, COUNT(*) as count
    FROM transactions
    WHERE user_id = ? AND type = 'expense'
      AND date >= date('now', '-30 days')
    GROUP BY merchant
    ORDER BY total DESC
    LIMIT ?
  `).all(userId, Number(limit));
  res.json(data);
});

module.exports = router;
