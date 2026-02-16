// Default configurable rules for a Fantacalcio league
module.exports = {
  // Budget
  DEFAULT_BUDGET: 500,

  // Roster composition
  ROSTER_LIMITS: {
    P: 3,  // Portieri (Goalkeepers)
    D: 8,  // Difensori (Defenders)
    C: 8,  // Centrocampisti (Midfielders)
    A: 6,  // Attaccanti (Forwards)
  },
  ROSTER_TOTAL: 25,

  // Allowed formations [defenders-midfielders-forwards]
  ALLOWED_FORMATIONS: [
    '3-4-3',
    '3-5-2',
    '4-3-3',
    '4-4-2',
    '4-5-1',
    '5-3-2',
    '5-4-1',
  ],

  // Voto base per tutti i giocatori
  BASE_RATING: 6.0,

  // Bonus minutaggio
  MINUTES_THRESHOLD: 60,  // >= 60 minuti = +0.5
  MINUTES_BONUS: 0.5,

  // Bonus gol per ruolo
  BONUS: {
    GOAL_P: 6,    // Gol portiere
    GOAL_D: 6,    // Gol difensore
    GOAL_C: 4,    // Gol centrocampista
    GOAL_A: 3,    // Gol attaccante
    ASSIST: 1,
    PENALTY_SCORED: 3,   // Rigore segnato
    PENALTY_SAVED: 3,    // Rigore parato (portiere)
    CLEAN_SHEET: 1,      // Porta inviolata (portiere, >= 60 min)
  },

  // Malus (valori positivi, vengono sottratti nel calcolo)
  MALUS: {
    YELLOW_CARD: 0.5,
    RED_CARD: 1,
    OWN_GOAL: 2,
    PENALTY_MISSED: 3,
    GOAL_CONCEDED: 1,  // Per portiere
  },

  // Clamp del voto finale
  MIN_SCORE: 3,
  MAX_SCORE: 10,

  // Calcolo risultato partita
  GOAL_THRESHOLD: 66,  // Punti base per 1 gol
  GOAL_INTERVAL: 6,    // Ogni N punti extra = +1 gol

  // Sostituzioni
  MAX_SUBSTITUTIONS: 3,

  // Lega
  MIN_TEAMS: 4,
  MAX_TEAMS: 12,
};
