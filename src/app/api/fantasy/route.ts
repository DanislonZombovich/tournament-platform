import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  calculateBestGameFantasyPoints,
  DEFAULT_ROLE_EMBLEMS,
  FantasyEmblem,
  PlayerStats,
  VALVE_FANTASY_EMBLEMS,
} from "@/lib/fantasy";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournament_id") || "ti-2026-main";

    const tournamentRes = await query<{
      id: string;
      title: string;
      status: string;
      is_fantasy_locked: boolean;
      initial_rerolls: number;
    }>(
      `SELECT id, title, status, is_fantasy_locked, COALESCE(initial_rerolls, 20) AS initial_rerolls
       FROM tournaments WHERE id = $1`,
      [tournamentId]
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];

    const eligiblePlayersRes = await query<{
      role_slot: string;
      player_id: string;
      username: string;
      steam_id: string | null;
      steam_name: string | null;
      steam_avatar: string | null;
      team_id: string;
      team_name: string;
      team_tag: string;
      team_logo: string | null;
    }>(
      `SELECT tm.role_slot,
              u.id AS player_id, u.username, u.steam_id, u.steam_name, u.steam_avatar,
              t.id AS team_id, t.name AS team_name, t.tag AS team_tag, t.logo_url AS team_logo
       FROM tournament_teams tt
       JOIN teams t ON t.id = tt.team_id
       JOIN team_members tm ON tm.team_id = t.id
       JOIN users u ON u.id = tm.user_id
       WHERE tt.tournament_id = $1 AND tm.role_slot IN ('pos1', 'pos2', 'pos3', 'pos4', 'pos5')
       ORDER BY t.name ASC`,
      [tournamentId]
    );

    const playersByRole: Record<string, any[]> = {
      pos1: [],
      pos2: [],
      pos3: [],
      pos4: [],
      pos5: [],
    };

    for (const p of eligiblePlayersRes.rows) {
      if (playersByRole[p.role_slot]) {
        playersByRole[p.role_slot].push({
          player_id: p.player_id,
          username: p.username,
          steam_id: p.steam_id,
          steam_name: p.steam_name,
          steam_avatar: p.steam_avatar,
          team_id: p.team_id,
          team_name: p.team_name,
          team_tag: p.team_tag,
          team_logo: p.team_logo,
        });
      }
    }

    let cardsWithDetails: any[] = [];
    const slots = ["pos1", "pos2", "pos3", "pos4", "pos5"];

    if (user) {
      const userCardsRes = await query<{
        id: string;
        role_slot: string;
        selected_player_id: string | null;
        quality: string;
        title: string;
        traits: string;
        emblems: any;
        points_earned: number;
        player_username: string | null;
        player_steam_id: string | null;
        player_steam_name: string | null;
        player_steam_avatar: string | null;
        team_id: string | null;
        team_name: string | null;
        team_tag: string | null;
        team_logo: string | null;
      }>(
        `SELECT fc.id, fc.role_slot, fc.selected_player_id,
                COALESCE(fc.quality, 'common') AS quality,
                COALESCE(fc.title, 'Стальной') AS title,
                fc.traits, fc.emblems, fc.points_earned,
                u.username AS player_username, u.steam_id AS player_steam_id,
                u.steam_name AS player_steam_name, u.steam_avatar AS player_steam_avatar,
                t.id AS team_id, t.name AS team_name, t.tag AS team_tag, t.logo_url AS team_logo
         FROM fantasy_cards fc
         LEFT JOIN users u ON u.id = fc.selected_player_id
         LEFT JOIN team_members tm ON tm.user_id = u.id AND tm.role_slot = fc.role_slot
         LEFT JOIN teams t ON t.id = tm.team_id
         WHERE fc.user_id = $1 AND fc.tournament_id = $2`,
        [user.id, tournamentId]
      );

      const existingCardsMap = new Map(userCardsRes.rows.map((c) => [c.role_slot, c]));

      for (const slot of slots) {
        let card = existingCardsMap.get(slot);
        const defaultEmblems = DEFAULT_ROLE_EMBLEMS[slot] || ["creepScore", "deaths", "towerKills"];

        if (!card) {
          const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
          await query(
            `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, quality, title, traits, emblems, points_earned)
             VALUES ($1, $2, $3, $4, NULL, 'common', 'Стальной', $5, $6, 0)
             ON CONFLICT (user_id, tournament_id, role_slot) DO NOTHING`,
            [cardId, user.id, tournamentId, slot, JSON.stringify(defaultEmblems), JSON.stringify(defaultEmblems)]
          );

          card = {
            id: cardId,
            role_slot: slot,
            selected_player_id: null,
            quality: "common",
            title: "Стальной",
            traits: JSON.stringify(defaultEmblems),
            emblems: defaultEmblems,
            points_earned: 0,
            player_username: null,
            player_steam_id: null,
            player_steam_name: null,
            player_steam_avatar: null,
            team_id: null,
            team_name: null,
            team_tag: null,
            team_logo: null,
          };
        }

        let emblemIds: string[] = [];
        if (Array.isArray(card.emblems) && card.emblems.length > 0) {
          emblemIds = card.emblems;
        } else if (typeof card.emblems === "string" && card.emblems !== "[]" && card.emblems.trim() !== "") {
          try {
            emblemIds = JSON.parse(card.emblems);
          } catch {}
        }

        if (emblemIds.length === 0) {
          if (typeof card.traits === "string" && card.traits.trim() !== "") {
            try {
              const parsed = JSON.parse(card.traits);
              if (Array.isArray(parsed)) {
                emblemIds = parsed.map((t: any) => (typeof t === "string" ? t : t.id)).filter(Boolean);
              }
            } catch {}
          } else if (Array.isArray(card.traits)) {
            emblemIds = card.traits.map((t: any) => (typeof t === "string" ? t : t.id)).filter(Boolean);
          }
        }

        if (emblemIds.length === 0) {
          emblemIds = defaultEmblems;
        }

        emblemIds = emblemIds.slice(0, 3);
        const emblemDetails: FantasyEmblem[] = emblemIds
          .map((id) => VALVE_FANTASY_EMBLEMS[id])
          .filter(Boolean);

        let gamesPlayed = 0;
        let bestGameScore = card.points_earned || 0;
        let gameScoresList: number[] = [];

        if (card.selected_player_id) {
          const pStatsRes = await query<PlayerStats>(
            `SELECT mps.* FROM match_player_stats mps
             JOIN matches m ON m.id = mps.match_id
             WHERE m.tournament_id = $1 AND m.status = 'completed' AND mps.player_id = $2`,
            [tournamentId, card.selected_player_id]
          );

          gamesPlayed = pStatsRes.rows.length;
          if (gamesPlayed > 0) {
            const bestResult = calculateBestGameFantasyPoints(pStatsRes.rows, emblemIds);
            bestGameScore = bestResult.bestScore;
            gameScoresList = bestResult.gameScores;

            if (bestGameScore !== card.points_earned) {
              await query(`UPDATE fantasy_cards SET points_earned = $1 WHERE id = $2`, [bestGameScore, card.id]);
            }
          }
        }

        cardsWithDetails.push({
          id: card.id,
          role_slot: slot,
          selected_player_id: card.selected_player_id,
          emblems: emblemIds,
          emblem_details: emblemDetails,
          points_earned: bestGameScore,
          games_played: gamesPlayed,
          game_scores: gameScoresList,
          quality: "common",
          title: "Стальной",
          traits: emblemIds.map((id) => ({
            id,
            label: VALVE_FANTASY_EMBLEMS[id]?.label || id,
            bonus: 100,
            colorClass: VALVE_FANTASY_EMBLEMS[id]?.color === "red" ? "text-red-400" : VALVE_FANTASY_EMBLEMS[id]?.color === "blue" ? "text-sky-400" : "text-emerald-400",
            locked: false,
          })),
          selected_player: card.selected_player_id
            ? {
                player_id: card.selected_player_id,
                username: card.player_username || "Игрок",
                steam_id: card.player_steam_id,
                steam_name: card.player_steam_name,
                steam_avatar: card.player_steam_avatar,
                team_id: card.team_id || "",
                team_name: card.team_name || "Команда",
                team_tag: card.team_tag || "TAG",
                team_logo: card.team_logo,
              }
            : null,
        });
      }
    } else {
      for (const slot of slots) {
        const defaultEmblems = DEFAULT_ROLE_EMBLEMS[slot] || ["creepScore", "deaths", "towerKills"];
        cardsWithDetails.push({
          id: "preview_" + slot,
          role_slot: slot,
          selected_player_id: null,
          emblems: defaultEmblems,
          emblem_details: defaultEmblems.map((id) => VALVE_FANTASY_EMBLEMS[id]).filter(Boolean),
          points_earned: 0,
          games_played: 0,
          game_scores: [],
          quality: "common",
          title: "Стальной",
          traits: defaultEmblems.map((id) => ({
            id,
            label: VALVE_FANTASY_EMBLEMS[id]?.label || id,
            bonus: 100,
            colorClass: VALVE_FANTASY_EMBLEMS[id]?.color === "red" ? "text-red-400" : VALVE_FANTASY_EMBLEMS[id]?.color === "blue" ? "text-sky-400" : "text-emerald-400",
            locked: false,
          })),
          selected_player: null,
        });
      }
    }

    return NextResponse.json({
      tournament,
      is_fantasy_locked: tournament.is_fantasy_locked,
      fantasy_tokens: 20,
      cards: cardsWithDetails,
      players_by_role: playersByRole,
      all_emblems: Object.values(VALVE_FANTASY_EMBLEMS),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const body = await req.json();
    const { action, role_slot, player_id, card_id, emblems, tournament_id = "ti-2026-main" } = body;

    const tournamentRes = await query<{ id: string; is_fantasy_locked: boolean; initial_rerolls: number }>(
      `SELECT id, is_fantasy_locked, COALESCE(initial_rerolls, 20) AS initial_rerolls FROM tournaments WHERE id = $1`,
      [tournament_id]
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];
    if (tournament.is_fantasy_locked) {
      return NextResponse.json({ error: "Фэнтези заблокировано администратором турнира" }, { status: 400 });
    }

    const validRoles = ["pos1", "pos2", "pos3", "pos4", "pos5"];

    if (action === "select_player") {
      if (!validRoles.includes(role_slot)) {
        return NextResponse.json({ error: "Неверный слот роли" }, { status: 400 });
      }

      if (!player_id) {
        await query(
          `UPDATE fantasy_cards SET selected_player_id = NULL, points_earned = 0
           WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
          [user.id, tournament_id, role_slot]
        );
        return NextResponse.json({ success: true, message: "Игрок снят со слота" });
      }

      const validPlayerRes = await query(
        `SELECT tm.id
         FROM tournament_teams tt
         JOIN team_members tm ON tm.team_id = tt.team_id
         WHERE tt.tournament_id = $1 AND tm.role_slot = $2 AND tm.user_id = $3`,
        [tournament_id, role_slot, player_id]
      );

      if (validPlayerRes.rows.length === 0) {
        return NextResponse.json({
          error: "Выбранный игрок не зарегистрирован на эту роль в данном турнире",
        }, { status: 400 });
      }

      const defaultEmblems = DEFAULT_ROLE_EMBLEMS[role_slot] || ["creepScore", "deaths", "towerKills"];
      const cardRes = await query<{ id: string; emblems: any; traits: any }>(
        `SELECT id, emblems, traits FROM fantasy_cards WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
        [user.id, tournament_id, role_slot]
      );

      let cardId: string;
      let activeEmblemIds: string[] = defaultEmblems;

      if (cardRes.rows.length === 0) {
        cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, quality, title, traits, emblems, points_earned)
           VALUES ($1, $2, $3, $4, $5, 'common', 'Стальной', $6, $7, 0)`,
          [cardId, user.id, tournament_id, role_slot, player_id, JSON.stringify(defaultEmblems), JSON.stringify(defaultEmblems)]
        );
      } else {
        cardId = cardRes.rows[0].id;
        const currentEmblems = cardRes.rows[0].emblems;
        if (Array.isArray(currentEmblems) && currentEmblems.length > 0) {
          activeEmblemIds = currentEmblems;
        } else if (typeof currentEmblems === "string" && currentEmblems !== "[]" && currentEmblems.trim() !== "") {
          try {
            activeEmblemIds = JSON.parse(currentEmblems);
          } catch {}
        }
        await query(
          `UPDATE fantasy_cards SET selected_player_id = $1
           WHERE user_id = $2 AND tournament_id = $3 AND role_slot = $4`,
          [player_id, user.id, tournament_id, role_slot]
        );
      }

      const pStatsRes = await query<PlayerStats>(
        `SELECT mps.* FROM match_player_stats mps
         JOIN matches m ON m.id = mps.match_id
         WHERE m.tournament_id = $1 AND m.status = 'completed' AND mps.player_id = $2`,
        [tournament_id, player_id]
      );

      let bestScore = 0;
      if (pStatsRes.rows.length > 0) {
        const bestResult = calculateBestGameFantasyPoints(pStatsRes.rows, activeEmblemIds);
        bestScore = bestResult.bestScore;
      }

      await query(`UPDATE fantasy_cards SET points_earned = $1 WHERE id = $2`, [bestScore, cardId]);

      return NextResponse.json({
        success: true,
        message: "Игрок назначен в фэнтези-ростер!",
        points_earned: bestScore,
      });
    }

    if (action === "set_emblems") {
      if (!validRoles.includes(role_slot)) {
        return NextResponse.json({ error: "Неверный слот роли" }, { status: 400 });
      }

      if (!Array.isArray(emblems) || emblems.length === 0 || emblems.length > 3) {
        return NextResponse.json({ error: "Необходимо выбрать от 1 до 3 эмблем" }, { status: 400 });
      }

      const invalidEmblem = emblems.find((id) => !VALVE_FANTASY_EMBLEMS[id]);
      if (invalidEmblem) {
        return NextResponse.json({ error: `Неизвестная эмблема: ${invalidEmblem}` }, { status: 400 });
      }

      const cardRes = await query<{ id: string; selected_player_id: string | null }>(
        `SELECT id, selected_player_id FROM fantasy_cards WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
        [user.id, tournament_id, role_slot]
      );

      let cardId: string;
      let selectedPlayerId: string | null = null;

      if (cardRes.rows.length === 0) {
        cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, quality, title, traits, emblems, points_earned)
           VALUES ($1, $2, $3, $4, NULL, 'common', 'Стальной', $5, $6, 0)`,
          [cardId, user.id, tournament_id, role_slot, JSON.stringify(emblems), JSON.stringify(emblems)]
        );
      } else {
        cardId = cardRes.rows[0].id;
        selectedPlayerId = cardRes.rows[0].selected_player_id;
        await query(
          `UPDATE fantasy_cards SET emblems = $1, traits = $1
           WHERE id = $2`,
          [JSON.stringify(emblems), cardId]
        );
      }

      let bestScore = 0;
      if (selectedPlayerId) {
        const pStatsRes = await query<PlayerStats>(
          `SELECT mps.* FROM match_player_stats mps
           JOIN matches m ON m.id = mps.match_id
           WHERE m.tournament_id = $1 AND m.status = 'completed' AND mps.player_id = $2`,
          [tournament_id, selectedPlayerId]
        );

        if (pStatsRes.rows.length > 0) {
          const bestResult = calculateBestGameFantasyPoints(pStatsRes.rows, emblems);
          bestScore = bestResult.bestScore;
        }
      }

      await query(`UPDATE fantasy_cards SET points_earned = $1 WHERE id = $2`, [bestScore, cardId]);

      return NextResponse.json({
        success: true,
        emblems,
        points_earned: bestScore,
        message: "Эмблемы успешно сохранены!",
      });
    }

    if (action === "toggle_lock" || action === "reroll_traits") {
      return NextResponse.json({
        success: true,
        message: "Эмблемы зафиксированы с модификатором 100%.",
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
