const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  role: {
    type: String,
    required: true,
    enum: ['P', 'D', 'C', 'A'], // Portiere, Difensore, Centrocampista, Attaccante
  },
  realTeam: {
    type: String,
    trim: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
});

playerSchema.index({ name: 1, realTeam: 1 });

module.exports = mongoose.model('Player', playerSchema);
