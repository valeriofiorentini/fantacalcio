const express = require('express');
const { authenticate } = require('../middleware/auth');
const League = require('../models/League');
const Team = require('../models/Team');
const Lineup = require('../models/Lineup');
const PlayerScore = require('../models/PlayerScore');
const MatchResult = require('../models/MatchResult');
const Player = require('../models/Player');
const { calculatePlayerScore, pointsToGoals } = require('../utils/scoring');

const router = express.Router();

/**
 * Calculate a team's total fantasy score for a matchday,
 * applying automatic substitutions for non-playing starters.
 */
async function calculateTeamScore(lineup, matchday, league) {
  const starterPlayers = await Player.find({ _id: { $in: lineup.starters } });
  const benchPlayers = await Player.find({ _id: { $in: lineup.bench } });

  const bonus = league.rules.bonus;
  const malus = league.rules.malus;
  const maxSubs = league.rules.maxSubstitutions;

  let totalScore = 0;
  let subsUsed = 0;
  const details = [];

  // Process starters
  for (const player of starterPlayers) {
    const scoreData = await PlayerScore.findOne({ player: player._id, matchday });
    const pts = calculatePlayerScore(scoreData, player.role, bonus, malus);

    if (pts !== null) {
      totalScore += pts;
      details.push({ player: player.name, role: player.role, score: pts, sub: false });
    } else if (subsUsed < maxSubs) {
      // Try substitution from bench (same role priority)
      const sub = benchPlayers.find(bp => {
        const alreadyUsed = details.some(d => d.player === bp.name && d.sub);
        return !alreadyUsed && bp.role === player.role;
      });

      if (sub) {
        const subScore = await PlayerScore.findOne({ player: sub._id, matchday });
        const subPts = calculatePlayerScore(subScore, sub.role, bonus, malus);
        if (subPts !== null) {
          totalScore += subPts;
          subsUsed++;
          details.push({ player: sub.name, role: sub.role, score: subPts, sub: true, replacing: player.name });
        }
      }
    }
  }

  return { totalScore, details };
}

// POST /api/scores/calculate/:leagueId/:matchday - Admin calculates matchday results
router.post('/calculate/:leagueId/:matchday', authenticate, async (req, res) => {
  try {
    const { leagueId, matchday } = req.params;
    const md = Number(matchday);

    const league = await League.findById(leagueId);
    if (!league) return res.status(404).json({ error: 'Lega non trovata' });
    if (league.admin.toString() !== req.userId) {
      return res.status(403).json({ error: 'Solo l\'admin può calcolare i punteggi' });
    }

    const teams = await Team.find({ league: leagueId });
    const results = [];

    for (const team of teams) {
      const lineup = await Lineup.findOne({ team: team._id, matchday: md });
      if (!lineup) {
        results.push({ team: team.name, totalScore: 0, details: [] });
        continue;
      }

      const { totalScore, details } = await calculateTeamScore(lineup, md, league);
      results.push({ teamId: team._id, team: team.name, totalScore, details });
    }

    // Create head-to-head match results (pair teams sequentially)
    const matchResults = [];
    for (let i = 0; i < results.length - 1; i += 2) {
      const home = results[i];
      const away = results[i + 1];
      if (!away) break;

      const homeGoals = pointsToGoals(
        home.totalScore,
        league.rules.goalThreshold,
        league.rules.goalInterval,
      );
      const awayGoals = pointsToGoals(
        away.totalScore,
        league.rules.goalThreshold,
        league.rules.goalInterval,
      );

      const match = await MatchResult.findOneAndUpdate(
        { league: leagueId, matchday: md, homeTeam: home.teamId, awayTeam: away.teamId },
        {
          homeScore: home.totalScore,
          awayScore: away.totalScore,
          homeGoals,
          awayGoals,
        },
        { upsert: true, new: true },
      );
      matchResults.push(match);
    }

    res.json({ results, matchResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scores/standings/:leagueId - Get league standings
router.get('/standings/:leagueId', authenticate, async (req, res) => {
  try {
    const teams = await Team.find({ league: req.params.leagueId }).populate('user', 'username');
    const matches = await MatchResult.find({ league: req.params.leagueId });

    const standings = teams.map(team => {
      const teamMatches = matches.filter(
        m => m.homeTeam.toString() === team._id.toString()
          || m.awayTeam.toString() === team._id.toString(),
      );

      let wins = 0, draws = 0, losses = 0, totalPoints = 0;

      for (const m of teamMatches) {
        const isHome = m.homeTeam.toString() === team._id.toString();
        const myGoals = isHome ? m.homeGoals : m.awayGoals;
        const oppGoals = isHome ? m.awayGoals : m.homeGoals;
        const myScore = isHome ? m.homeScore : m.awayScore;

        totalPoints += myScore;

        if (myGoals > oppGoals) wins++;
        else if (myGoals === oppGoals) draws++;
        else losses++;
      }

      return {
        team: team.name,
        user: team.user.username,
        played: teamMatches.length,
        wins,
        draws,
        losses,
        points: wins * 3 + draws, // League points
        totalFantasyPoints: totalPoints,
      };
    });

    standings.sort((a, b) => b.points - a.points || b.totalFantasyPoints - a.totalFantasyPoints);

    res.json({ standings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
