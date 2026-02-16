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

  // Bonus points
  BONUS: {
    GOAL_A: 3,    // Gol attaccante
    GOAL_C: 4,    // Gol centrocampista
    GOAL_D: 6,    // Gol difensore
    ASSIST: 1,    // Assist
    PENALTY_SAVED: 3,   // Rigore parato
    CLEAN_SHEET: 1,     // Porta inviolata
  },

  // Malus points (stored as positive, subtracted in calculation)
  MALUS: {
    YELLOW_CARD: 0.5,
    RED_CARD: 1,
    OWN_GOAL: 2,
    PENALTY_MISSED: 3,
    GOAL_CONCEDED: 1,  // Per portiere
  },

  // Match result calculation
  GOAL_THRESHOLD: 66,  // Base points for 1 goal
  GOAL_INTERVAL: 6,    // Every N extra points = +1 goal

  // Substitutions
  MAX_SUBSTITUTIONS: 3,

  // League
  MIN_TEAMS: 4,
  MAX_TEAMS: 12,
};
