import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import {
  rollRandomTraits,
  RolledTrait,
  getRandomQuality,
  getRandomTitle,
  CardQuality,
  CARD_QUALITIES,
  CARD_TITLES,
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
    let tokens = tournament.initial_rerolls || 20;

    const slots = ["pos1", "pos2", "pos3", "pos4", "pos5"];

    if (user) {
      // Get or initialize per-tournament tokens for user
      const userTokensRes = await query<{ tokens: number }>(
        `SELECT tokens FROM tournament_user_tokens WHERE user_id = $1 AND tournament_id = $2`,
        [user.id, tournamentId]
      );

      if (userTokensRes.rows.length === 0) {
        tokens = tournament.initial_rerolls || 20;
        await query(
          `INSERT INTO tournament_user_tokens (user_id, tournament_id, tokens)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, tournament_id) DO NOTHING`,
          [user.id, tournamentId, tokens]
        );
      } else {
        tokens = userTokensRes.rows[0].tokens;
      }

      const userCardsRes = await query<{
        id: string;
        role_slot: string;
        selected_player_id: string | null;
        quality: CardQuality;
        title: string;
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
        `SELECT fc.id, fc.role_slot, fc.selected_player_id,
                COALESCE(fc.quality, 'common') AS quality,
                COALESCE(fc.title, 'Стальной') AS title,
                fc.traits, fc.points_earned,
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
          const initQuality = getRandomQuality();
          const initTitle = getRandomTitle();
          const initialTraits = rollRandomTraits(3, initQuality);

          await query(
            `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, quality, title, traits, points_earned)
             VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, 0)
             ON CONFLICT (user_id, tournament_id, role_slot) DO NOTHING`,
            [cardId, user.id, tournamentId, slot, initQuality, initTitle, JSON.stringify(initialTraits)]
          );

          card = {
            id: cardId,
            role_slot: slot,
            selected_player_id: null,
            quality: initQuality,
            title: initTitle,
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
          parsedTraits = rollRandomTraits(3, card.quality || "common");
        }

        cardsWithDetails.push({
          id: card.id,
          role_slot: slot,
          selected_player_id: card.selected_player_id,
          quality: card.quality || "common",
          title: card.title || "Стальной",
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
          quality: "common",
          title: "Стальной",
          traits: rollRandomTraits(3, "common"),
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

    const body = await req.json();
    const { action, role_slot, player_id, card_id, trait_id, tournament_id = "ti-2026-main" } = body;

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

    // 1. SELECT PLAYER
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

      const cardRes = await query<{ id: string }>(
        `SELECT id FROM fantasy_cards WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
        [user.id, tournament_id, role_slot]
      );

      if (cardRes.rows.length === 0) {
        const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        const initQuality = getRandomQuality();
        const initTitle = getRandomTitle();
        const initialTraits = rollRandomTraits(3, initQuality);
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, quality, title, traits)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [cardId, user.id, tournament_id, role_slot, player_id, initQuality, initTitle, JSON.stringify(initialTraits)]
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

    // 2. TOGGLE LOCK ON A SPECIFIC TRAIT
    if (action === "toggle_lock") {
      if (!card_id || !trait_id) {
        return NextResponse.json({ error: "Не указаны параметры карточки или свойства" }, { status: 400 });
      }

      const cardRes = await query<{ id: string; traits: string }>(
        `SELECT id, traits FROM fantasy_cards WHERE id = $1 AND user_id = $2`,
        [card_id, user.id]
      );

      if (cardRes.rows.length === 0) {
        return NextResponse.json({ error: "Карточка не найдена" }, { status: 404 });
      }

      let traits: RolledTrait[] = [];
      try {
        traits = typeof cardRes.rows[0].traits === "string" ? JSON.parse(cardRes.rows[0].traits) : cardRes.rows[0].traits;
      } catch {
        traits = [];
      }

      traits = traits.map((t) => {
        if (t.id === trait_id) {
          return { ...t, locked: !t.locked };
        }
        return t;
      });

      await query(`UPDATE fantasy_cards SET traits = $1 WHERE id = $2`, [JSON.stringify(traits), card_id]);

      return NextResponse.json({
        success: true,
        traits,
        message: "Фиксация свойства обновлена",
      });
    }

    // 3. REROLL TRAITS ("КРУТИТЬ ХАРАКТЕРИСТИКИ")
    if (action === "reroll_traits") {
      if (!card_id) {
        return NextResponse.json({ error: "Не указан ID карточки" }, { status: 400 });
      }

      // Read tournament-specific tokens for the user
      const tokensRes = await query<{ tokens: number }>(
        `SELECT tokens FROM tournament_user_tokens WHERE user_id = $1 AND tournament_id = $2`,
        [user.id, tournament_id]
      );

      let currentTokens = tokensRes.rows.length > 0 ? tokensRes.rows[0].tokens : (tournament.initial_rerolls || 20);

      if (currentTokens <= 0) {
        return NextResponse.json({
          error: "У вас закончились жетоны перековки для этого турнира",
        }, { status: 400 });
      }

      const cardRes = await query<{
        id: string;
        quality: CardQuality;
        title: string;
        traits: string;
      }>(
        `SELECT id, COALESCE(quality, 'common') AS quality, COALESCE(title, 'Стальной') AS title, traits
         FROM fantasy_cards WHERE id = $1 AND user_id = $2`,
        [card_id, user.id]
      );

      if (cardRes.rows.length === 0) {
        return NextResponse.json({ error: "Карточка не найдена" }, { status: 404 });
      }

      const card = cardRes.rows[0];
      let existingTraits: RolledTrait[] = [];
      try {
        existingTraits = typeof card.traits === "string" ? JSON.parse(card.traits) : card.traits;
      } catch {
        existingTraits = [];
      }

      // Small chance to upgrade quality on reroll (15% chance to roll upgraded quality)
      let currentQuality = card.quality;
      if (Math.random() < 0.15) {
        const qualityProgression: Record<CardQuality, CardQuality> = {
          common: "rare",
          rare: "epic",
          epic: "immortal",
          immortal: "immortal",
        };
        currentQuality = qualityProgression[currentQuality] || currentQuality;
      }

      // Chance to reroll title if not locked (30% chance for new title)
      let currentTitle = card.title;
      if (Math.random() < 0.30) {
        currentTitle = getRandomTitle();
      }

      const newTraits = rollRandomTraits(3, currentQuality, existingTraits);

      await query(
        `UPDATE fantasy_cards SET traits = $1, quality = $2, title = $3 WHERE id = $4`,
        [JSON.stringify(newTraits), currentQuality, currentTitle, card_id]
      );

      // Decrement tournament tokens
      const remainingTokens = currentTokens - 1;
      await query(
        `INSERT INTO tournament_user_tokens (user_id, tournament_id, tokens)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, tournament_id)
         DO UPDATE SET tokens = $3`,
        [user.id, tournament_id, remainingTokens]
      );

      return NextResponse.json({
        success: true,
        traits: newTraits,
        quality: currentQuality,
        title: currentTitle,
        remaining_tokens: remainingTokens,
        message: "Характеристики карточки успешно перекованы!",
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
