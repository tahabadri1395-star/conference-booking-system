// server.js
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Create a server/.env file.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const { initDb } = require('./models/db');

const app = express();
const PORT = process.env.PORT || 5001;
const isProd = process.env.NODE_ENV === 'production';

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.removeHeader('X-Powered-By');
  next();
});

// Middleware
const allowedOrigin = isProd ? '*' : (process.env.CORS_ORIGIN || 'http://localhost:5173');
app.use(cors({ origin: allowedOrigin, credentials: !isProd }));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/rooms', require('./routes/rooms'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'MeetingDesk API is running', timestamp: new Date().toISOString() });
});

// Serve React frontend in production
if (isProd) {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.path} not found` });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start HTTP server immediately so Render's health check passes
app.listen(PORT, () => {
  console.log(`\n🚀 MeetingDesk server running on port ${PORT}\n`);
  connectDb();
});

async function connectDb(retries = 6, delayMs = 5000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await initDb();
      console.log('[db] Connected and initialised');
      return;
    } catch (err) {
      console.error(`[db] Attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  console.error('[db] All connection attempts failed — API calls will return 500 until DB is reachable');
}

module.exports = app;
