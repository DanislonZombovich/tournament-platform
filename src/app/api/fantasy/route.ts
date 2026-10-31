import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { rollRandomTraits, RolledTrait } from "@/lib/fantasy";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tournamentId = "ti-2026-main";

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
        playersByRole[p.role_slot].push(p);
      }
    }

    if (!user) {
      return NextResponse.json({
        tournament,
        is_fantasy_locked: tournament.is_fantasy_locked,
        fantasy_tokens: 0,
        cards: [],
        players_by_role: playersByRole,
      });
    }

    const roles = ["pos1", "pos2", "pos3", "pos4", "pos5"];
    const existingCards = await query<{
      id: string;
      role_slot: string;
      selected_player_id: string | null;
      traits: any;
      points_earned: number;
    }>(
      `SELECT id, role_slot, selected_player_id, traits, points_earned
       FROM fantasy_cards
       WHERE user_id = $1 AND tournament_id = $2`,
      [user.id, tournamentId]
    );

    const cardMap = new Map(existingCards.rows.map((c) => [c.role_slot, c]));

    for (const role of roles) {
      if (!cardMap.has(role)) {
        const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        const initialTraits = rollRandomTraits(3);
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, traits)
           VALUES ($1, $2, $3, $4, $5)`,
          [cardId, user.id, tournamentId, role, JSON.stringify(initialTraits)]
        );
        cardMap.set(role, {
          id: cardId,
          role_slot: role,
          selected_player_id: null,
          traits: initialTraits,
          points_earned: 0,
        });
      }
    }

    const cardsWithDetails = Array.from(cardMap.values()).map((card) => {
      const selectedPlayer = card.selected_player_id
        ? eligiblePlayersRes.rows.find((p) => p.player_id === card.selected_player_id)
        : null;

      let parsedTraits: RolledTrait[] = [];
      if (typeof card.traits === "string") {
        try {
          parsedTraits = JSON.parse(card.traits);
        } catch {
          parsedTraits = [];
        }
      } else if (Array.isArray(card.traits)) {
        parsedTraits = card.traits;
      }

      return {
        ...card,
        traits: parsedTraits,
        selected_player: selectedPlayer || null,
      };
    });

    const userRecord = await query<{ fantasy_tokens: number }>(
      `SELECT fantasy_tokens FROM users WHERE id = $1`,
      [user.id]
    );

    const tokens = userRecord.rows[0]?.fantasy_tokens ?? 20;

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

    const { action, role_slot, player_id } = await req.json();
    const tournamentId = "ti-2026-main";

    const tournamentRes = await query<{ id: string; is_fantasy_locked: boolean }>(
      `SELECT id, is_fantasy_locked FROM tournaments WHERE id = $1`,
      [tournamentId]
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];
    if (tournament.is_fantasy_locked) {
      return NextResponse.json({ error: "Фэнтези заблокировано администратором турнира" }, { status: 400 });
    }

    const validRoles = ["pos1", "pos2", "pos3", "pos4", "pos5"];
    if (!validRoles.includes(role_slot)) {
      return NextResponse.json({ error: "Неверный слот роли" }, { status: 400 });
    }

    if (action === "select_player") {
      if (!player_id) {
        await query(
          `UPDATE fantasy_cards SET selected_player_id = NULL
           WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
          [user.id, tournamentId, role_slot]
        );
        return NextResponse.json({ success: true, message: "Игрок снят со слота" });
      }

      const validPlayerRes = await query(
        `SELECT tm.id
         FROM tournament_teams tt
         JOIN team_members tm ON tm.team_id = tt.team_id
         WHERE tt.tournament_id = $1 AND tm.role_slot = $2 AND tm.user_id = $3`,
        [tournamentId, role_slot, player_id]
      );

      if (validPlayerRes.rows.length === 0) {
        return NextResponse.json({
          error: "Выбранный игрок не зарегистрирован на эту роль в турнире",
        }, { status: 400 });
      }

      const cardRes = await query(
        `SELECT id FROM fantasy_cards WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
        [user.id, tournamentId, role_slot]
      );

      if (cardRes.rows.length === 0) {
        const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        const initialTraits = rollRandomTraits(3);
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, selected_player_id, traits)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [cardId, user.id, tournamentId, role_slot, player_id, JSON.stringify(initialTraits)]
        );
      } else {
        await query(
          `UPDATE fantasy_cards
           SET selected_player_id = $1
           WHERE user_id = $2 AND tournament_id = $3 AND role_slot = $4`,
          [player_id, user.id, tournamentId, role_slot]
        );
      }

      return NextResponse.json({ success: true, message: "Игрок успешно выбран" });
    }

    if (action === "reroll_traits") {
      const userRes = await query<{ fantasy_tokens: number }>(
        `SELECT fantasy_tokens FROM users WHERE id = $1`,
        [user.id]
      );

      const tokens = userRes.rows[0]?.fantasy_tokens ?? 0;
      if (tokens <= 0) {
        return NextResponse.json({ error: "У вас закончились жетоны перековки (0 осталось)" }, { status: 400 });
      }

      const newTraits = rollRandomTraits(3);

      await query(
        `UPDATE users SET fantasy_tokens = fantasy_tokens - 1 WHERE id = $1`,
        [user.id]
      );

      const cardRes = await query(
        `SELECT id FROM fantasy_cards WHERE user_id = $1 AND tournament_id = $2 AND role_slot = $3`,
        [user.id, tournamentId, role_slot]
      );

      if (cardRes.rows.length === 0) {
        const cardId = "fc_" + crypto.randomBytes(8).toString("hex");
        await query(
          `INSERT INTO fantasy_cards (id, user_id, tournament_id, role_slot, traits)
           VALUES ($1, $2, $3, $4, $5)`,
          [cardId, user.id, tournamentId, role_slot, JSON.stringify(newTraits)]
        );
      } else {
        await query(
          `UPDATE fantasy_cards
           SET traits = $1
           WHERE user_id = $2 AND tournament_id = $3 AND role_slot = $4`,
          [JSON.stringify(newTraits), user.id, tournamentId, role_slot]
        );
      }

      return NextResponse.json({
        success: true,
        remaining_tokens: tokens - 1,
        traits: newTraits,
        message: "Характеристики успешно перекованы!",
      });
    }

    return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
