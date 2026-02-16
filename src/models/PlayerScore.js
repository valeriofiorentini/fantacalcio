const mongoose = require('mongoose');

const playerScoreSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  matchday: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,  // Voto base (e.g. 6.5)
    default: null,
  },
  played: {
    type: Boolean,
    default: false,
  },
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  yellowCards: { type: Number, default: 0 },
  redCard: { type: Boolean, default: false },
  ownGoals: { type: Number, default: 0 },
  penaltySaved: { type: Number, default: 0 },
  penaltyMissed: { type: Number, default: 0 },
  goalsConceded: { type: Number, default: 0 },  // For goalkeepers
  cleanSheet: { type: Boolean, default: false },
});

playerScoreSchema.index({ player: 1, matchday: 1 }, { unique: true });

module.exports = mongoose.model('PlayerScore', playerScoreSchema);
