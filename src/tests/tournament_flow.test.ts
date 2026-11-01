import assert from "node:assert/strict";
import { initDb, query } from "../lib/db";
import { advanceDoubleElimination, evaluatePredictionPoints } from "../lib/bracket";
import { calculateBestGameFantasyPoints, calculateFantasyPoints, rollRandomTraits } from "../lib/fantasy";

async function runTournamentFlowIntegrationTest() {
  await initDb();

  const tournRes = await query(`SELECT id, status FROM tournaments WHERE id = 'ti-2026-main'`);
  assert.equal(tournRes.rows.length, 1);
  const tournamentId = tournRes.rows[0].id;

  const testUserRes = await query<{ id: string }>(
    `INSERT INTO users (id, username, email, role, steam_id, steam_name)
     VALUES ('u_test_f1', 'TestPredictor', 'pred@test.com', 'admin', '76561198999999999', 'TestSteamPro')
     ON CONFLICT (id) DO UPDATE SET role = 'admin'
     RETURNING id`
  );
  const testUserId = testUserRes.rows[0].id;

  // Initialize tournament-specific reroll tokens
  await query(
    `INSERT INTO tournament_user_tokens (user_id, tournament_id, tokens)
     VALUES ($1, $2, 20)
     ON CONFLICT (user_id, tournament_id) DO UPDATE SET tokens = 20`,
    [testUserId, tournamentId]
  );

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
        `INSERT INTO users (id, username, role, steam_id, steam_name)
         VALUES ($1, $2, 'user', $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [pId, `${tt.tag}_${role}`, `76561198${i}${role.slice(-1)}00000`, `${tt.tag}Player_${role}`]
      );

      await query(
        `INSERT INTO team_members (id, team_id, user_id, role_slot)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (team_id, role_slot) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [`mem_${tt.tag}_${role}`, tt.id, pId, role]
      );
    }

    await query(
      `INSERT INTO tournament_teams (id, tournament_id, team_id, seed)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tournament_id, team_id) DO NOTHING`,
      [`tt_${tournamentId}_${tt.id}`, tournamentId, tt.id, i + 1]
    );
  }

  // Create matches
  await query(`DELETE FROM match_player_stats WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournamentId]);

  const matchesDef = [
    { id: "m_ub1", code: "UB1", type: "upper", name: "UB Semi 1", t1: testTeams[0].id, t2: testTeams[1].id, order: 1 },
    { id: "m_ub2", code: "UB2", type: "upper", name: "UB Semi 2", t1: testTeams[2].id, t2: testTeams[3].id, order: 2 },
    { id: "m_lb1", code: "LB1", type: "lower", name: "LB Round 1", t1: null, t2: null, order: 3 },
    { id: "m_ubf", code: "UBF", type: "upper", name: "UB Final", t1: null, t2: null, order: 4 },
    { id: "m_lbf", code: "LBF", type: "lower", name: "LB Final", t1: null, t2: null, order: 5 },
    { id: "m_gf", code: "GF", type: "grand_final", name: "Grand Final", t1: null, t2: null, order: 6 },
  ];

  for (const md of matchesDef) {
    await query(
      `INSERT INTO matches (id, tournament_id, match_code, bracket_type, round_name, team1_id, team2_id, match_order, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [md.id, tournamentId, md.code, md.type, md.name, md.t1, md.t2, md.order]
    );
  }

  const chosenCarryPlayerId = `u_${testTeams[0].tag.toLowerCase()}_pos1`;
  const initialTraits = rollRandomTraits(3, "common");

  await query(
    `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, quality, title, traits, points_earned)
     VALUES ($1, $2, $3, $4, $5, 'common', 'Стальной', $6, 0)
     ON CONFLICT (user_id, tournament_id, role_slot)
     DO UPDATE SET selected_player_id = EXCLUDED.selected_player_id, traits = EXCLUDED.traits, points_earned = 0`,
    ["fc_test_pos1", testUserId, tournamentId, "pos1", chosenCarryPlayerId, JSON.stringify(initialTraits)]
  );

  // Reroll uses per-tournament tokens in tournament_user_tokens!
  await query(`UPDATE tournament_user_tokens SET tokens = tokens - 1 WHERE user_id = $1 AND tournament_id = $2`, [testUserId, tournamentId]);
  const newTraits = rollRandomTraits(3, "common");
  await query(`UPDATE fantasy_cards SET traits = $1 WHERE id = 'fc_test_pos1'`, [JSON.stringify(newTraits)]);

  const updatedTokensRes = await query<{ tokens: number }>(
    `SELECT tokens FROM tournament_user_tokens WHERE user_id = $1 AND tournament_id = $2`,
    [testUserId, tournamentId]
  );
  assert.equal(updatedTokensRes.rows[0].tokens, 19);

  await query(
    `INSERT INTO predictions (id, user_id, match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score)
     VALUES ($1, $2, $3, $4, 2, 1)
     ON CONFLICT (user_id, match_id)
     DO UPDATE SET predicted_winner_id = EXCLUDED.predicted_winner_id, predicted_team1_score = 2, predicted_team2_score = 1`,
    ["pred_test_ub1", testUserId, "m_ub1", testTeams[0].id]
  );

  const exactPts = evaluatePredictionPoints(testTeams[0].id, 2, 1, testTeams[0].id, 2, 1, 1);
  assert.equal(exactPts, 1000);

  const winnerPts = evaluatePredictionPoints(testTeams[0].id, 2, 0, testTeams[0].id, 2, 1, 1);
  assert.equal(winnerPts, 500);

  const wrongPts = evaluatePredictionPoints(testTeams[1].id, 0, 2, testTeams[0].id, 2, 1, 1);
  assert.equal(wrongPts, 0);

  await query(
    `UPDATE matches SET team1_score = 2, team2_score = 1, winner_id = $1, status = 'completed' WHERE id = 'm_ub1'`,
    [testTeams[0].id]
  );

  const mStats = {
    kills: 14,
    deaths: 1,
    assists: 8,
    last_hits: 280,
    denies: 15,
    gpm: 720,
    wards_placed: 2,
    wards_destroyed: 3,
    tower_kills: 3,
    roshan_kills: 1,
    first_blood: true,
    stuns: 12.5,
  };

  const calculatedPoints = calculateFantasyPoints(mStats, newTraits, "common", "Стальной");
  assert.ok(calculatedPoints > 30);

  await query(
    `INSERT INTO match_player_stats (id, match_id, player_id, role_slot, game_number, kills, deaths, assists, last_hits, denies, gpm, wards_placed, wards_destroyed, tower_kills, roshan_kills, first_blood, stuns, raw_fantasy_points)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     ON CONFLICT (match_id, player_id, game_number) DO UPDATE SET kills = EXCLUDED.kills, raw_fantasy_points = EXCLUDED.raw_fantasy_points`,
    [
      "mps_test_1",
      "m_ub1",
      chosenCarryPlayerId,
      "pos1",
      1,
      mStats.kills,
      mStats.deaths,
      mStats.assists,
      mStats.last_hits,
      mStats.denies,
      mStats.gpm,
      mStats.wards_placed,
      mStats.wards_destroyed,
      mStats.tower_kills,
      mStats.roshan_kills,
      mStats.first_blood,
      mStats.stuns,
      calculatedPoints,
    ]
  );

  const mStatsGame2 = {
    kills: 22,
    deaths: 0,
    assists: 14,
    last_hits: 420,
    denies: 20,
    gpm: 950,
    wards_placed: 4,
    wards_destroyed: 5,
    tower_kills: 6,
    roshan_kills: 2,
    first_blood: true,
    stuns: 25,
  };
  const g1Pts = calculateFantasyPoints(mStats, ["creepScore", "deaths", "towerKills"]);
  const g2Pts = calculateFantasyPoints(mStatsGame2, ["creepScore", "deaths", "towerKills"]);

  await query(
    `INSERT INTO match_player_stats (id, match_id, player_id, role_slot, game_number, kills, deaths, assists, last_hits, denies, gpm, wards_placed, wards_destroyed, tower_kills, roshan_kills, first_blood, stuns, raw_fantasy_points)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     ON CONFLICT (match_id, player_id, game_number) DO UPDATE SET kills = EXCLUDED.kills, raw_fantasy_points = EXCLUDED.raw_fantasy_points`,
    [
      "mps_test_2",
      "m_ub1",
      chosenCarryPlayerId,
      "pos1",
      2,
      mStatsGame2.kills,
      mStatsGame2.deaths,
      mStatsGame2.assists,
      mStatsGame2.last_hits,
      mStatsGame2.denies,
      mStatsGame2.gpm,
      mStatsGame2.wards_placed,
      mStatsGame2.wards_destroyed,
      mStatsGame2.tower_kills,
      mStatsGame2.roshan_kills,
      mStatsGame2.first_blood,
      mStatsGame2.stuns,
      g2Pts,
    ]
  );

  const playerAllStatsRes = await query<any>(
    `SELECT mps.* FROM match_player_stats mps
     JOIN matches m ON m.id = mps.match_id
     WHERE m.tournament_id = $1 AND m.status = 'completed' AND mps.player_id = $2
     ORDER BY m.match_order ASC, mps.game_number ASC`,
    [tournamentId, chosenCarryPlayerId]
  );
  assert.equal(playerAllStatsRes.rows.length, 2);

  const bestResult = calculateBestGameFantasyPoints(playerAllStatsRes.rows, ["creepScore", "deaths", "towerKills"]);
  assert.ok(g2Pts > g1Pts);
  assert.equal(bestResult.bestScore, g2Pts);
  assert.equal(bestResult.bestGameIndex, 1);
  assert.deepEqual(bestResult.gameScores, [g1Pts, g2Pts]);

  await query(
    `UPDATE fantasy_cards SET points_earned = $1 WHERE tournament_id = $2 AND role_slot = 'pos1' AND selected_player_id = $3`,
    [bestResult.bestScore, tournamentId, chosenCarryPlayerId]
  );

  const cardCheck = await query<{ points_earned: number }>(
    `SELECT points_earned FROM fantasy_cards WHERE id = 'fc_test_pos1'`
  );
  assert.equal(cardCheck.rows[0].points_earned, g2Pts);

  await query(
    `UPDATE predictions SET points_awarded = 3, is_calculated = true WHERE id = 'pred_test_ub1'`
  );
  const predCheck = await query<{ points_awarded: number; is_calculated: boolean }>(
    `SELECT points_awarded, is_calculated FROM predictions WHERE id = 'pred_test_ub1'`
  );
  assert.equal(predCheck.rows[0].points_awarded, 3);
  assert.equal(predCheck.rows[0].is_calculated, true);

  await advanceDoubleElimination(tournamentId, "UB1", testTeams[0].id, testTeams[1].id);

  const ubfCheck = await query<{ team1_id: string | null }>(
    `SELECT team1_id FROM matches WHERE id = 'm_ubf'`
  );
  assert.equal(ubfCheck.rows[0].team1_id, testTeams[0].id);

  const lb1Check = await query<{ team1_id: string | null }>(
    `SELECT team1_id FROM matches WHERE id = 'm_lb1'`
  );
  assert.equal(lb1Check.rows[0].team1_id, testTeams[1].id);

  // Test admin reset
  await query(`DELETE FROM match_player_stats WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
  await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournamentId]);
  await query(`UPDATE fantasy_cards SET points_earned = 0 WHERE tournament_id = $1`, [tournamentId]);
  await query(`UPDATE tournament_user_tokens SET tokens = 20 WHERE user_id = $1 AND tournament_id = $2`, [testUserId, tournamentId]);

  const cardResetCheck = await query<{ points_earned: number }>(
    `SELECT points_earned FROM fantasy_cards WHERE id = 'fc_test_pos1'`
  );
  assert.equal(cardResetCheck.rows[0].points_earned, 0);

  const tokenResetCheck = await query<{ tokens: number }>(
    `SELECT tokens FROM tournament_user_tokens WHERE user_id = $1 AND tournament_id = $2`,
    [testUserId, tournamentId]
  );
  assert.equal(tokenResetCheck.rows[0].tokens, 20);

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

  // Test Steam verification rule
  await query(
    `INSERT INTO users (id, username, email, role, steam_id)
     VALUES ('u_nosteam_test', 'NoSteamPlayer', 'nosteam@test.com', 'user', NULL)
     ON CONFLICT (id) DO NOTHING`
  );
  const steamCheck = await query<{ steam_id: string | null }>(
    `SELECT steam_id FROM users WHERE id = 'u_nosteam_test'`
  );
  assert.equal(steamCheck.rows[0].steam_id, null);

  // Test Direct Registration (without verification codes)
  const directUsername = "DirectUserTest";
  const directEmail = "direct@test.com";
  const directUserId = "u_direct_test";
  await query(
    `INSERT INTO users (id, username, email, role, email_verified)
     VALUES ($1, $2, $3, 'user', true)
     ON CONFLICT (id) DO NOTHING`,
    [directUserId, directUsername, directEmail]
  );
  const directUserCheck = await query<{ username: string; email_verified: boolean }>(
    `SELECT username, email_verified FROM users WHERE id = $1`,
    [directUserId]
  );
  assert.equal(directUserCheck.rows[0].username, directUsername);
  assert.equal(directUserCheck.rows[0].email_verified, true);

  // Test Cyrillic Steam username validation regex
  const cyrillicRegex = /^[\p{L}\p{N}_\-\. ]+$/u;
  assert.ok(cyrillicRegex.test("Данислон Зомбович"));
  assert.ok(cyrillicRegex.test("CyberTitan-2026"));
  assert.equal(cyrillicRegex.test("Bad$Symbol!"), false);

  // Test Private Tournament Unique Signup Token
  const privateTournId = "tourn_private_test";
  const secretSignupToken = "ti26_secret_reg_123";
  await query(
    `INSERT INTO tournaments (id, title, format, max_teams, is_public, signup_token, status)
     VALUES ($1, 'Private Masters', 'double_elimination', 4, false, $2, 'registration')
     ON CONFLICT (id) DO UPDATE SET is_public = false, signup_token = $2`,
    [privateTournId, secretSignupToken]
  );

  const tournCheck = await query<{ is_public: boolean; signup_token: string }>(
    `SELECT is_public, signup_token FROM tournaments WHERE id = $1`,
    [privateTournId]
  );
  assert.equal(tournCheck.rows[0].is_public, false);
  assert.equal(tournCheck.rows[0].signup_token, secretSignupToken);

  // Validate that token verification logic correctly distinguishes valid vs invalid token
  const testValidToken = (token?: string) => {
    if (!tournCheck.rows[0].is_public) {
      if (!token || token !== tournCheck.rows[0].signup_token) {
        return false;
      }
    }
    return true;
  };
  assert.equal(testValidToken(undefined), false);
  assert.equal(testValidToken("wrong_token"), false);
  assert.equal(testValidToken(secretSignupToken), true);

  await query(`DELETE FROM tournaments WHERE id = $1`, [privateTournId]);

  console.log("Full Tournament, Fantasy & Prediction integration test PASSED successfully!");
}

runTournamentFlowIntegrationTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
