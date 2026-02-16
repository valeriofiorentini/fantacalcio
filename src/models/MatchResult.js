const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema({
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: true,
  },
  matchday: {
    type: Number,
    required: true,
  },
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  homeScore: { type: Number, default: 0 },  // Fantasy points total
  awayScore: { type: Number, default: 0 },
  homeGoals: { type: Number, default: 0 },   // Converted goals
  awayGoals: { type: Number, default: 0 },
}, { timestamps: true });

matchResultSchema.index({ league: 1, matchday: 1 });

module.exports = mongoose.model('MatchResult', matchResultSchema);
