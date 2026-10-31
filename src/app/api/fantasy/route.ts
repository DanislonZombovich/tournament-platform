import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { rollRandomTraits, RolledTrait } from "@/lib/fantasy";

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
    }>(
      `SELECT id, title, status, is_fantasy_locked FROM tournaments WHERE id = $1`,
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
    let tokens = 20;

    const slots = ["pos1", "pos2", "pos3", "pos4", "pos5"];

    if (user) {
      tokens = user.fantasy_tokens ?? 20;

      const userCardsRes = await query<{
        id: string;
        role_slot: string;
        selected_player_id: string | null;
        traits: string;
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
        `SELECT fc.id, fc.role_slot, fc.selected_player_id, fc.traits, fc.points_earned,
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

        if (!card) {
          const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
          const initialTraits = rollRandomTraits(3);

          await query(
            `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, traits, points_earned)
             VALUES ($1, $2, $3, $4, NULL, $5, 0)
             ON CONFLICT (user_id, tournament_id, role_slot) DO NOTHING`,
            [cardId, user.id, tournamentId, slot, JSON.stringify(initialTraits)]
          );

          card = {
            id: cardId,
            role_slot: slot,
            selected_player_id: null,
            traits: JSON.stringify(initialTraits),
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

        let parsedTraits: RolledTrait[] = [];
        try {
          parsedTraits = typeof card.traits === "string" ? JSON.parse(card.traits) : card.traits;
        } catch {
          parsedTraits = rollRandomTraits(3);
        }

        cardsWithDetails.push({
          id: card.id,
          role_slot: slot,
          selected_player_id: card.selected_player_id,
          traits: parsedTraits,
          points_earned: card.points_earned || 0,
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
        cardsWithDetails.push({
          id: "preview_" + slot,
          role_slot: slot,
          selected_player_id: null,
          traits: rollRandomTraits(3),
          points_earned: 0,
          selected_player: null,
        });
      }
    }

    return NextResponse.json({
      tournament,
      is_fantasy_locked: tournament.is_fantasy_locked,
      fantasy_tokens: tokens,
      cards: cardsWithDetails,
      players_by_role: playersByRole,
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

    const { action, role_slot, player_id, card_id, tournament_id = "ti-2026-main" } = await req.json();

    const tournamentRes = await query<{ id: string; is_fantasy_locked: boolean }>(
      `SELECT id, is_fantasy_locked FROM tournaments WHERE id = $1`,
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
          `UPDATE fantasy_cards SET selected_player_id = NULL
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

      const cardRes = await query(
        `SELECT id FROM fantasy_cards WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
        [user.id, tournament_id, role_slot]
      );

      if (cardRes.rows.length === 0) {
        const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        const initialTraits = rollRandomTraits(3);
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, traits)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [cardId, user.id, tournament_id, role_slot, player_id, JSON.stringify(initialTraits)]
        );
      } else {
        await query(
          `UPDATE fantasy_cards SET selected_player_id = $1
           WHERE user_id = $2 AND tournament_id = $3 AND role_slot = $4`,
          [player_id, user.id, tournament_id, role_slot]
        );
      }

      return NextResponse.json({ success: true, message: "Игрок назначен в фэнтези-ростер!" });
    }

    if (action === "reroll_traits") {
      if (!card_id) {
        return NextResponse.json({ error: "Не указан ID карточки" }, { status: 400 });
      }

      const userRes = await query<{ fantasy_tokens: number }>(
        `SELECT fantasy_tokens FROM users WHERE id = $1`,
        [user.id]
      );

      const tokens = userRes.rows[0]?.fantasy_tokens ?? 0;
      if (tokens <= 0) {
        return NextResponse.json({ error: "У вас закончились жетоны для перековки" }, { status: 400 });
      }

      const cardRes = await query<{ id: string }>(
        `SELECT id FROM fantasy_cards WHERE id = $1 AND user_id = $2`,
        [card_id, user.id]
      );

      if (cardRes.rows.length === 0) {
        return NextResponse.json({ error: "Карточка не найдена" }, { status: 404 });
      }

      const newTraits = rollRandomTraits(3);

      await query(
        `UPDATE fantasy_cards SET traits = $1 WHERE id = $2`,
        [JSON.stringify(newTraits), card_id]
      );

      await query(
        `UPDATE users SET fantasy_tokens = fantasy_tokens - 1 WHERE id = $1`,
        [user.id]
      );

      return NextResponse.json({
        success: true,
        traits: newTraits,
        remaining_tokens: tokens - 1,
        message: "Характеристики карточки успешно перекованы!",
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
