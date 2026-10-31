import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { BRACKET_MATCH_DEFINITIONS } from "@/lib/bracket";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Доступ запрещен: требуется роль администратора" }, { status: 403 });
    }

    const { action, is_fantasy_locked, is_predictions_locked } = await req.json();
    const tournamentId = "ti-2026-main";

    if (action === "toggle_lock") {
      await query(
        `UPDATE tournaments
         SET is_fantasy_locked = $1, is_predictions_locked = $2
         WHERE id = $3`,
        [!!is_fantasy_locked, !!is_predictions_locked, tournamentId]
      );
      return NextResponse.json({
        success: true,
        is_fantasy_locked: !!is_fantasy_locked,
        is_predictions_locked: !!is_predictions_locked,
        message: "Статус блокировки обновлен",
      });
    }

    if (action === "publish_bracket") {
      const regTeamsRes = await query<{ team_id: string }>(
        `SELECT team_id FROM tournament_teams WHERE tournament_id = $1 ORDER BY seed ASC`,
        [tournamentId]
      );

      if (regTeamsRes.rows.length < 4) {
        return NextResponse.json({
          error: `Для формирования сетки необходимо 4 зарегистрированные команды. Сейчас: ${regTeamsRes.rows.length}`,
        }, { status: 400 });
      }

      const teamIds = regTeamsRes.rows.map((r) => r.team_id).sort(() => Math.random() - 0.5);

      await query(`DELETE FROM match_player_stats WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
      await query(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
      await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournamentId]);
      await query(`UPDATE fantasy_cards SET points_earned = 0 WHERE tournament_id = $1`, [tournamentId]);

      for (let i = 0; i < teamIds.length; i++) {
        await query(
          `UPDATE tournament_teams SET seed = $1 WHERE tournament_id = $2 AND team_id = $3`,
          [i + 1, tournamentId, teamIds[i]]
        );
      }

      const matchesToInsert = [
        { code: "UB1", type: "upper", name: "Верхняя сетка — Полуфинал 1", t1: teamIds[0], t2: teamIds[1], order: 1 },
        { code: "UB2", type: "upper", name: "Верхняя сетка — Полуфинал 2", t1: teamIds[2], t2: teamIds[3], order: 2 },
        { code: "LB1", type: "lower", name: "Нижняя сетка — Раунд 1", t1: null, t2: null, order: 3 },
        { code: "UBF", type: "upper", name: "Верхняя сетка — Финал", t1: null, t2: null, order: 4 },
        { code: "LBF", type: "lower", name: "Нижняя сетка — Финал", t1: null, t2: null, order: 5 },
        { code: "GF", type: "grand_final", name: "Гранд-Финал (Bo3)", t1: null, t2: null, order: 6 },
      ];

      for (const m of matchesToInsert) {
        const matchId = `match_${m.code.toLowerCase()}_${crypto.randomBytes(4).toString("hex")}`;
        await query(
          `INSERT INTO matches (id, tournament_id, match_code, bracket_type, round_name, team1_id, team2_id, match_order, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
          [matchId, tournamentId, m.code, m.type, m.name, m.t1, m.t2, m.order]
        );
      }

      await query(
        `UPDATE tournaments
         SET status = 'bracket_published', is_fantasy_locked = false, is_predictions_locked = false
         WHERE id = $1`,
        [tournamentId]
      );

      return NextResponse.json({
        success: true,
        message: "Сетка турнира успешно сгенерирована и опубликована! Прогнозы и фэнтези открыты.",
      });
    }

    if (action === "seed_demo_data") {
      const demoTeams = [
        {
          name: "Team Liquid",
          tag: "TL",
          logo: "https://liquipedia.net/commons/images/d/df/Team_Liquid_2023_allmode.png",
          players: [
            { name: "MiCKe", role: "pos1", steam: "76561198000000001", persona: "TL.MiCKe" },
            { name: "Nisha", role: "pos2", steam: "76561198000000002", persona: "TL.Nisha" },
            { name: "33", role: "pos3", steam: "76561198000000003", persona: "TL.33" },
            { name: "Boxi", role: "pos4", steam: "76561198000000004", persona: "TL.Boxi" },
            { name: "Insania", role: "pos5", steam: "76561198000000005", persona: "TL.Insania" },
          ],
        },
        {
          name: "Gaimin Gladiators",
          tag: "GG",
          logo: "https://liquipedia.net/commons/images/c/c5/Gaimin_Gladiators_allmode.png",
          players: [
            { name: "watson", role: "pos1", steam: "76561198000000011", persona: "GG.watson" },
            { name: "Quinn", role: "pos2", steam: "76561198000000012", persona: "GG.Quinn" },
            { name: "Ace", role: "pos3", steam: "76561198000000013", persona: "GG.Ace" },
            { name: "tofu", role: "pos4", steam: "76561198000000014", persona: "GG.tofu" },
            { name: "Seleri", role: "pos5", steam: "76561198000000015", persona: "GG.Seleri" },
          ],
        },
        {
          name: "Team Spirit",
          tag: "TS",
          logo: "https://liquipedia.net/commons/images/7/77/Team_Spirit_2021_allmode.png",
          players: [
            { name: "Yatoro", role: "pos1", steam: "76561198000000021", persona: "TS.Yatoro" },
            { name: "Larl", role: "pos2", steam: "76561198000000022", persona: "TS.Larl" },
            { name: "Collapse", role: "pos3", steam: "76561198000000023", persona: "TS.Collapse" },
            { name: "Mira", role: "pos4", steam: "76561198000000024", persona: "TS.Mira" },
            { name: "Miposhka", role: "pos5", steam: "76561198000000025", persona: "TS.Miposhka" },
          ],
        },
        {
          name: "BetBoom Team",
          tag: "BB",
          logo: "https://liquipedia.net/commons/images/3/36/BetBoom_Team_2023_allmode.png",
          players: [
            { name: "Pure", role: "pos1", steam: "76561198000000031", persona: "BB.Pure" },
            { name: "gpk~", role: "pos2", steam: "76561198000000032", persona: "BB.gpk" },
            { name: "MieRo`", role: "pos3", steam: "76561198000000033", persona: "BB.MieRo" },
            { name: "Save-", role: "pos4", steam: "76561198000000034", persona: "BB.Save" },
            { name: "TORONTOTOKYO", role: "pos5", steam: "76561198000000035", persona: "BB.TORONTO" },
          ],
        },
      ];

      for (let tIdx = 0; tIdx < demoTeams.length; tIdx++) {
        const dt = demoTeams[tIdx];
        const teamCheck = await query<{ id: string }>(`SELECT id FROM teams WHERE UPPER(tag) = $1`, [dt.tag]);

        let teamId: string;
        if (teamCheck.rows.length === 0) {
          teamId = `team_${dt.tag.toLowerCase()}_${crypto.randomBytes(4).toString("hex")}`;
          const invCode = `inv_${dt.tag.toLowerCase()}`;
          await query(
            `INSERT INTO teams (id, name, tag, logo_url, captain_id, invite_code)
             VALUES ($1, $2, $3, $4, NULL, $5)`,
            [teamId, dt.name, dt.tag, dt.logo, invCode]
          );
        } else {
          teamId = teamCheck.rows[0].id;
        }

        for (const pl of dt.players) {
          let userRes = await query<{ id: string }>(`SELECT id FROM users WHERE steam_id = $1`, [pl.steam]);
          let pUserId: string;

          if (userRes.rows.length === 0) {
            pUserId = `usr_${pl.name.toLowerCase()}`;
            const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${pl.name}`;
            await query(
              `INSERT INTO users (id, username, role, steam_id, steam_name, steam_avatar, fantasy_tokens)
               VALUES ($1, $2, 'user', $3, $4, $5, 20)
               ON CONFLICT (id) DO NOTHING`,
              [pUserId, pl.name, pl.steam, pl.persona, avatarUrl]
            );
          } else {
            pUserId = userRes.rows[0].id;
          }

          await query(
            `INSERT INTO team_members (id, team_id, user_id, role_slot)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (team_id, role_slot) DO UPDATE SET user_id = EXCLUDED.user_id`,
            [`mem_${dt.tag}_${pl.role}`, teamId, pUserId, pl.role]
          );
        }

        await query(
          `INSERT INTO tournament_teams (id, tournament_id, team_id, seed)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tournament_id, team_id) DO NOTHING`,
          [`tt_${tournamentId}_${teamId}`, tournamentId, teamId, tIdx + 1]
        );
      }

      return NextResponse.json({
        success: true,
        message: "4 профессиональные команды The International 2026 успешно созданы и зарегистрированы на турнир!",
      });
    }

    if (action === "reset_tournament") {
      await query(`DELETE FROM match_player_stats WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
      await query(`DELETE FROM predictions WHERE match_id IN (SELECT id FROM matches WHERE tournament_id = $1)`, [tournamentId]);
      await query(`DELETE FROM matches WHERE tournament_id = $1`, [tournamentId]);
      await query(`UPDATE fantasy_cards SET points_earned = 0 WHERE tournament_id = $1`, [tournamentId]);
      await query(`UPDATE users SET fantasy_tokens = 20`);
      await query(`UPDATE tournaments SET status = 'registration', is_fantasy_locked = false, is_predictions_locked = false WHERE id = $1`, [tournamentId]);
      return NextResponse.json({ success: true, message: "Турнир сброшен в стадию регистрации. Очки очищены, жетоны перековки восстановлены (20)." });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
