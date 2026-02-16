const { calculatePlayerScore, pointsToGoals } = require('../src/utils/scoring');

describe('calculatePlayerScore - Algoritmo automatico', () => {

  // ======= SV (Senza Voto) =======

  test('restituisce null se il giocatore non ha giocato (minutes=0)', () => {
    expect(calculatePlayerScore({ minutes: 0 }, 'A')).toBeNull();
  });

  test('restituisce null se event è null', () => {
    expect(calculatePlayerScore(null, 'A')).toBeNull();
  });

  test('restituisce null se minutes non è definito', () => {
    expect(calculatePlayerScore({}, 'A')).toBeNull();
  });

  // ======= Voto Base =======

  test('voto base = 6.0 per chi gioca < 60 minuti', () => {
    const score = calculatePlayerScore({ minutes: 45 }, 'C');
    expect(score).toBe(6.0);
  });

  test('voto base = 6.5 per chi gioca >= 60 minuti', () => {
    const score = calculatePlayerScore({ minutes: 90 }, 'C');
    expect(score).toBe(6.5);
  });

  test('voto base = 6.5 per esattamente 60 minuti', () => {
    const score = calculatePlayerScore({ minutes: 60 }, 'C');
    expect(score).toBe(6.5);
  });

  // ======= Bonus Gol per Ruolo =======

  test('attaccante: gol = +3', () => {
    const score = calculatePlayerScore({ minutes: 90, goals: 2 }, 'A');
    // 6 + 0.5 + 2*3 = 12.5 → clamp(3,10) = 10
    expect(score).toBe(10);
  });

  test('attaccante: 1 gol senza bonus minutaggio', () => {
    const score = calculatePlayerScore({ minutes: 30, goals: 1 }, 'A');
    // 6 + 0 + 1*3 = 9
    expect(score).toBe(9);
  });

  test('centrocampista: gol = +4', () => {
    const score = calculatePlayerScore({ minutes: 90, goals: 1 }, 'C');
    // 6 + 0.5 + 1*4 = 10.5 → clamp = 10
    expect(score).toBe(10);
  });

  test('difensore: gol = +6', () => {
    const score = calculatePlayerScore({ minutes: 90, goals: 1 }, 'D');
    // 6 + 0.5 + 1*6 = 12.5 → clamp = 10
    expect(score).toBe(10);
  });

  test('portiere: gol = +6', () => {
    const score = calculatePlayerScore({ minutes: 90, goals: 1, goalsConceded: 0 }, 'P');
    // 6 + 0.5 + 1*6 + 1(clean sheet) = 13.5 → clamp = 10
    expect(score).toBe(10);
  });

  // ======= Assist =======

  test('assist = +1', () => {
    const score = calculatePlayerScore({ minutes: 90, assists: 2 }, 'C');
    // 6 + 0.5 + 2*1 = 8.5
    expect(score).toBe(8.5);
  });

  // ======= Malus Disciplinari =======

  test('ammonizione = -0.5', () => {
    const score = calculatePlayerScore({ minutes: 90, yellowCards: 1 }, 'D');
    // 6 + 0.5 - 0.5 = 6
    expect(score).toBe(6);
  });

  test('espulsione = -1', () => {
    const score = calculatePlayerScore({ minutes: 45, redCard: true }, 'C');
    // 6 + 0 - 1 = 5
    expect(score).toBe(5);
  });

  test('autogol = -2', () => {
    const score = calculatePlayerScore({ minutes: 90, ownGoals: 1 }, 'D');
    // 6 + 0.5 - 2 = 4.5
    expect(score).toBe(4.5);
  });

  // ======= Portiere Extra =======

  test('portiere: rigore parato = +3', () => {
    const score = calculatePlayerScore({ minutes: 90, penaltySaved: 1, goalsConceded: 0 }, 'P');
    // 6 + 0.5 + 3 + 1(clean sheet) = 10.5 → clamp = 10
    expect(score).toBe(10);
  });

  test('portiere: gol subiti = -1 ciascuno', () => {
    const score = calculatePlayerScore({ minutes: 90, goalsConceded: 2 }, 'P');
    // 6 + 0.5 - 2*1 = 4.5
    expect(score).toBe(4.5);
  });

  test('portiere: porta inviolata >= 60 min = +1', () => {
    const score = calculatePlayerScore({ minutes: 90, goalsConceded: 0 }, 'P');
    // 6 + 0.5 + 1 = 7.5
    expect(score).toBe(7.5);
  });

  test('portiere: porta inviolata ma < 60 min = NO bonus', () => {
    const score = calculatePlayerScore({ minutes: 45, goalsConceded: 0 }, 'P');
    // 6 + 0 + 0 (no clean sheet perché < 60 min) = 6
    expect(score).toBe(6);
  });

  test('portiere: gol subiti = NO porta inviolata', () => {
    const score = calculatePlayerScore({ minutes: 90, goalsConceded: 1 }, 'P');
    // 6 + 0.5 - 1 + 0 (no clean sheet) = 5.5
    expect(score).toBe(5.5);
  });

  // ======= Rigori =======

  test('rigore segnato = +3', () => {
    const score = calculatePlayerScore({ minutes: 90, penaltiesScored: 1 }, 'A');
    // 6 + 0.5 + 3 = 9.5
    expect(score).toBe(9.5);
  });

  test('rigore sbagliato = -3', () => {
    const score = calculatePlayerScore({ minutes: 90, penaltyMissed: 1 }, 'A');
    // 6 + 0.5 - 3 = 3.5
    expect(score).toBe(3.5);
  });

  // ======= Clamp 3-10 =======

  test('clamp: punteggio non scende sotto 3', () => {
    // Scenario pessimo: espulsione + autogol + rigore sbagliato
    const score = calculatePlayerScore({
      minutes: 30,
      redCard: true,
      ownGoals: 1,
      penaltyMissed: 1,
    }, 'D');
    // 6 + 0 - 1 - 2 - 3 = 0 → clamp = 3
    expect(score).toBe(3);
  });

  test('clamp: punteggio non sale sopra 10', () => {
    // Scenario top: 3 gol + 2 assist + rigore segnato
    const score = calculatePlayerScore({
      minutes: 90,
      goals: 3,
      assists: 2,
      penaltiesScored: 1,
    }, 'A');
    // 6 + 0.5 + 3*3 + 2*1 + 1*3 = 20.5 → clamp = 10
    expect(score).toBe(10);
  });

  // ======= Scenario Complesso =======

  test('scenario completo: centrocampista con gol, assist, ammonizione', () => {
    const score = calculatePlayerScore({
      minutes: 75,
      goals: 1,
      assists: 1,
      yellowCards: 1,
    }, 'C');
    // 6 + 0.5 + 1*4 + 1*1 - 0.5 = 11 → clamp = 10
    expect(score).toBe(10);
  });

  test('scenario completo: difensore 90 min senza bonus', () => {
    const score = calculatePlayerScore({
      minutes: 90,
      goals: 0,
      assists: 0,
      yellowCards: 0,
    }, 'D');
    // 6 + 0.5 = 6.5
    expect(score).toBe(6.5);
  });

  test('scenario completo: portiere fenomeno', () => {
    const score = calculatePlayerScore({
      minutes: 90,
      penaltySaved: 1,
      goalsConceded: 0,
      yellowCards: 1,
    }, 'P');
    // 6 + 0.5 + 3 + 1(clean sheet) - 0.5 = 10
    expect(score).toBe(10);
  });

  test('scenario completo: attaccante disastroso', () => {
    const score = calculatePlayerScore({
      minutes: 70,
      goals: 0,
      ownGoals: 1,
      yellowCards: 1,
      redCard: true,
      penaltyMissed: 1,
    }, 'A');
    // 6 + 0.5 - 2 - 0.5 - 1 - 3 = 0 → clamp = 3
    expect(score).toBe(3);
  });

  // ======= Regole Personalizzate =======

  test('regole custom: base rating diverso', () => {
    const rules = { baseRating: 7, minutesBonus: 0 };
    const score = calculatePlayerScore({ minutes: 90 }, 'C', rules);
    expect(score).toBe(7);
  });

  test('regole custom: clamp personalizzato', () => {
    const rules = { minScore: 1, maxScore: 15 };
    const score = calculatePlayerScore({
      minutes: 90,
      goals: 3,
    }, 'A');
    // Con clamp default: 6 + 0.5 + 9 = 15.5 → 10
    expect(score).toBe(10);

    const scoreCustom = calculatePlayerScore({
      minutes: 90,
      goals: 3,
    }, 'A', rules);
    // Con clamp custom: 6 + 0.5 + 9 = 15.5 → 15
    expect(scoreCustom).toBe(15);
  });
});

describe('pointsToGoals', () => {
  test('restituisce 0 per punti sotto soglia', () => {
    expect(pointsToGoals(60)).toBe(0);
    expect(pointsToGoals(65)).toBe(0);
  });

  test('restituisce 1 per punti alla soglia', () => {
    expect(pointsToGoals(66)).toBe(1);
  });

  test('calcola gol correttamente sopra soglia', () => {
    expect(pointsToGoals(72)).toBe(2);   // 66 + 6
    expect(pointsToGoals(78)).toBe(3);   // 66 + 12
    expect(pointsToGoals(71)).toBe(1);   // 66 + 5 (non basta per il secondo)
    expect(pointsToGoals(84)).toBe(4);   // 66 + 18
  });

  test('funziona con soglia e intervallo custom', () => {
    expect(pointsToGoals(60, 60, 5)).toBe(1);
    expect(pointsToGoals(65, 60, 5)).toBe(2);
    expect(pointsToGoals(59, 60, 5)).toBe(0);
  });
});
