const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../config/database');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, account_type = 'Standard' } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  const hash   = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password, account_type)
    VALUES (?, ?, ?, ?)
  `).run(name, email, hash, account_type);

  const userId = result.lastInsertRowid;

  // Create default categories for new user
  const defaultCats = [
    { name: 'Housing & Living', icon: '🏠', color: '#4F8EF7', budget_limit: 2000, type: 'expense' },
    { name: 'Groceries',        icon: '🛒', color: '#00d4aa', budget_limit: 500,  type: 'expense' },
    { name: 'Dining & Drinks',  icon: '🍽️', color: '#FF6B6B', budget_limit: 300,  type: 'expense' },
    { name: 'Transport',        icon: '🚗', color: '#3B82F6', budget_limit: 200,  type: 'expense' },
    { name: 'Entertainment',    icon: '🎭', color: '#EC4899', budget_limit: 200,  type: 'expense' },
    { name: 'Shopping',         icon: '🛍️', color: '#F97316', budget_limit: 500,  type: 'expense' },
    { name: 'Income',           icon: '💰', color: '#10B981', budget_limit: 0,    type: 'income'  },
    { name: 'Other',            icon: '📦', color: '#6B7280', budget_limit: 0,    type: 'expense' },
  ];
  const insertCat = db.prepare(`
    INSERT INTO categories (user_id, name, icon, color, budget_limit, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  defaultCats.forEach(c => insertCat.run(userId, c.name, c.icon, c.color, c.budget_limit, c.type));

  const token = jwt.sign({ id: userId, email, name }, JWT_SECRET, { expiresIn: '7d' });
  const user  = db.prepare('SELECT id, name, email, account_type, base_currency, created_at FROM users WHERE id = ?').get(userId);
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, account_type, base_currency, fiscal_year_start, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PUT /api/auth/settings
router.put('/settings', authMiddleware, (req, res) => {
  const { name, base_currency, fiscal_year_start } = req.body;
  db.prepare(`
    UPDATE users SET name = ?, base_currency = ?, fiscal_year_start = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name || req.user.name, base_currency || 'USD', fiscal_year_start || 'January 1st', req.user.id);
  const user = db.prepare('SELECT id, name, email, account_type, base_currency, fiscal_year_start FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// PUT /api/auth/password
router.put('/password', authMiddleware, (req, res) => {
  const { current_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(current_password, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }
  if (new_password.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ message: 'Password updated successfully' });
});

module.exports = router;
