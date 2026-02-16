const mongoose = require('mongoose');

const rosterEntrySchema = new mongoose.Schema({
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 1,
  },
}, { timestamps: true });

rosterEntrySchema.index({ team: 1, player: 1 }, { unique: true });

module.exports = mongoose.model('RosterEntry', rosterEntrySchema);
