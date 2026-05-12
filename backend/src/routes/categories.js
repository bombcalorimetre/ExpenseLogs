const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories
router.get('/', authMiddleware, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name').all(req.user.id);
  res.json(categories);
});

// POST /api/categories
router.post('/', authMiddleware, (req, res) => {
  const { name, icon = '📦', color = '#6B7280', budget_limit = 0, type = 'expense' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const result = db.prepare(`
    INSERT INTO categories (user_id, name, icon, color, budget_limit, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, icon, color, budget_limit, type);
  res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(result.lastInsertRowid));
});

// PUT /api/categories/:id
router.put('/:id', authMiddleware, (req, res) => {
  const { name, icon, color, budget_limit } = req.body;
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  db.prepare(`
    UPDATE categories SET name = ?, icon = ?, color = ?, budget_limit = ? WHERE id = ?
  `).run(name || cat.name, icon || cat.icon, color || cat.color, budget_limit !== undefined ? budget_limit : cat.budget_limit, req.params.id);
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

// DELETE /api/categories/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });
  res.json({ message: 'Category deleted' });
});

module.exports = router;
