import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { advanceDoubleElimination, evaluatePredictionPoints } from "@/lib/bracket";
import { query } from "@/lib/db";
import { calculateFantasyPoints, PlayerStats, RolledTrait } from "@/lib/fantasy";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещен: требуется роль администратора" }, { status: 403 });
    }

    const {
      match_id,
      team1_score,
      team2_score,
      winner_id,
      player_stats,
      generate_realistic_stats,
    } = await req.json();

    if (!match_id || team1_score === undefined || team2_score === undefined || !winner_id) {
      return NextResponse.json({ error: "Не заполнены основные данные матча" }, { status: 400 });
    }

    const matchRes = await query<{
      id: string;
      tournament_id: string;
      match_code: string;
      team1_id: string | null;
      team2_id: string | null;
      status: string;
    }>(
      `SELECT id, tournament_id, match_code, team1_id, team2_id, status FROM matches WHERE id = $1`,
      [match_id]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: "Матч не найден" }, { status: 404 });
    }

    const match = matchRes.rows[0];
    if (!match.team1_id || !match.team2_id) {
      return NextResponse.json({ error: "В матче еще не определены обе команды" }, { status: 400 });
    }

    const t1s = parseInt(team1_score, 10);
    const t2s = parseInt(team2_score, 10);

    if (winner_id !== match.team1_id && winner_id !== match.team2_id) {
      return NextResponse.json({ error: "Победитель должен быть одной из команд матча" }, { status: 400 });
    }

    const loserId = winner_id === match.team1_id ? match.team2_id : match.team1_id;

    const playersInMatchRes = await query<{
      user_id: string;
      username: string;
      role_slot: string;
      team_id: string;
    }>(
      `SELECT tm.user_id, u.username, tm.role_slot, tm.team_id
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id IN ($1, $2) AND tm.role_slot IN ('pos1', 'pos2', 'pos3', 'pos4', 'pos5')`,
      [match.team1_id, match.team2_id]
    );

    let finalStats: Array<{
      player_id: string;
      role_slot: string;
      stats: PlayerStats;
    }> = [];

    if (player_stats && Array.isArray(player_stats) && player_stats.length > 0) {
      finalStats = player_stats;
    } else if (generate_realistic_stats || (!player_stats || player_stats.length === 0)) {
      for (const p of playersInMatchRes.rows) {
        const isWinner = p.team_id === winner_id;
        let kills = 0, deaths = 0, assists = 0, last_hits = 0, denies = 0, gpm = 0;
        let wards_placed = 0, wards_destroyed = 0, tower_kills = 0, roshan_kills = 0;
        let first_blood = false, stuns = 0;

        if (p.role_slot === "pos1") {
          kills = isWinner ? Math.floor(8 + Math.random() * 8) : Math.floor(3 + Math.random() * 6);
          deaths = isWinner ? Math.floor(1 + Math.random() * 3) : Math.floor(4 + Math.random() * 5);
          assists = Math.floor(6 + Math.random() * 8);
          last_hits = Math.floor(320 + Math.random() * 180);
          denies = Math.floor(12 + Math.random() * 15);
          gpm = isWinner ? Math.floor(680 + Math.random() * 180) : Math.floor(480 + Math.random() * 120);
          tower_kills = isWinner ? Math.floor(2 + Math.random() * 4) : Math.floor(Math.random() * 2);
          roshan_kills = isWinner ? Math.floor(1 + Math.random() * 2) : 0;
          first_blood = isWinner && Math.random() < 0.25;
          stuns = Math.floor(10 + Math.random() * 25);
        } else if (p.role_slot === "pos2") {
          kills = isWinner ? Math.floor(9 + Math.random() * 8) : Math.floor(4 + Math.random() * 6);
          deaths = isWinner ? Math.floor(2 + Math.random() * 4) : Math.floor(4 + Math.random() * 6);
          assists = Math.floor(8 + Math.random() * 10);
          last_hits = Math.floor(280 + Math.random() * 140);
          denies = Math.floor(14 + Math.random() * 12);
          gpm = isWinner ? Math.floor(620 + Math.random() * 160) : Math.floor(460 + Math.random() * 110);
          tower_kills = isWinner ? Math.floor(1 + Math.random() * 3) : Math.floor(Math.random() * 2);
          roshan_kills = isWinner && Math.random() < 0.3 ? 1 : 0;
          first_blood = isWinner && Math.random() < 0.35;
          stuns = Math.floor(15 + Math.random() * 30);
        } else if (p.role_slot === "pos3") {
          kills = isWinner ? Math.floor(5 + Math.random() * 6) : Math.floor(2 + Math.random() * 5);
          deaths = isWinner ? Math.floor(3 + Math.random() * 4) : Math.floor(5 + Math.random() * 6);
          assists = Math.floor(12 + Math.random() * 12);
          last_hits = Math.floor(200 + Math.random() * 100);
          denies = Math.floor(8 + Math.random() * 10);
          gpm = isWinner ? Math.floor(480 + Math.random() * 120) : Math.floor(360 + Math.random() * 80);
          tower_kills = isWinner ? Math.floor(1 + Math.random() * 3) : 0;
          roshan_kills = 0;
          first_blood = Math.random() < 0.2;
          stuns = Math.floor(30 + Math.random() * 40);
        } else if (p.role_slot === "pos4") {
          kills = isWinner ? Math.floor(3 + Math.random() * 5) : Math.floor(1 + Math.random() * 4);
          deaths = isWinner ? Math.floor(3 + Math.random() * 5) : Math.floor(6 + Math.random() * 6);
          assists = Math.floor(15 + Math.random() * 15);
          last_hits = Math.floor(80 + Math.random() * 60);
          denies = Math.floor(3 + Math.random() * 5);
          gpm = isWinner ? Math.floor(360 + Math.random() * 90) : Math.floor(280 + Math.random() * 60);
          wards_placed = Math.floor(6 + Math.random() * 8);
          wards_destroyed = Math.floor(3 + Math.random() * 5);
          tower_kills = 0;
          roshan_kills = 0;
          first_blood = Math.random() < 0.15;
          stuns = Math.floor(25 + Math.random() * 35);
        } else {
          kills = isWinner ? Math.floor(1 + Math.random() * 3) : Math.floor(Math.random() * 3);
          deaths = isWinner ? Math.floor(4 + Math.random() * 5) : Math.floor(7 + Math.random() * 6);
          assists = Math.floor(16 + Math.random() * 14);
          last_hits = Math.floor(50 + Math.random() * 40);
          denies = Math.floor(4 + Math.random() * 6);
          gpm = isWinner ? Math.floor(310 + Math.random() * 70) : Math.floor(240 + Math.random() * 50);
          wards_placed = Math.floor(14 + Math.random() * 12);
          wards_destroyed = Math.floor(6 + Math.random() * 8);
          tower_kills = 0;
          roshan_kills = 0;
          first_blood = Math.random() < 0.1;
          stuns = Math.floor(20 + Math.random() * 30);
        }

        finalStats.push({
          player_id: p.user_id,
          role_slot: p.role_slot,
          stats: {
            kills,
            deaths,
            assists,
            last_hits,
            denies,
            gpm,
            wards_placed,
            wards_destroyed,
            tower_kills,
            roshan_kills,
            first_blood,
            stuns,
          },
        });
      }
    }

    await query(`DELETE FROM match_player_stats WHERE match_id = $1`, [match.id]);

    for (const item of finalStats) {
      const rawPoints = calculateFantasyPoints(item.stats, []);
      const statId = "mps_" + crypto.randomBytes(8).toString("hex");

      await query(
        `INSERT INTO match_player_stats (
          id, match_id, player_id, role_slot, kills, deaths, assists,
          last_hits, denies, gpm, wards_placed, wards_destroyed,
          tower_kills, roshan_kills, first_blood, stuns, raw_fantasy_points
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          statId,
          match.id,
          item.player_id,
          item.role_slot,
          item.stats.kills,
          item.stats.deaths,
          item.stats.assists,
          item.stats.last_hits,
          item.stats.denies,
          item.stats.gpm,
          item.stats.wards_placed,
          item.stats.wards_destroyed,
          item.stats.tower_kills,
          item.stats.roshan_kills,
          item.stats.first_blood,
          item.stats.stuns,
          rawPoints,
        ]
      );
    }

    for (const item of finalStats) {
      const cardsRes = await query<{
        id: string;
        user_id: string;
        traits: any;
      }>(
        `SELECT id, user_id, traits FROM fantasy_cards
         WHERE tournament_id = $1 AND role_slot = $2 AND selected_player_id = $3`,
        [match.tournament_id, item.role_slot, item.player_id]
      );

      for (const card of cardsRes.rows) {
        let traits: RolledTrait[] = [];
        if (typeof card.traits === "string") {
          try {
            traits = JSON.parse(card.traits);
          } catch {}
        } else if (Array.isArray(card.traits)) {
          traits = card.traits;
        }

        const earned = calculateFantasyPoints(item.stats, traits);
        await query(
          `UPDATE fantasy_cards SET points_earned = points_earned + $1 WHERE id = $2`,
          [earned, card.id]
        );
      }
    }

    const predictionsRes = await query<{
      id: string;
      user_id: string;
      predicted_winner_id: string;
      predicted_team1_score: number;
      predicted_team2_score: number;
    }>(
      `SELECT id, user_id, predicted_winner_id, predicted_team1_score, predicted_team2_score
       FROM predictions WHERE match_id = $1`,
      [match.id]
    );

    for (const p of predictionsRes.rows) {
      const pts = evaluatePredictionPoints(
        p.predicted_winner_id,
        p.predicted_team1_score,
        p.predicted_team2_score,
        winner_id,
        t1s,
        t2s
      );

      await query(
        `UPDATE predictions SET points_awarded = $1, is_calculated = true WHERE id = $2`,
        [pts, p.id]
      );
    }

    await query(
      `UPDATE matches
       SET team1_score = $1, team2_score = $2, winner_id = $3, status = 'completed'
       WHERE id = $4`,
      [t1s, t2s, winner_id, match.id]
    );

    await advanceDoubleElimination(match.tournament_id, match.match_code, winner_id, loserId);

    return NextResponse.json({
      success: true,
      message: `Результат матча ${match.match_code} сохранен! Очки фэнтези и прогнозов начислены, сетка обновлена.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
