import assert from "node:assert/strict";
import { initDb, query } from "../lib/db";
import {
  evaluatePredictionPoints,
  generateMatchesForTournament,
  advanceTournamentBracket,
} from "../lib/bracket";

function testEvaluatePredictionPoints() {
  const ptsExact = evaluatePredictionPoints("teamA", 2, 1, "teamA", 2, 1);
  assert.equal(ptsExact, 10);

  const ptsWinnerOnly = evaluatePredictionPoints("teamA", 2, 0, "teamA", 2, 1);
  assert.equal(ptsWinnerOnly, 5);

  const ptsWrongWinner = evaluatePredictionPoints("teamB", 0, 2, "teamA", 2, 1);
  assert.equal(ptsWrongWinner, 0);

  const ptsSweepExact = evaluatePredictionPoints("teamB", 0, 2, "teamB", 0, 2);
  assert.equal(ptsSweepExact, 10);
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

async function main() {
  testEvaluatePredictionPoints();
  await testSingleEliminationAdvancement();
  await testEightTeamDoubleEliminationAdvancement();
  console.log("Bracket & Prediction unit tests PASSED successfully!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
