const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Player = require('../models/Player');
const PlayerScore = require('../models/PlayerScore');

const router = express.Router();

// GET /api/players - List players with optional filters
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = { active: true };
    if (req.query.role) filter.role = req.query.role.toUpperCase();
    if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));

    const [players, total] = await Promise.all([
      Player.find(filter).sort({ name: 1 }).skip((page - 1) * limit).limit(limit),
      Player.countDocuments(filter),
    ]);

    res.json({ players, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/players - Admin: add players (bulk)
router.post('/', authenticate, [
  body('players').isArray({ min: 1 }),
  body('players.*.name').trim().notEmpty(),
  body('players.*.role').isIn(['P', 'D', 'C', 'A']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const created = await Player.insertMany(req.body.players);
    res.status(201).json({ count: created.length, players: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/players/scores - Admin: import matchday scores
router.post('/scores', authenticate, [
  body('matchday').isInt({ min: 1 }),
  body('scores').isArray({ min: 1 }),
  body('scores.*.playerId').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { matchday, scores } = req.body;
    const ops = scores.map(s => ({
      updateOne: {
        filter: { player: s.playerId, matchday },
        update: {
          $set: {
            rating: s.rating,
            played: s.played ?? (s.rating != null),
            goals: s.goals || 0,
            assists: s.assists || 0,
            yellowCards: s.yellowCards || 0,
            redCard: s.redCard || false,
            ownGoals: s.ownGoals || 0,
            penaltySaved: s.penaltySaved || 0,
            penaltyMissed: s.penaltyMissed || 0,
            goalsConceded: s.goalsConceded || 0,
            cleanSheet: s.cleanSheet || false,
          },
        },
        upsert: true,
      },
    }));

    const result = await PlayerScore.bulkWrite(ops);
    res.json({ message: 'Voti importati', modified: result.modifiedCount, upserted: result.upsertedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
