const mongoose = require('mongoose');

const lineupSchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  matchday: {
    type: Number,
    required: true,
  },
  formation: {
    type: String,
    required: true,  // e.g. '3-4-3'
  },
  starters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
  }],
  bench: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
  }],
}, { timestamps: true });

lineupSchema.index({ team: 1, matchday: 1 }, { unique: true });

module.exports = mongoose.model('Lineup', lineupSchema);
