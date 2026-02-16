const defaults = require('../config/defaults');

/**
 * Calcola il fantavoto di un giocatore partendo dagli eventi partita.
 * Nessun voto manuale: tutto calcolato automaticamente.
 *
 * ALGORITMO:
 * 1. Se minutes == 0 → SV (non ha giocato) → return null
 * 2. Voto base = 6.0
 * 3. Se minutes >= 60 → +0.5
 * 4. Gol * bonus per ruolo (P=6, D=6, C=4, A=3)
 * 5. Assist * 1
 * 6. Ammonizione -0.5, Espulsione -1, Autogol -2
 * 7. Portiere: rigori parati *3, gol subiti *-1, porta inviolata (>=60min, 0 gol) +1
 * 8. Rigore segnato +3, Rigore sbagliato -3
 * 9. Clamp tra 3 e 10
 *
 * @param {Object} event - Dati evento partita (PlayerScore document)
 * @param {string} role - Ruolo giocatore (P, D, C, A)
 * @param {Object} [rules] - Regole personalizzate della lega
 * @returns {number|null} Fantavoto calcolato, o null se SV
 */
function calculatePlayerScore(event, role, rules) {
  if (!event || event.minutes === 0 || event.minutes == null) {
    return null; // SV - senza voto
  }

  const r = rules || {};
  const b = r.bonus instanceof Map ? Object.fromEntries(r.bonus) : (r.bonus || defaults.BONUS);
  const m = r.malus instanceof Map ? Object.fromEntries(r.malus) : (r.malus || defaults.MALUS);
  const baseRating = r.baseRating || defaults.BASE_RATING;
  const minutesThreshold = r.minutesThreshold || defaults.MINUTES_THRESHOLD;
  const minutesBonus = r.minutesBonus != null ? r.minutesBonus : defaults.MINUTES_BONUS;
  const minScore = r.minScore != null ? r.minScore : defaults.MIN_SCORE;
  const maxScore = r.maxScore != null ? r.maxScore : defaults.MAX_SCORE;

  // 1. Voto base
  let score = baseRating;

  // 2. Bonus minutaggio
  if (event.minutes >= minutesThreshold) {
    score += minutesBonus;
  }

  // 3. Bonus gol per ruolo
  if (event.goals > 0) {
    const goalKey = `GOAL_${role}`;
    const goalBonus = b[goalKey] || b.GOAL_A || 3;
    score += event.goals * goalBonus;
  }

  // 4. Assist
  score += (event.assists || 0) * (b.ASSIST || 1);

  // 5. Malus disciplinari
  score -= (event.yellowCards || 0) * (m.YELLOW_CARD || 0.5);
  if (event.redCard) {
    score -= (m.RED_CARD || 1);
  }
  score -= (event.ownGoals || 0) * (m.OWN_GOAL || 2);

  // 6. Portiere: rigori parati, gol subiti, porta inviolata
  if (role === 'P') {
    score += (event.penaltySaved || 0) * (b.PENALTY_SAVED || 3);
    score -= (event.goalsConceded || 0) * (m.GOAL_CONCEDED || 1);

    // Porta inviolata: 0 gol subiti e almeno 60 minuti
    if ((event.goalsConceded || 0) === 0 && event.minutes >= minutesThreshold) {
      score += (b.CLEAN_SHEET || 1);
    }
  }

  // 7. Rigori (tutti i ruoli)
  score += (event.penaltiesScored || 0) * (b.PENALTY_SCORED || 3);
  score -= (event.penaltyMissed || 0) * (m.PENALTY_MISSED || 3);

  // 8. Clamp: evita punteggi assurdi
  score = Math.max(minScore, Math.min(maxScore, score));

  return score;
}

/**
 * Converte i fantapunti totali in gol per scontri diretti.
 * @param {number} points - Fantapunti totali della squadra
 * @param {number} [threshold] - Soglia per il primo gol (default 66)
 * @param {number} [interval] - Punti per ogni gol aggiuntivo (default 6)
 * @returns {number} Numero di gol
 */
function pointsToGoals(points, threshold, interval) {
  const t = threshold || defaults.GOAL_THRESHOLD;
  const i = interval || defaults.GOAL_INTERVAL;

  if (points < t) return 0;
  return 1 + Math.floor((points - t) / i);
}

module.exports = { calculatePlayerScore, pointsToGoals };
