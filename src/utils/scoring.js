const defaults = require('../config/defaults');

/**
 * Calculate the fantasy score for a player on a given matchday.
 * @param {Object} scoreData - PlayerScore document
 * @param {string} role - Player role (P, D, C, A)
 * @param {Object} bonus - Bonus config (Map or plain object)
 * @param {Object} malus - Malus config (Map or plain object)
 * @returns {number|null} Fantasy score or null if player didn't play
 */
function calculatePlayerScore(scoreData, role, bonus, malus) {
  if (!scoreData || !scoreData.played || scoreData.rating == null) {
    return null;
  }

  const b = bonus instanceof Map ? Object.fromEntries(bonus) : (bonus || defaults.BONUS);
  const m = malus instanceof Map ? Object.fromEntries(malus) : (malus || defaults.MALUS);

  let score = scoreData.rating;

  // Bonus
  if (scoreData.goals > 0) {
    const goalKey = `GOAL_${role}`;
    const goalBonus = b[goalKey] || b.GOAL_A || 3;
    score += scoreData.goals * goalBonus;
  }
  score += scoreData.assists * (b.ASSIST || 1);
  score += scoreData.penaltySaved * (b.PENALTY_SAVED || 3);
  if (scoreData.cleanSheet) {
    score += (b.CLEAN_SHEET || 1);
  }

  // Malus
  score -= scoreData.yellowCards * (m.YELLOW_CARD || 0.5);
  if (scoreData.redCard) {
    score -= (m.RED_CARD || 1);
  }
  score -= scoreData.ownGoals * (m.OWN_GOAL || 2);
  score -= scoreData.penaltyMissed * (m.PENALTY_MISSED || 3);
  if (role === 'P') {
    score -= scoreData.goalsConceded * (m.GOAL_CONCEDED || 1);
  }

  return score;
}

/**
 * Convert fantasy points to goals for head-to-head matches.
 * @param {number} points - Total fantasy points
 * @param {number} threshold - Points for first goal (default 66)
 * @param {number} interval - Points per additional goal (default 6)
 * @returns {number} Number of goals
 */
function pointsToGoals(points, threshold, interval) {
  const t = threshold || defaults.GOAL_THRESHOLD;
  const i = interval || defaults.GOAL_INTERVAL;

  if (points < t) return 0;
  return 1 + Math.floor((points - t) / i);
}

module.exports = { calculatePlayerScore, pointsToGoals };
