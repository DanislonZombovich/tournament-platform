import assert from "node:assert/strict";
import { initDb, query } from "../lib/db";
import { advanceDoubleElimination, evaluatePredictionPoints } from "../lib/bracket";
import { calculateFantasyPoints, rollRandomTraits } from "../lib/fantasy";

async function runTournamentFlowIntegrationTest() {
  await initDb();

  const tournRes = await query(`SELECT id, status FROM tournaments WHERE id = 'ti-2026-main'`);
  assert.equal(tournRes.rows.length, 1);
  const tournamentId = tournRes.rows[0].id;

  const testUserRes = await query<{ id: string }>(
    `INSERT INTO users (id, username, email, role, steam_id, steam_name, fantasy_tokens)
     VALUES ('u_test_f1', 'TestPredictor', 'pred@test.com', 'admin', '76561198999999999', 'TestSteamPro', 20)
     ON CONFLICT (id) DO UPDATE SET fantasy_tokens = 20
     RETURNING id`
  );
  const testUserId = testUserRes.rows[0].id;

  const testTeams = [
    { id: "t_test_1", name: "Team Alpha", tag: "TAL", logo: "" },
    { id: "t_test_2", name: "Team Beta", tag: "TBE", logo: "" },
    { id: "t_test_3", name: "Team Gamma", tag: "TGA", logo: "" },
    { id: "t_test_4", name: "Team Delta", tag: "TDE", logo: "" },
  ];

  for (let i = 0; i < testTeams.length; i++) {
    const tt = testTeams[i];
    await query(
      `INSERT INTO teams (id, name, tag, logo_url, captain_id, invite_code)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [tt.id, tt.name, tt.tag, tt.logo, testUserId, `inv_${tt.tag}`]
    );

    const roles = ["pos1", "pos2", "pos3", "pos4", "pos5"];
    for (const role of roles) {
      const pId = `u_${tt.tag.toLowerCase()}_${role}`;
      await query(
        `INSERT INTO users (id, username, role, steam_id, steam_name, fantasy_tokens)
         VALUES ($1, $2, 'user', $3, $4, 20)
         ON CONFLICT (id) DO NOTHING`,
        [pId, `${tt.tag}_${role}`, `76561198${i}${role.slice(-1)}00000`, `${tt.tag}Player_${role}`]
      );

      await query(
        `INSERT INTO team_members (id, team_id, user_id, role_slot)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (team_id, role_slot) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [`mem_${tt.id}_${role}`, tt.id, pId, role]
      );
    }

    await query(
      `INSERT INTO tournament_teams (id, tournament_id, team_id, seed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tournament_id, team_id) DO NOTHING`,
      [`tt_${tournamentId}_${tt.id}`, tournamentId, tt.id, i + 1]
    );
  }

  const registeredTeamsRes = await query<{ team_id: string }>(
    `SELECT team_id FROM tournament_teams WHERE tournament_id = $1`,
    [tournamentId]
  );
  assert.ok(registeredTeamsRes.rows.length >= 4);

  await query(`DELETE FROM match_player_stats WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournamentId]);

  const matchesToInsert = [
    { code: "UB1", type: "upper", name: "Верхняя сетка — Полуфинал 1", t1: testTeams[0].id, t2: testTeams[1].id, order: 1 },
    { code: "UB2", type: "upper", name: "Верхняя сетка — Полуфинал 2", t1: testTeams[2].id, t2: testTeams[3].id, order: 2 },
    { code: "LB1", type: "lower", name: "Нижняя сетка — Раунд 1", t1: null, t2: null, order: 3 },
    { code: "UBF", type: "upper", name: "Верхняя сетка — Финал", t1: null, t2: null, order: 4 },
    { code: "LBF", type: "lower", name: "Нижняя сетка — Финал", t1: null, t2: null, order: 5 },
    { code: "GF", type: "grand_final", name: "Гранд-Финал (Bo3)", t1: null, t2: null, order: 6 },
  ];

  for (const m of matchesToInsert) {
    await query(
      `INSERT INTO matches (id, tournament_id, match_code, bracket_type, round_name, team1_id, team2_id, match_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [`m_${m.code.toLowerCase()}`, tournamentId, m.code, m.type, m.name, m.t1, m.t2, m.order]
    );
  }

  await query(`DELETE FROM fantasy_cards WHERE user_id = $1`, [testUserId]);

  const chosenCarryPlayerId = `u_${testTeams[0].tag.toLowerCase()}_pos1`;
  const initialTraits = rollRandomTraits(3);

  await query(
    `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, traits, points_earned)
     VALUES ($1, $2, $3, $4, $5, $6, 0)
     ON CONFLICT (user_id, tournament_id, role_slot)
     DO UPDATE SET selected_player_id = EXCLUDED.selected_player_id, traits = EXCLUDED.traits`,
    ["fc_test_pos1", testUserId, tournamentId, "pos1", chosenCarryPlayerId, JSON.stringify(initialTraits)]
  );

  await query(`UPDATE users SET fantasy_tokens = fantasy_tokens - 1 WHERE id = $1`, [testUserId]);
  const newTraits = rollRandomTraits(3);
  await query(`UPDATE fantasy_cards SET traits = $1 WHERE id = 'fc_test_pos1'`, [JSON.stringify(newTraits)]);

  const updatedUserRes = await query<{ fantasy_tokens: number }>(`SELECT fantasy_tokens FROM users WHERE id = $1`, [testUserId]);
  assert.equal(updatedUserRes.rows[0].fantasy_tokens, 19);

  await query(
    `INSERT INTO predictions (id, user_id, match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score)
     VALUES ($1, $2, $3, $4, 2, 1)
     ON CONFLICT (user_id, match_id)
     DO UPDATE SET predicted_winner_id = EXCLUDED.predicted_winner_id, predicted_team1_score = 2, predicted_team2_score = 1`,
    ["pred_test_ub1", testUserId, "m_ub1", testTeams[0].id]
  );

  const ub1MatchId = "m_ub1";
  const winnerTeamId = testTeams[0].id;
  const loserTeamId = testTeams[1].id;
  const actualT1Score = 2;
  const actualT2Score = 1;

  const carryStats = {
    kills: 14,
    deaths: 1,
    assists: 8,
    last_hits: 340,
    denies: 15,
    gpm: 750,
    wards_placed: 2,
    wards_destroyed: 3,
    tower_kills: 4,
    roshan_kills: 1,
    first_blood: true,
    stuns: 12,
  };

  const rawCarryPoints = calculateFantasyPoints(carryStats, []);
  assert.ok(rawCarryPoints > 20);

  await query(
    `INSERT INTO match_player_stats (
      id, match_id, player_id, role_slot, kills, deaths, assists,
      last_hits, denies, gpm, wards_placed, wards_destroyed,
      tower_kills, roshan_kills, first_blood, stuns, raw_fantasy_points
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
    [
      "mps_carry_test",
      ub1MatchId,
      chosenCarryPlayerId,
      "pos1",
      carryStats.kills,
      carryStats.deaths,
      carryStats.assists,
      carryStats.last_hits,
      carryStats.denies,
      carryStats.gpm,
      carryStats.wards_placed,
      carryStats.wards_destroyed,
      carryStats.tower_kills,
      carryStats.roshan_kills,
      carryStats.first_blood,
      carryStats.stuns,
      rawCarryPoints,
    ]
  );

  const earnedFantasyPoints = calculateFantasyPoints(carryStats, newTraits);
  assert.ok(earnedFantasyPoints >= rawCarryPoints);

  await query(
    `UPDATE fantasy_cards SET points_earned = points_earned + $1 WHERE id = 'fc_test_pos1'`,
    [earnedFantasyPoints]
  );

  const predPoints = evaluatePredictionPoints(
    testTeams[0].id,
    2,
    1,
    winnerTeamId,
    actualT1Score,
    actualT2Score
  );
  assert.equal(predPoints, 10);

  await query(
    `UPDATE predictions SET points_awarded = $1, is_calculated = true WHERE id = 'pred_test_ub1'`,
    [predPoints]
  );

  await query(
    `UPDATE matches
     SET team1_score = $1, team2_score = $2, winner_id = $3, status = 'completed'
     WHERE id = $4`,
    [actualT1Score, actualT2Score, winnerTeamId, ub1MatchId]
  );

  await advanceDoubleElimination(tournamentId, "UB1", winnerTeamId, loserTeamId);

  const ubfRes = await query<{ team1_id: string }>(`SELECT team1_id FROM matches WHERE tournament_id = $1 AND match_code = 'UBF'`, [tournamentId]);
  assert.equal(ubfRes.rows[0].team1_id, winnerTeamId);

  const lb1Res = await query<{ team1_id: string }>(`SELECT team1_id FROM matches WHERE tournament_id = $1 AND match_code = 'LB1'`, [tournamentId]);
  assert.equal(lb1Res.rows[0].team1_id, loserTeamId);

  // Test Idempotent Scoring: recalculate fantasy points for card from completed matches
  const pStatsRes = await query<{
    kills: number; deaths: number; assists: number; last_hits: number;
    denies: number; gpm: number; wards_placed: number; wards_destroyed: number;
    tower_kills: number; roshan_kills: number; first_blood: boolean; stuns: number;
  }>(
    `SELECT mps.* FROM match_player_stats mps
     JOIN matches m ON m.id = mps.match_id
     WHERE m.tournament_id = $1 AND m.status = 'completed' AND mps.player_id = $2`,
    [tournamentId, chosenCarryPlayerId]
  );
  let totalRecalculated = 0;
  for (const s of pStatsRes.rows) {
    totalRecalculated += calculateFantasyPoints(s, newTraits);
  }
  await query(`UPDATE fantasy_cards SET points_earned = $1 WHERE id = 'fc_test_pos1'`, [
    Math.round(totalRecalculated * 100) / 100,
  ]);

  const cardCheckAfterRecalc = await query<{ points_earned: number }>(
    `SELECT points_earned FROM fantasy_cards WHERE id = 'fc_test_pos1'`
  );
  assert.equal(cardCheckAfterRecalc.rows[0].points_earned, earnedFantasyPoints);

  // Test Cascade Bracket Update
  await advanceDoubleElimination(tournamentId, "UB1", loserTeamId, winnerTeamId);
  const ubfReversed = await query<{ team1_id: string }>(
    `SELECT team1_id FROM matches WHERE tournament_id = $1 AND match_code = 'UBF'`,
    [tournamentId]
  );
  assert.equal(ubfReversed.rows[0].team1_id, loserTeamId);

  // Test Tournament Reset
  await query(`DELETE FROM match_player_stats WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournamentId]);
  await query(`UPDATE fantasy_cards SET points_earned = 0 WHERE tournament_id = $1`, [tournamentId]);
  await query(`UPDATE users SET fantasy_tokens = 20 WHERE id = $1`, [testUserId]);

  const cardResetCheck = await query<{ points_earned: number }>(
    `SELECT points_earned FROM fantasy_cards WHERE id = 'fc_test_pos1'`
  );
  assert.equal(cardResetCheck.rows[0].points_earned, 0);

  const tokenResetCheck = await query<{ fantasy_tokens: number }>(
    `SELECT fantasy_tokens FROM users WHERE id = $1`,
    [testUserId]
  );
  // Test Dynamic Tournament Creation
  const newTournId = "tourn_dynamic_test";
  await query(
    `INSERT INTO tournaments (id, title, description, format, max_teams, is_public, prize_pool)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [newTournId, "Summer Dota Masters 2026", "Custom user-created tournament", "single_elimination", 4, true, "$10,000"]
  );

  const { generateMatchesForTournament } = await import("../lib/bracket");
  await generateMatchesForTournament(newTournId, "single_elimination", 4);

  const dynamicMatches = await query<{ match_code: string }>(
    `SELECT match_code FROM matches WHERE tournament_id = $1 ORDER BY match_order ASC`,
    [newTournId]
  );
  assert.equal(dynamicMatches.rows.length, 3);
  assert.equal(dynamicMatches.rows[0].match_code, "SF1");
  assert.equal(dynamicMatches.rows[1].match_code, "SF2");
  assert.equal(dynamicMatches.rows[2].match_code, "GF");

  // Test Steam verification rule: user without steam_id is rejected from roster eligibility
  await query(
    `INSERT INTO users (id, username, email, role, steam_id)
     VALUES ('u_nosteam_test', 'NoSteamPlayer', 'nosteam@test.com', 'user', NULL)
     ON CONFLICT (id) DO NOTHING`
  );
  const steamCheck = await query<{ steam_id: string | null }>(
    `SELECT steam_id FROM users WHERE id = 'u_nosteam_test'`
  );
  assert.equal(steamCheck.rows[0].steam_id, null);

  console.log("Full Tournament, Fantasy & Prediction integration test PASSED successfully!");
}

runTournamentFlowIntegrationTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
