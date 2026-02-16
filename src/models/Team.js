const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  league: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'League',
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

teamSchema.index({ user: 1, league: 1 }, { unique: true });

module.exports = mongoose.model('Team', teamSchema);
