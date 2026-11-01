import assert from "node:assert/strict";
import { initDb, query } from "../lib/db";
import {
  evaluatePredictionPoints,
  generateMatchesForTournament,
  advanceTournamentBracket,
  recalculateTournamentPredictions,
} from "../lib/bracket";

function testEvaluatePredictionPoints() {
  // 1st correct match: 500 + 500 for exact score = 1000
  const ptsExact1 = evaluatePredictionPoints("teamA", 2, 1, "teamA", 2, 1, 1);
  assert.equal(ptsExact1, 1000);

  const ptsWinnerOnly1 = evaluatePredictionPoints("teamA", 2, 0, "teamA", 2, 1, 1);
  assert.equal(ptsWinnerOnly1, 500);

  // 2nd correct match: 1000 + 1000 for exact score = 2000
  const ptsExact2 = evaluatePredictionPoints("teamA", 2, 1, "teamA", 2, 1, 2);
  assert.equal(ptsExact2, 2000);

  const ptsWinnerOnly2 = evaluatePredictionPoints("teamA", 2, 0, "teamA", 2, 1, 2);
  assert.equal(ptsWinnerOnly2, 1000);

  // 3rd correct match: 1500 + 1500 for exact score = 3000
  const ptsExact3 = evaluatePredictionPoints("teamA", 2, 1, "teamA", 2, 1, 3);
  assert.equal(ptsExact3, 3000);

  const ptsWrongWinner = evaluatePredictionPoints("teamB", 0, 2, "teamA", 2, 1, 1);
  assert.equal(ptsWrongWinner, 0);
}

async function testSingleEliminationAdvancement() {
  await initDb();
  const tournId = "tourn_test_se_4";
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournId]);
  await query(`DELETE FROM tournaments WHERE id = $1`, [tournId]);

  await query(
    `INSERT INTO tournaments (id, title, format, max_teams, status)
     VALUES ($1, 'Test SE 4', 'single_elimination', 4, 'active')`,
    [tournId]
  );

  await generateMatchesForTournament(tournId, "single_elimination", 4);

  const matches = await query<{ match_code: string; team1_id: string | null; team2_id: string | null }>(
    `SELECT match_code, team1_id, team2_id FROM matches WHERE tournament_id = $1 ORDER BY match_order ASC`,
    [tournId]
  );
  assert.equal(matches.rows.length, 3);
  const teamsToInsert = ["team_winner_1", "team_loser_1", "team_winner_2", "team_loser_2"];
  for (const tid of teamsToInsert) {
    await query(
      `INSERT INTO teams (id, name, tag, invite_code) VALUES ($1, $1, $1, $1) ON CONFLICT (id) DO NOTHING`,
      [tid]
    );
  }

  // Winner of SF1 advances to GF team1_id
  await advanceTournamentBracket(tournId, "SF1", "team_winner_1", "team_loser_1");
  const gfAfterSF1 = await query<{ team1_id: string | null }>(
    `SELECT team1_id FROM matches WHERE tournament_id = $1 AND match_code = 'GF'`,
    [tournId]
  );
  assert.equal(gfAfterSF1.rows[0].team1_id, "team_winner_1");

  // Winner of SF2 advances to GF team2_id
  await advanceTournamentBracket(tournId, "SF2", "team_winner_2", "team_loser_2");
  const gfAfterSF2 = await query<{ team1_id: string | null; team2_id: string | null }>(
    `SELECT team1_id, team2_id FROM matches WHERE tournament_id = $1 AND match_code = 'GF'`,
    [tournId]
  );
  assert.equal(gfAfterSF2.rows[0].team1_id, "team_winner_1");
  assert.equal(gfAfterSF2.rows[0].team2_id, "team_winner_2");
}

