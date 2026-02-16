const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const leagueRoutes = require('./routes/leagues');
const auctionRoutes = require('./routes/auction');
const lineupRoutes = require('./routes/lineups');
const scoreRoutes = require('./routes/scores');
const playerRoutes = require('./routes/players');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/auction', auctionRoutes);
app.use('/api/lineups', lineupRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/players', playerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = app;
