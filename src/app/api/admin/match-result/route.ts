import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { advanceDoubleElimination, recalculateTournamentPredictions } from "@/lib/bracket";
import { query } from "@/lib/db";
import {
  calculateBestGameFantasyPoints,
  calculateFantasyPoints,
  DEFAULT_ROLE_EMBLEMS,
  extractEmblemIds,
  PlayerStats,
} from "@/lib/fantasy";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещен: требуется роль администратора" }, { status: 403 });
    }

    const body = await req.json();
    const {
      match_id,
      team1_score,
      team2_score,
      winner_id,
      player_stats,
      generate_realistic_stats,
      generate_stats,
      format: inputFormat,
    } = body;

    if (!match_id || team1_score === undefined || team2_score === undefined || !winner_id) {
      return NextResponse.json({ error: "Не заполнены основные данные матча" }, { status: 400 });
    }

    const matchRes = await query<{
      id: string;
      tournament_id: string;
      match_code: string;
      round_name: string;
      team1_id: string | null;
      team2_id: string | null;
      status: string;
    }>(
      `SELECT id, tournament_id, match_code, round_name, team1_id, team2_id, status FROM matches WHERE id = $1`,
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

    if (isNaN(t1s) || isNaN(t2s) || t1s < 0 || t2s < 0) {
      return NextResponse.json({ error: "Некорректный счет матча" }, { status: 400 });
    }

    let seriesFormat = (inputFormat || "").toLowerCase();
    if (!seriesFormat) {
      if ((t1s === 3 || t2s === 3) && [3, 4, 5].includes(t1s + t2s)) {
        seriesFormat = "bo5";
      } else if ((t1s === 1 && t2s === 0) || (t1s === 0 && t2s === 1)) {
        seriesFormat = "bo1";
      } else {
        const lowerRound = (match.round_name || "").toLowerCase();
        if (lowerRound.includes("bo1")) {
          seriesFormat = "bo1";
        } else if (lowerRound.includes("bo5")) {
          seriesFormat = "bo5";
        } else {
          seriesFormat = "bo3";
        }
      }
    }

    if (seriesFormat === "bo1") {
      const isValidBo1 = (t1s === 1 && t2s === 0) || (t1s === 0 && t2s === 1);
      if (!isValidBo1) {
        return NextResponse.json({ error: "Для серии Bo1 счет должен быть 1:0 или 0:1" }, { status: 400 });
      }
    } else if (seriesFormat === "bo5") {
      const validBo5 = [
        [3, 0], [3, 1], [3, 2],
        [0, 3], [1, 3], [2, 3],
      ];
      const isValidBo5 = validBo5.some(([a, b]) => a === t1s && b === t2s);
      if (!isValidBo5) {
        return NextResponse.json({ error: "Для серии Bo5 счет должен быть 3:0, 3:1, 3:2, 0:3, 1:3 или 2:3" }, { status: 400 });
      }
    } else {
      const validBo3 = [
        [2, 0], [2, 1],
        [0, 2], [1, 2],
      ];
      const isValidBo3 = validBo3.some(([a, b]) => a === t1s && b === t2s);
      if (!isValidBo3) {
        return NextResponse.json({ error: "Для серии Bo3 счет должен быть 2:0, 2:1, 0:2 или 1:2" }, { status: 400 });
      }
    }

    if (t1s > t2s && winner_id !== match.team1_id) {
      return NextResponse.json({ error: "Победителем должна быть команда 1 при счете в ее пользу" }, { status: 400 });
    }
    if (t2s > t1s && winner_id !== match.team2_id) {
      return NextResponse.json({ error: "Победителем должна быть команда 2 при счете в ее пользу" }, { status: 400 });
    }

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
      game_number: number;
      stats: PlayerStats;
    }> = [];

    const shouldGenerateStats =
      generate_realistic_stats ??
      generate_stats ??
      (!player_stats || player_stats.length === 0);

    if (player_stats && Array.isArray(player_stats) && player_stats.length > 0) {
      finalStats = player_stats.map((it: any) => ({
        player_id: it.player_id,
        role_slot: it.role_slot,
        game_number: it.game_number || 1,
        stats: it.stats,
      }));
    } else if (shouldGenerateStats) {
      const totalGames = t1s + t2s;
      const gameWinners: string[] = [];

      if (seriesFormat === "bo1") {
        gameWinners.push(winner_id);
      } else if (seriesFormat === "bo5") {
        if (t1s === 3 && t2s === 0) {
          gameWinners.push(match.team1_id, match.team1_id, match.team1_id);
        } else if (t1s === 0 && t2s === 3) {
          gameWinners.push(match.team2_id, match.team2_id, match.team2_id);
        } else if (t1s === 3 && t2s === 1) {
          gameWinners.push(match.team1_id, match.team2_id, match.team1_id, match.team1_id);
        } else if (t1s === 1 && t2s === 3) {
          gameWinners.push(match.team2_id, match.team1_id, match.team2_id, match.team2_id);
        } else if (t1s === 3 && t2s === 2) {
          gameWinners.push(match.team1_id, match.team2_id, match.team1_id, match.team2_id, match.team1_id);
        } else if (t1s === 2 && t2s === 3) {
          gameWinners.push(match.team2_id, match.team1_id, match.team2_id, match.team1_id, match.team2_id);
        } else {
          for (let g = 0; g < totalGames; g++) {
            gameWinners.push(winner_id);
          }
        }
      } else {
        if (t1s === 2 && t2s === 0) {
          gameWinners.push(match.team1_id, match.team1_id);
        } else if (t1s === 0 && t2s === 2) {
          gameWinners.push(match.team2_id, match.team2_id);
        } else if (t1s === 2 && t2s === 1) {
          gameWinners.push(match.team1_id, match.team2_id, match.team1_id);
        } else if (t1s === 1 && t2s === 2) {
          gameWinners.push(match.team2_id, match.team1_id, match.team2_id);
        } else {
          for (let g = 0; g < totalGames; g++) {
            gameWinners.push(winner_id);
          }
        }
      }

      for (let g = 0; g < gameWinners.length; g++) {
        const gameNumber = g + 1;
        const currentGameWinner = gameWinners[g];

        for (const p of playersInMatchRes.rows) {
          const isWinner = p.team_id === currentGameWinner;
          let kills = 0, deaths = 0, assists = 0, last_hits = 0, denies = 0, gpm = 0;
          let wards_placed = 0, wards_destroyed = 0, tower_kills = 0, roshan_kills = 0;
          let first_blood = false, stuns = 0;
          let madstones = 0, camps_stacked = 0, runes = 0, watchers = 0, lotuses = 0, smokes = 0;
          let teamfight_pct = 0.6, tormentor_kills = 0, courier_kills = 0;

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
            madstones = Math.floor(15 + Math.random() * 20);
            camps_stacked = Math.floor(1 + Math.random() * 4);
            runes = Math.floor(2 + Math.random() * 5);
            watchers = Math.floor(1 + Math.random() * 4);
            lotuses = Math.floor(2 + Math.random() * 5);
            smokes = Math.floor(Math.random() * 2);
            teamfight_pct = isWinner ? 0.65 + Math.random() * 0.25 : 0.5 + Math.random() * 0.25;
            tormentor_kills = isWinner && Math.random() < 0.4 ? 1 : 0;
            courier_kills = Math.random() < 0.15 ? 1 : 0;
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
            madstones = Math.floor(10 + Math.random() * 18);
            camps_stacked = Math.floor(1 + Math.random() * 3);
            runes = Math.floor(6 + Math.random() * 8);
            watchers = Math.floor(2 + Math.random() * 5);
            lotuses = Math.floor(2 + Math.random() * 5);
            smokes = Math.floor(1 + Math.random() * 2);
            teamfight_pct = isWinner ? 0.7 + Math.random() * 0.25 : 0.55 + Math.random() * 0.25;
            tormentor_kills = isWinner && Math.random() < 0.35 ? 1 : 0;
            courier_kills = Math.random() < 0.2 ? 1 : 0;
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
            madstones = Math.floor(8 + Math.random() * 15);
            camps_stacked = Math.floor(2 + Math.random() * 5);
            runes = Math.floor(3 + Math.random() * 6);
            watchers = Math.floor(3 + Math.random() * 6);
            lotuses = Math.floor(3 + Math.random() * 6);
            smokes = Math.floor(1 + Math.random() * 3);
            teamfight_pct = isWinner ? 0.72 + Math.random() * 0.23 : 0.58 + Math.random() * 0.25;
            tormentor_kills = isWinner && Math.random() < 0.5 ? 1 : 0;
            courier_kills = Math.random() < 0.15 ? 1 : 0;
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
            madstones = Math.floor(5 + Math.random() * 10);
            camps_stacked = Math.floor(4 + Math.random() * 8);
            runes = Math.floor(5 + Math.random() * 7);
            watchers = Math.floor(5 + Math.random() * 7);
            lotuses = Math.floor(4 + Math.random() * 6);
            smokes = Math.floor(2 + Math.random() * 4);
            teamfight_pct = isWinner ? 0.75 + Math.random() * 0.22 : 0.6 + Math.random() * 0.25;
            tormentor_kills = isWinner && Math.random() < 0.3 ? 1 : 0;
            courier_kills = Math.random() < 0.25 ? 1 : 0;
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
            madstones = Math.floor(3 + Math.random() * 8);
            camps_stacked = Math.floor(3 + Math.random() * 7);
            runes = Math.floor(4 + Math.random() * 6);
            watchers = Math.floor(6 + Math.random() * 8);
            lotuses = Math.floor(3 + Math.random() * 5);
            smokes = Math.floor(2 + Math.random() * 4);
            teamfight_pct = isWinner ? 0.75 + Math.random() * 0.22 : 0.6 + Math.random() * 0.25;
            tormentor_kills = isWinner && Math.random() < 0.2 ? 1 : 0;
            courier_kills = Math.random() < 0.3 ? 1 : 0;
          }

          finalStats.push({
            player_id: p.user_id,
            role_slot: p.role_slot,
            game_number: gameNumber,
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
              madstones,
              camps_stacked,
              runes,
              watchers,
              lotuses,
              smokes,
              teamfight_pct,
              tormentor_kills,
              courier_kills,
            },
          });
        }
      }
    }

    await query(`DELETE FROM match_player_stats WHERE match_id = $1`, [match.id]);

    if (finalStats.length > 0) {
      const placeholders: string[] = [];
      const queryParams: any[] = [];
      let pIdx = 1;

      for (const item of finalStats) {
        const rawPoints = calculateFantasyPoints(item.stats, DEFAULT_ROLE_EMBLEMS[item.role_slot] || []);
        const statId = "mps_" + crypto.randomBytes(8).toString("hex");

        placeholders.push(
          `($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`
        );

        queryParams.push(
          statId,
          match.id,
          item.player_id,
          item.role_slot,
          item.game_number || 1,
          item.stats.kills,
          item.stats.deaths,
          item.stats.assists,
          item.stats.last_hits,
          item.stats.denies,
          item.stats.gpm,
          item.stats.wards_placed,
          item.stats.wards_destroyed || 0,
          item.stats.tower_kills,
          item.stats.roshan_kills,
          item.stats.first_blood,
          item.stats.stuns,
          item.stats.madstones || 0,
          item.stats.camps_stacked || 0,
          item.stats.runes || 0,
          item.stats.watchers || 0,
          item.stats.lotuses || 0,
          item.stats.smokes || 0,
          item.stats.teamfight_pct || 0.6,
          item.stats.tormentor_kills || 0,
          item.stats.courier_kills || 0,
          rawPoints
        );
      }

      await query(
        `INSERT INTO match_player_stats (
          id, match_id, player_id, role_slot, game_number, kills, deaths, assists,
          last_hits, denies, gpm, wards_placed, wards_destroyed,
          tower_kills, roshan_kills, first_blood, stuns,
          madstones, camps_stacked, runes, watchers, lotuses, smokes,
          teamfight_pct, tormentor_kills, courier_kills, raw_fantasy_points
        ) VALUES ${placeholders.join(", ")}
        ON CONFLICT (match_id, player_id, game_number) DO UPDATE SET
          kills = EXCLUDED.kills,
          deaths = EXCLUDED.deaths,
          assists = EXCLUDED.assists,
          last_hits = EXCLUDED.last_hits,
          denies = EXCLUDED.denies,
          gpm = EXCLUDED.gpm,
          wards_placed = EXCLUDED.wards_placed,
          wards_destroyed = EXCLUDED.wards_destroyed,
          tower_kills = EXCLUDED.tower_kills,
          roshan_kills = EXCLUDED.roshan_kills,
          first_blood = EXCLUDED.first_blood,
          stuns = EXCLUDED.stuns,
          madstones = EXCLUDED.madstones,
          camps_stacked = EXCLUDED.camps_stacked,
          runes = EXCLUDED.runes,
          watchers = EXCLUDED.watchers,
          lotuses = EXCLUDED.lotuses,
          smokes = EXCLUDED.smokes,
          teamfight_pct = EXCLUDED.teamfight_pct,
          tormentor_kills = EXCLUDED.tormentor_kills,
          courier_kills = EXCLUDED.courier_kills,
          raw_fantasy_points = EXCLUDED.raw_fantasy_points`,
        queryParams
      );
    }

    await query(
      `UPDATE matches
       SET team1_score = $1, team2_score = $2, winner_id = $3, status = 'completed'
       WHERE id = $4`,
      [t1s, t2s, winner_id, match.id]
    );

    await advanceDoubleElimination(match.tournament_id, match.match_code, winner_id, loserId);

    await recalculateTournamentPredictions(match.tournament_id);

    const allCardsRes = await query<{
      id: string;
      role_slot: string;
      selected_player_id: string | null;
      traits: any;
      emblems: any;
    }>(
      `SELECT id, role_slot, selected_player_id, traits, emblems FROM fantasy_cards WHERE tournament_id = $1`,
      [match.tournament_id]
    );

    if (allCardsRes.rows.length > 0) {
      const allStatsRes = await query<PlayerStats & { player_id: string }>(
        `SELECT mps.* FROM match_player_stats mps
         JOIN matches m ON m.id = mps.match_id
         WHERE m.tournament_id = $1 AND m.status = 'completed'
         ORDER BY m.match_order ASC, mps.game_number ASC`,
        [match.tournament_id]
      );

      const statsByPlayer: Record<string, PlayerStats[]> = {};
      for (const s of allStatsRes.rows) {
        if (!statsByPlayer[s.player_id]) {
          statsByPlayer[s.player_id] = [];
        }
        statsByPlayer[s.player_id].push(s);
      }

      const cardIds: string[] = [];
      const cardScores: number[] = [];

      for (const card of allCardsRes.rows) {
        cardIds.push(card.id);
        if (!card.selected_player_id) {
          cardScores.push(0);
          continue;
        }

        const emblemIds = extractEmblemIds(card.emblems, card.traits, card.role_slot);
        const playerStats = statsByPlayer[card.selected_player_id] || [];
        const bestGameResult = calculateBestGameFantasyPoints(playerStats, emblemIds);
        cardScores.push(bestGameResult.bestScore);
      }

      await query(
        `UPDATE fantasy_cards
         SET points_earned = updates.points
         FROM (
           SELECT unnest($1::text[]) AS id, unnest($2::numeric[]) AS points
         ) AS updates
         WHERE fantasy_cards.id = updates.id`,
        [cardIds, cardScores]
      );
    }

    return NextResponse.json({
      success: true,
      message: `Результат матча ${match.match_code} сохранен! Очки фэнтези лучшей игры и прогнозов начислены, сетка обновлена.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