async function testEightTeamDoubleEliminationAdvancement() {
  await initDb();
  const tournId = "tourn_test_de_8";
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournId]);
  await query(`DELETE FROM tournaments WHERE id = $1`, [tournId]);

  await query(
    `INSERT INTO tournaments (id, title, format, max_teams, status)
     VALUES ($1, 'Test DE 8', 'double_elimination', 8, 'active')`,
    [tournId]
  );

  await generateMatchesForTournament(tournId, "double_elimination", 8);

  const matches = await query<{ match_code: string }>(
    `SELECT match_code FROM matches WHERE tournament_id = $1 ORDER BY match_order ASC`,
    [tournId]
  );
  assert.equal(matches.rows.length, 13);
  assert.ok(matches.rows.some((m) => m.match_code === "UBF1"));
  assert.ok(matches.rows.some((m) => m.match_code === "UBF2"));
  assert.ok(matches.rows.some((m) => m.match_code === "LB1"));
  const deTeams = ["team_u1", "team_l1", "team_u2", "team_l2"];
  for (const tid of deTeams) {
    await query(
      `INSERT INTO teams (id, name, tag, invite_code) VALUES ($1, $1, $1, $1) ON CONFLICT (id) DO NOTHING`,
      [tid]
    );
  }

  // Advance UB1
  await advanceTournamentBracket(tournId, "UB1", "team_u1", "team_l1");
  const ubf1Res = await query<{ team1_id: string | null }>(
    `SELECT team1_id FROM matches WHERE tournament_id = $1 AND match_code = 'UBF1'`,
    [tournId]
  );
  const lb1Res = await query<{ team1_id: string | null }>(
    `SELECT team1_id FROM matches WHERE tournament_id = $1 AND match_code = 'LB1'`,
    [tournId]
  );
  assert.equal(ubf1Res.rows[0].team1_id, "team_u1");
  assert.equal(lb1Res.rows[0].team1_id, "team_l1");
}

async function testRecalculateTournamentPredictions() {
  await initDb();
  const tournId = "tourn_test_prog_pred";
  const userId = "user_pred_prog_tester";
  await query(`DELETE FROM predictions WHERE user_id = $1`, [userId]);
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournId]);
  await query(`DELETE FROM tournaments WHERE id = $1`, [tournId]);
  await query(`DELETE FROM users WHERE id = $1`, [userId]);

  await query(
    `INSERT INTO users (id, username, email, email_verified) VALUES ($1, 'ProgTester', 'prog@test.com', true)`,
    [userId]
  );
  await query(
    `INSERT INTO tournaments (id, title, format, max_teams, status) VALUES ($1, 'Prog Tourn', 'double_elimination', 8, 'active')`,
    [tournId]
  );

  for (const tid of ['teamA', 'teamB', 'teamC', 'teamD', 'teamE', 'teamF']) {
    await query(
      `INSERT INTO teams (id, name, tag, invite_code) VALUES ($1, $1, $1, $1) ON CONFLICT (id) DO NOTHING`,
      [tid]
    );
  }

  await query(
    `INSERT INTO matches (id, tournament_id, match_code, bracket_type, round_name, match_order, status, team1_id, team2_id, team1_score, team2_score, winner_id)
     VALUES
     ('m_p1', $1, 'UB1', 'upper', 'UB Round 1', 1, 'completed', 'teamA', 'teamB', 2, 1, 'teamA'),
     ('m_p2', $1, 'UB2', 'upper', 'UB Round 1', 2, 'completed', 'teamC', 'teamD', 2, 0, 'teamC'),
     ('m_p3', $1, 'UB3', 'upper', 'UB Round 1', 3, 'completed', 'teamE', 'teamF', 2, 1, 'teamE')`,
    [tournId]
  );

  await query(
    `INSERT INTO predictions (id, user_id, match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score)
     VALUES
     ('p1', $1, 'm_p1', 'teamA', 2, 1),
     ('p2', $1, 'm_p2', 'teamC', 2, 1),
     ('p3', $1, 'm_p3', 'teamE', 2, 1)`,
    [userId]
  );

  await recalculateTournamentPredictions(tournId);

  const res = await query<{ id: string; points_awarded: number; is_calculated: boolean }>(
    `SELECT id, points_awarded, is_calculated FROM predictions WHERE user_id = $1 ORDER BY id ASC`,
    [userId]
  );

  assert.equal(res.rows[0].points_awarded, 1000); // 1st correct: 500 + 500 exact
  assert.equal(res.rows[1].points_awarded, 1000); // 2nd correct: 1000 winner only
  assert.equal(res.rows[2].points_awarded, 3000); // 3rd correct: 1500 + 1500 exact
}

async function main() {
  testEvaluatePredictionPoints();
  await testSingleEliminationAdvancement();
  await testEightTeamDoubleEliminationAdvancement();
  await testRecalculateTournamentPredictions();
  console.log("Bracket & Prediction unit tests PASSED successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
