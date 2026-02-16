const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const League = require('../models/League');
const Team = require('../models/Team');
const RosterEntry = require('../models/RosterEntry');
const Player = require('../models/Player');
const Lineup = require('../models/Lineup');

const router = express.Router();

// Validate that a formation matches role requirements
function validateFormation(formation, players) {
  const parts = formation.split('-').map(Number);
  if (parts.length !== 3) return false;

  const [def, mid, fwd] = parts;
  const roles = { P: 0, D: 0, C: 0, A: 0 };
  players.forEach(p => { roles[p.role]++; });

  return roles.P === 1 && roles.D === def && roles.C === mid && roles.A === fwd;
}

// POST /api/lineups - Submit lineup for a matchday
router.post('/', authenticate, [
  body('leagueId').notEmpty(),
  body('matchday').isInt({ min: 1 }),
  body('formation').notEmpty(),
  body('starters').isArray(),
  body('bench').isArray(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { leagueId, matchday, formation, starters, bench } = req.body;

    const league = await League.findById(leagueId);
    if (!league || league.status !== 'active') {
      return res.status(400).json({ error: 'La lega non è attiva' });
    }

    // Check formation is allowed
    if (!league.rules.allowedFormations.includes(formation)) {
      return res.status(400).json({
        error: `Modulo ${formation} non consentito`,
        allowed: league.rules.allowedFormations,
      });
    }

    const team = await Team.findOne({ user: req.userId, league: leagueId });
    if (!team) {
      return res.status(404).json({ error: 'Non fai parte di questa lega' });
    }

    // Verify all players are in roster
    const rosterEntries = await RosterEntry.find({ team: team._id });
    const rosterPlayerIds = rosterEntries.map(r => r.player.toString());
    const allPlayerIds = [...starters, ...bench];

    for (const pid of allPlayerIds) {
      if (!rosterPlayerIds.includes(pid)) {
        return res.status(400).json({ error: `Giocatore ${pid} non in rosa` });
      }
    }

    // Validate formation against starter roles
    const starterPlayers = await Player.find({ _id: { $in: starters } });
    if (!validateFormation(formation, starterPlayers)) {
      return res.status(400).json({
        error: 'Formazione non valida per il modulo scelto',
      });
    }

    // Check starters count (1 GK + formation)
    const expectedStarters = 1 + formation.split('-').reduce((a, b) => a + Number(b), 0);
    if (starters.length !== expectedStarters) {
      return res.status(400).json({
        error: `Servono ${expectedStarters} titolari per il modulo ${formation}`,
      });
    }

    // Upsert lineup
    const lineup = await Lineup.findOneAndUpdate(
      { team: team._id, matchday },
      { formation, starters, bench },
      { upsert: true, new: true },
    );

    res.json({ lineup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lineups/:leagueId/:matchday
router.get('/:leagueId/:matchday', authenticate, async (req, res) => {
  try {
    const team = await Team.findOne({
      user: req.userId,
      league: req.params.leagueId,
    });
    if (!team) {
      return res.status(404).json({ error: 'Non fai parte di questa lega' });
    }

    const lineup = await Lineup.findOne({
      team: team._id,
      matchday: Number(req.params.matchday),
    }).populate('starters bench');

    if (!lineup) {
      return res.status(404).json({ error: 'Formazione non inserita' });
    }

    res.json({ lineup });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
