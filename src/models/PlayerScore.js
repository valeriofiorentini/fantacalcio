const mongoose = require('mongoose');

// Evento partita - solo dati grezzi, il voto viene calcolato
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
  // Dati grezzi della partita
  minutes: { type: Number, default: 0 },        // Minuti giocati (0 = non entrato)
  goals: { type: Number, default: 0 },
  assists: { type: Number, default: 0 },
  yellowCards: { type: Number, default: 0 },
  redCard: { type: Boolean, default: false },
  ownGoals: { type: Number, default: 0 },
  penaltiesScored: { type: Number, default: 0 }, // Rigori segnati
  penaltyMissed: { type: Number, default: 0 },   // Rigori sbagliati
  penaltySaved: { type: Number, default: 0 },    // Rigori parati (portiere)
  goalsConceded: { type: Number, default: 0 },   // Gol subiti (portiere)
});

playerScoreSchema.index({ player: 1, matchday: 1 }, { unique: true });

module.exports = mongoose.model('PlayerScore', playerScoreSchema);
