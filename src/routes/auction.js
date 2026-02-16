const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const League = require('../models/League');
const Team = require('../models/Team');
const Player = require('../models/Player');
const RosterEntry = require('../models/RosterEntry');

const router = express.Router();

// POST /api/auction/buy - Buy a player during auction
router.post('/buy', authenticate, [
  body('leagueId').notEmpty(),
  body('playerId').notEmpty(),
  body('price').isInt({ min: 1 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { leagueId, playerId, price } = req.body;

    const league = await League.findById(leagueId);
    if (!league || league.status !== 'auction') {
      return res.status(400).json({ error: 'Asta non attiva per questa lega' });
    }

    const team = await Team.findOne({ user: req.userId, league: leagueId });
    if (!team) {
      return res.status(404).json({ error: 'Non fai parte di questa lega' });
    }

    // Check budget
    if (price > team.budget) {
      return res.status(400).json({ error: 'Crediti insufficienti' });
    }

    const player = await Player.findById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Giocatore non trovato' });
    }

    // Check if player already owned in this league
    const teamIds = (await Team.find({ league: leagueId })).map(t => t._id);
    const alreadyOwned = await RosterEntry.findOne({
      team: { $in: teamIds },
      player: playerId,
    });
    if (alreadyOwned) {
      return res.status(409).json({ error: 'Giocatore già acquistato in questa lega' });
    }

    // Check roster role limits
    const rosterLimits = Object.fromEntries(league.rules.rosterLimits);
    const currentRoster = await RosterEntry.find({ team: team._id }).populate('player');
    const roleCount = currentRoster.filter(r => r.player.role === player.role).length;
    const limit = rosterLimits[player.role] || 0;

    if (roleCount >= limit) {
      return res.status(400).json({
        error: `Limite ${player.role} raggiunto (${limit})`,
      });
    }

    // Check total roster size
    const totalLimit = Object.values(rosterLimits).reduce((a, b) => a + b, 0);
    if (currentRoster.length >= totalLimit) {
      return res.status(400).json({ error: 'Rosa completa' });
    }

    // Execute purchase
    await RosterEntry.create({
      team: team._id,
      player: playerId,
      purchasePrice: price,
    });

    team.budget -= price;
    await team.save();

    res.status(201).json({
      message: `${player.name} acquistato per ${price} crediti`,
      remainingBudget: team.budget,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auction/roster/:leagueId - Get team roster in a league
router.get('/roster/:leagueId', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({
      user: req.userId,
      league: req.params.leagueId,
    });
    if (!team) {
      return res.status(404).json({ error: 'Non fai parte di questa lega' });
    }

    const roster = await RosterEntry.find({ team: team._id }).populate('player');
    res.json({ roster, budget: team.budget });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auction/start/:leagueId - Admin starts auction
router.post('/start/:leagueId', authenticate, async (req, res) => {
  try {
    const league = await League.findById(req.params.leagueId);
    if (!league) return res.status(404).json({ error: 'Lega non trovata' });

    if (league.admin.toString() !== req.userId) {
      return res.status(403).json({ error: 'Solo l\'admin può avviare l\'asta' });
    }

    if (league.status !== 'draft') {
      return res.status(400).json({ error: 'La lega non è in fase di bozza' });
    }

    const teamCount = await Team.countDocuments({ league: league._id });
    if (teamCount < 2) {
      return res.status(400).json({ error: 'Servono almeno 2 squadre' });
    }

    league.status = 'auction';
    await league.save();

    res.json({ message: 'Asta avviata', league });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
