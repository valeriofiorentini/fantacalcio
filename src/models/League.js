const mongoose = require('mongoose');
const defaults = require('../config/defaults');

const leagueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  inviteCode: {
    type: String,
    unique: true,
  },
  maxTeams: {
    type: Number,
    default: defaults.MAX_TEAMS,
    min: defaults.MIN_TEAMS,
    max: defaults.MAX_TEAMS,
  },
  budget: {
    type: Number,
    default: defaults.DEFAULT_BUDGET,
  },
  status: {
    type: String,
    enum: ['draft', 'auction', 'active', 'finished'],
    default: 'draft',
  },
  currentMatchday: {
    type: Number,
    default: 0,
  },
  // Configurable rules override
  rules: {
    rosterLimits: {
      type: Map,
      of: Number,
      default: () => new Map(Object.entries(defaults.ROSTER_LIMITS)),
    },
    allowedFormations: {
      type: [String],
      default: defaults.ALLOWED_FORMATIONS,
    },
    bonus: {
      type: Map,
      of: Number,
      default: () => new Map(Object.entries(defaults.BONUS)),
    },
    malus: {
      type: Map,
      of: Number,
      default: () => new Map(Object.entries(defaults.MALUS)),
    },
    goalThreshold: {
      type: Number,
      default: defaults.GOAL_THRESHOLD,
    },
    goalInterval: {
      type: Number,
      default: defaults.GOAL_INTERVAL,
    },
    maxSubstitutions: {
      type: Number,
      default: defaults.MAX_SUBSTITUTIONS,
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('League', leagueSchema);
