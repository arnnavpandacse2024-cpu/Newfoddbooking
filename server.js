const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ─── ROUTES ───────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/menu',          require('./routes/menu'));
app.use('/api/food-bookings', require('./routes/foodBookings'));
app.use('/api/hall-bookings', require('./routes/hallBookings'));
app.use('/api/settings',      require('./routes/settings'));

// ─── HEALTH CHECK ─────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '🍽️ Bhaiya Restaurant API is running!' });
});

// ─── FALLBACK: serve frontend for any non-API route ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── ERROR HANDLER ────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
