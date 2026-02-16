const { calculatePlayerScore, pointsToGoals } = require('../src/utils/scoring');
const defaults = require('../src/config/defaults');

describe('calculatePlayerScore', () => {
  const bonus = defaults.BONUS;
  const malus = defaults.MALUS;

  test('returns null if player did not play', () => {
    expect(calculatePlayerScore(null, 'A', bonus, malus)).toBeNull();
    expect(calculatePlayerScore({ played: false, rating: null }, 'A', bonus, malus)).toBeNull();
  });

  test('returns base rating for a clean game', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 6, goals: 0, assists: 0, yellowCards: 0, redCard: false, ownGoals: 0, penaltySaved: 0, penaltyMissed: 0, goalsConceded: 0, cleanSheet: false },
      'C', bonus, malus,
    );
    expect(score).toBe(6);
  });

  test('applies forward goal bonus correctly', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 7, goals: 2, assists: 0, yellowCards: 0, redCard: false, ownGoals: 0, penaltySaved: 0, penaltyMissed: 0, goalsConceded: 0, cleanSheet: false },
      'A', bonus, malus,
    );
    expect(score).toBe(7 + 2 * 3); // 13
  });

  test('applies midfielder goal bonus correctly', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 6.5, goals: 1, assists: 1, yellowCards: 0, redCard: false, ownGoals: 0, penaltySaved: 0, penaltyMissed: 0, goalsConceded: 0, cleanSheet: false },
      'C', bonus, malus,
    );
    expect(score).toBe(6.5 + 4 + 1); // 11.5
  });

  test('applies defender goal bonus correctly', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 6, goals: 1, assists: 0, yellowCards: 0, redCard: false, ownGoals: 0, penaltySaved: 0, penaltyMissed: 0, goalsConceded: 0, cleanSheet: false },
      'D', bonus, malus,
    );
    expect(score).toBe(6 + 6); // 12
  });

  test('applies malus for yellow/red cards', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 5, goals: 0, assists: 0, yellowCards: 1, redCard: true, ownGoals: 0, penaltySaved: 0, penaltyMissed: 0, goalsConceded: 0, cleanSheet: false },
      'D', bonus, malus,
    );
    expect(score).toBe(5 - 0.5 - 1); // 3.5
  });

  test('applies goalkeeper-specific malus and bonus', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 6, goals: 0, assists: 0, yellowCards: 0, redCard: false, ownGoals: 0, penaltySaved: 1, penaltyMissed: 0, goalsConceded: 2, cleanSheet: false },
      'P', bonus, malus,
    );
    expect(score).toBe(6 + 3 - 2); // 7
  });

  test('clean sheet bonus for goalkeeper', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 6, goals: 0, assists: 0, yellowCards: 0, redCard: false, ownGoals: 0, penaltySaved: 0, penaltyMissed: 0, goalsConceded: 0, cleanSheet: true },
      'P', bonus, malus,
    );
    expect(score).toBe(6 + 1); // 7
  });

  test('own goal and missed penalty malus', () => {
    const score = calculatePlayerScore(
      { played: true, rating: 5, goals: 0, assists: 0, yellowCards: 0, redCard: false, ownGoals: 1, penaltySaved: 0, penaltyMissed: 1, goalsConceded: 0, cleanSheet: false },
      'A', bonus, malus,
    );
    expect(score).toBe(5 - 2 - 3); // 0
  });
});

describe('pointsToGoals', () => {
  test('returns 0 for points below threshold', () => {
    expect(pointsToGoals(60)).toBe(0);
    expect(pointsToGoals(65)).toBe(0);
  });

  test('returns 1 for points at threshold', () => {
    expect(pointsToGoals(66)).toBe(1);
  });

  test('returns correct goals for points above threshold', () => {
    expect(pointsToGoals(72)).toBe(2);
    expect(pointsToGoals(78)).toBe(3);
    expect(pointsToGoals(71)).toBe(1);
    expect(pointsToGoals(84)).toBe(4);
  });

  test('works with custom threshold and interval', () => {
    expect(pointsToGoals(60, 60, 5)).toBe(1);
    expect(pointsToGoals(65, 60, 5)).toBe(2);
    expect(pointsToGoals(59, 60, 5)).toBe(0);
  });
});
