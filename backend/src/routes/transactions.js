const express = require('express');
const db      = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/transactions
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 20, type, category_id, status, from, to, search } = req.query;
  const offset = (page - 1) * limit;
  const userId = req.user.id;

  const where  = ['t.user_id = ?'];
  const params = [userId];

  if (type)        { where.push('t.type = ?');        params.push(type); }
  if (category_id) { where.push('t.category_id = ?'); params.push(category_id); }
  if (status)      { where.push('t.status = ?');       params.push(status); }
  if (from)        { where.push('t.date >= ?');         params.push(from); }
  if (to)          { where.push('t.date <= ?');          params.push(to); }
  if (search) {
    where.push('(t.merchant LIKE ? OR t.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = where.join(' AND ');

  // Pass LIMIT/OFFSET as part of the params array (wrapper spreads all args)
  const transactions = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE ${whereClause}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), Number(offset));

  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM transactions t WHERE ${whereClause}
  `).get(...params);

  res.json({
    transactions,
    total: countRow ? countRow.count : 0,
    page:  Number(page),
    limit: Number(limit),
  });
});

// POST /api/transactions
router.post('/', authMiddleware, (req, res) => {
  const { merchant, description, amount, type, category_id, status = 'approved', date, time, tags = [], reference } = req.body;
  if (!merchant || !amount || !type || !date) {
    return res.status(400).json({ error: 'Merchant, amount, type, and date are required' });
  }
  if (!['income', 'expense'].includes(type)) {
    return res.status(400).json({ error: 'Type must be income or expense' });
  }

  const result = db.prepare(`
    INSERT INTO transactions (user_id, category_id, merchant, description, amount, type, status, date, time, tags, reference)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, category_id || null, merchant, description || null,
    Math.abs(amount), type, status, date, time || null,
    JSON.stringify(tags), reference || null
  );

  const tx = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(tx);
});

// PUT /api/transactions/:id
router.put('/:id', authMiddleware, (req, res) => {
  const { merchant, description, amount, type, category_id, status, date, time, tags } = req.body;
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });

  db.prepare(`
    UPDATE transactions
    SET merchant = ?, description = ?, amount = ?, type = ?, category_id = ?, status = ?, date = ?, time = ?, tags = ?
    WHERE id = ? AND user_id = ?
  `).run(
    merchant    || tx.merchant,
    description || tx.description,
    Math.abs(amount || tx.amount),
    type        || tx.type,
    category_id !== undefined ? category_id : tx.category_id,
    status      || tx.status,
    date        || tx.date,
    time        || tx.time,
    JSON.stringify(tags || JSON.parse(tx.tags || '[]')),
    req.params.id,
    req.user.id
  );

  const updated = db.prepare(`
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
    FROM transactions t LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

// DELETE /api/transactions/:id
router.delete('/:id', authMiddleware, (req, res) => {
  const result = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ message: 'Transaction deleted' });
});

module.exports = router;
