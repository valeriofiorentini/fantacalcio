const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const League = require('../models/League');
const Team = require('../models/Team');
const defaults = require('../config/defaults');

const router = express.Router();

// POST /api/leagues - Create a league
router.post('/', authenticate, [
  body('name').trim().notEmpty(),
  body('maxTeams').optional().isInt({ min: defaults.MIN_TEAMS, max: defaults.MAX_TEAMS }),
  body('budget').optional().isInt({ min: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, maxTeams, budget, rules } = req.body;
    const inviteCode = crypto.randomBytes(4).toString('hex');

    const league = await League.create({
      name,
      admin: req.userId,
      inviteCode,
      maxTeams: maxTeams || defaults.MAX_TEAMS,
      budget: budget || defaults.DEFAULT_BUDGET,
      rules: rules || {},
    });

    // Admin auto-joins
    await Team.create({
      name: `Squadra Admin`,
      user: req.userId,
      league: league._id,
      budget: league.budget,
    });

    res.status(201).json({ league });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leagues/join - Join a league with invite code
router.post('/join', authenticate, [
  body('inviteCode').trim().notEmpty(),
  body('teamName').trim().notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { inviteCode, teamName } = req.body;
    const league = await League.findOne({ inviteCode });

    if (!league) {
      return res.status(404).json({ error: 'Lega non trovata' });
    }

    if (league.status !== 'draft') {
      return res.status(400).json({ error: 'La lega non accetta nuovi iscritti' });
    }

    const teamCount = await Team.countDocuments({ league: league._id });
    if (teamCount >= league.maxTeams) {
      return res.status(400).json({ error: 'Lega piena' });
    }

    const existing = await Team.findOne({ user: req.userId, league: league._id });
    if (existing) {
      return res.status(409).json({ error: 'Sei già iscritto a questa lega' });
    }

    const team = await Team.create({
      name: teamName,
      user: req.userId,
      league: league._id,
      budget: league.budget,
    });

    res.status(201).json({ team, league });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const league = await League.findById(req.params.id).populate('admin', 'username');
    if (!league) return res.status(404).json({ error: 'Lega non trovata' });

    const teams = await Team.find({ league: league._id }).populate('user', 'username');
    res.json({ league, teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leagues - List user's leagues
router.get('/', authenticate, async (req, res) => {
  try {
    const teams = await Team.find({ user: req.userId }).populate('league');
    const leagues = teams.map(t => t.league);
    res.json({ leagues });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
