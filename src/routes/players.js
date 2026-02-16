const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Player = require('../models/Player');
const PlayerScore = require('../models/PlayerScore');
const League = require('../models/League');
const { calculatePlayerScore } = require('../utils/scoring');

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

// POST /api/players/events - Import match events for a matchday (no manual ratings!)
router.post('/events', authenticate, [
  body('matchday').isInt({ min: 1 }),
  body('events').isArray({ min: 1 }),
  body('events.*.playerId').notEmpty(),
  body('events.*.minutes').isInt({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { matchday, events } = req.body;
    const ops = events.map(e => ({
      updateOne: {
        filter: { player: e.playerId, matchday },
        update: {
          $set: {
            minutes: e.minutes || 0,
            goals: e.goals || 0,
            assists: e.assists || 0,
            yellowCards: e.yellowCards || 0,
            redCard: e.redCard || false,
            ownGoals: e.ownGoals || 0,
            penaltiesScored: e.penaltiesScored || 0,
            penaltyMissed: e.penaltyMissed || 0,
            penaltySaved: e.penaltySaved || 0,
            goalsConceded: e.goalsConceded || 0,
          },
        },
        upsert: true,
      },
    }));

    const result = await PlayerScore.bulkWrite(ops);
    res.json({
      message: 'Eventi importati',
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/players/votes/:matchday - View calculated votes for a matchday
// Optional query: ?leagueId=xxx (to use league-specific rules)
router.get('/votes/:matchday', authenticate, async (req, res) => {
  try {
    const matchday = Number(req.params.matchday);

    // Load league rules if specified
    let rules = null;
    if (req.query.leagueId) {
      const league = await League.findById(req.query.leagueId);
      if (league) {
        rules = league.rules;
      }
    }

    // Get all events for this matchday
    const events = await PlayerScore.find({ matchday }).populate({
      path: 'player',
      model: 'Player',
    });

    const votes = events.map(event => {
      const player = event.player;
      const fantavoto = calculatePlayerScore(event, player.role, rules);

      return {
        playerId: player._id,
        name: player.name,
        role: player.role,
        realTeam: player.realTeam,
        matchday,
        minutes: event.minutes,
        fantavoto, // null = SV (senza voto)
        details: {
          goals: event.goals,
          assists: event.assists,
          yellowCards: event.yellowCards,
          redCard: event.redCard,
          ownGoals: event.ownGoals,
          penaltiesScored: event.penaltiesScored,
          penaltyMissed: event.penaltyMissed,
          penaltySaved: event.penaltySaved,
          goalsConceded: event.goalsConceded,
        },
      };
    });

    // Sort: players with votes first (by score desc), then SV
    votes.sort((a, b) => {
      if (a.fantavoto === null && b.fantavoto === null) return 0;
      if (a.fantavoto === null) return 1;
      if (b.fantavoto === null) return -1;
      return b.fantavoto - a.fantavoto;
    });

    // Optional role filter
    const filtered = req.query.role
      ? votes.filter(v => v.role === req.query.role.toUpperCase())
      : votes;

    res.json({
      matchday,
      count: filtered.length,
      votes: filtered,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/players/votes/:matchday/:playerId - Single player vote detail
router.get('/votes/:matchday/:playerId', authenticate, async (req, res) => {
  try {
    const matchday = Number(req.params.matchday);
    const event = await PlayerScore.findOne({
      player: req.params.playerId,
      matchday,
    });

    if (!event) {
      return res.status(404).json({ error: 'Nessun dato per questa giornata' });
    }

    const player = await Player.findById(req.params.playerId);
    if (!player) {
      return res.status(404).json({ error: 'Giocatore non trovato' });
    }

    // Load league rules if specified
    let rules = null;
    if (req.query.leagueId) {
      const league = await League.findById(req.query.leagueId);
      if (league) rules = league.rules;
    }

    const fantavoto = calculatePlayerScore(event, player.role, rules);

    res.json({
      playerId: player._id,
      name: player.name,
      role: player.role,
      realTeam: player.realTeam,
      matchday,
      minutes: event.minutes,
      fantavoto,
      details: {
        goals: event.goals,
        assists: event.assists,
        yellowCards: event.yellowCards,
        redCard: event.redCard,
        ownGoals: event.ownGoals,
        penaltiesScored: event.penaltiesScored,
        penaltyMissed: event.penaltyMissed,
        penaltySaved: event.penaltySaved,
        goalsConceded: event.goalsConceded,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
