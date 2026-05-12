require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const { dbReady } = require('./config/database');

const app  = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (can respond before DB is ready)
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Wait for database to initialise before mounting routes and listening
dbReady.then(() => {
  const authRoutes        = require('./routes/auth');
  const transactionRoutes = require('./routes/transactions');
  const analyticsRoutes   = require('./routes/analytics');
  const categoryRoutes    = require('./routes/categories');

  app.use('/api/auth',         authRoutes);
  app.use('/api/transactions', transactionRoutes);
  app.use('/api/analytics',    analyticsRoutes);
  app.use('/api/categories',   categoryRoutes);

  // 404 handler
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 FinCorp Elite API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Failed to initialise database:', err);
  process.exit(1);
});

module.exports = app;
