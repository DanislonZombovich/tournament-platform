import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateMatchesForTournament } from "@/lib/bracket";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedId = searchParams.get("id") || searchParams.get("tournament_id");

    // Fetch all tournaments for the list/selector
    const allTournamentsRes = await query<{
      id: string;
      title: string;
      description: string | null;
      format: string;
      max_teams: number;
      is_public: boolean;
      access_code: string | null;
      prize_pool: string | null;
      banner_url: string | null;
      status: string;
      is_fantasy_locked: boolean;
      is_predictions_locked: boolean;
      created_at: string;
      teams_count: string;
    }>(
      `SELECT t.*, 
              (SELECT COUNT(*) FROM tournament_teams tt WHERE tt.tournament_id = t.id) AS teams_count
       FROM tournaments t
       ORDER BY t.created_at DESC`
    );

    const tournamentsList = allTournamentsRes.rows;

    // Pick active tournament: either requested by ID or default to 'ti-2026-main' or first available
    let activeTournament = tournamentsList.find((t) => t.id === requestedId);
    if (!activeTournament && !requestedId) {
      activeTournament = tournamentsList.find((t) => t.id === "ti-2026-main") || tournamentsList[0];
    }

    if (!activeTournament && requestedId) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    let registeredTeams: any[] = [];
    let matches: any[] = [];

    if (activeTournament) {
      const teamsRes = await query<{
        team_id: string;
        name: string;
        tag: string;
        logo_url: string;
        seed: number | null;
      }>(
        `SELECT t.id AS team_id, t.name, t.tag, t.logo_url, tt.seed
         FROM tournament_teams tt
         JOIN teams t ON t.id = tt.team_id
         WHERE tt.tournament_id = $1
         ORDER BY tt.seed ASC NULLS LAST, tt.created_at ASC`,
        [activeTournament.id]
      );
      registeredTeams = teamsRes.rows;

      const matchesRes = await query<{
        id: string;
        match_code: string;
        bracket_type: string;
        round_name: string;
        team1_id: string | null;
        team2_id: string | null;
        team1_score: number;
        team2_score: number;
        winner_id: string | null;
        status: string;
        match_order: number;
        team1_name: string | null;
        team1_tag: string | null;
        team1_logo: string | null;
        team2_name: string | null;
        team2_tag: string | null;
        team2_logo: string | null;
      }>(
        `SELECT m.*,
                t1.name AS team1_name, t1.tag AS team1_tag, t1.logo_url AS team1_logo,
                t2.name AS team2_name, t2.tag AS team2_tag, t2.logo_url AS team2_logo
         FROM matches m
         LEFT JOIN teams t1 ON t1.id = m.team1_id
         LEFT JOIN teams t2 ON t2.id = m.team2_id
         WHERE m.tournament_id = $1
         ORDER BY m.match_order ASC`,
        [activeTournament.id]
      );
      matches = matchesRes.rows;
    }

    return NextResponse.json({
      tournament: activeTournament,
      tournaments: tournamentsList,
      registered_teams: registeredTeams,
      matches,
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

    // 1. Action: CREATE NEW TOURNAMENT
    if (body.action === "create" || (body.title && !body.team_id && !body.id && body.action !== "update" && body.action !== "edit")) {
      const {
        title,
        description,
        format = "double_elimination",
        max_teams = 8,
        is_public = true,
        access_code,
        prize_pool = "$50,000",
        banner_url = "/banner.jpg",
      } = body;

      if (!title || typeof title !== "string" || title.trim().length < 3) {
        return NextResponse.json({ error: "Название турнира должно содержать от 3 символов" }, { status: 400 });
      }

      const tournamentId = "tourn_" + crypto.randomBytes(6).toString("hex");
      const cleanTitle = title.trim();
      const cleanDesc = description ? description.trim() : `Турнир по Dota 2: ${cleanTitle}`;
      const numMaxTeams = Number(max_teams) || 8;

      await query(
        `INSERT INTO tournaments (
          id, title, description, format, max_teams, is_public, access_code, prize_pool, banner_url, creator_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'registration')`,
        [
          tournamentId,
          cleanTitle,
          cleanDesc,
          format,
          numMaxTeams,
          Boolean(is_public),
          access_code || null,
          prize_pool,
          banner_url,
          user.id,
        ]
      );

      // Pre-generate bracket matches
      await generateMatchesForTournament(tournamentId, format, numMaxTeams);

      return NextResponse.json({
        success: true,
        message: `Турнир "${cleanTitle}" успешно создан!`,
        tournament_id: tournamentId,
      }, { status: 201 });
    }

    // 2. Action: UPDATE / EDIT TOURNAMENT
    if (body.action === "update" || body.action === "edit") {
      return await handleTournamentUpdate(user, body);
    }

    // 3. Action: DELETE TOURNAMENT
    if (body.action === "delete") {
      return await handleTournamentDelete(user, body.tournament_id || body.id);
    }

    // 2. Action: REGISTER TEAM TO TOURNAMENT
    const { team_id, tournament_id = "ti-2026-main", access_code } = body;
    if (!team_id) {
      return NextResponse.json({ error: "Укажите команду" }, { status: 400 });
    }

    const teamRes = await query<{ id: string; captain_id: string; name: string }>(
      `SELECT id, captain_id, name FROM teams WHERE id = $1`,
      [team_id]
    );

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const team = teamRes.rows[0];
    if (team.captain_id !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Только капитан команды может зарегистрировать её на турнир" }, { status: 403 });
    }

    const tournamentRes = await query<{
      id: string;
      title: string;
      status: string;
      max_teams: number;
      is_public: boolean;
      access_code: string | null;
    }>(
      `SELECT id, title, status, max_teams, is_public, access_code FROM tournaments WHERE id = $1`,
      [tournament_id]
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];
    if (tournament.status !== "registration") {
      return NextResponse.json({ error: "Регистрация на турнир уже закрыта" }, { status: 400 });
    }

    if (!tournament.is_public && tournament.access_code) {
      if (tournament.access_code !== access_code) {
        return NextResponse.json({ error: "Неверный код доступа для закрытого турнира" }, { status: 403 });
      }
    }

    // Mandatory rule: Team must have 5 positions, and EVERY member must have linked Steam
    const membersRes = await query<{
      role_slot: string;
      steam_id: string | null;
      username: string;
    }>(
      `SELECT tm.role_slot, u.steam_id, u.username
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1`,
      [team.id]
    );

    const requiredRoles = ["pos1", "pos2", "pos3", "pos4", "pos5"];
    for (const role of requiredRoles) {
      const member = membersRes.rows.find((m) => m.role_slot === role);
      if (!member) {
        return NextResponse.json({
          error: `В команде не заполнен обязательный слот роли ${role}`,
        }, { status: 400 });
      }
      if (!member.steam_id) {
        return NextResponse.json({
          error: `У игрока ${member.username} (${role}) не привязан Steam аккаунт. Все 5 игроков команды должны иметь привязанный Steam!`,
        }, { status: 400 });
      }
    }

    const alreadyRegistered = await query(
      `SELECT id FROM tournament_teams WHERE tournament_id = $1 AND team_id = $2`,
      [tournament.id, team.id]
    );

    if (alreadyRegistered.rows.length > 0) {
      return NextResponse.json({ error: "Команда уже зарегистрирована на этот турнир" }, { status: 400 });
    }

    const registeredCountRes = await query<{ count: string }>(
      `SELECT COUNT(*) FROM tournament_teams WHERE tournament_id = $1`,
      [tournament.id]
    );

    const count = parseInt(registeredCountRes.rows[0].count, 10);
    const maxLimit = tournament.max_teams || 8;
    if (count >= maxLimit) {
      return NextResponse.json({ error: `Все ${maxLimit} слотов команд на турнир уже заняты` }, { status: 400 });
    }

    const entryId = "tt_" + crypto.randomBytes(8).toString("hex");
    const seed = count + 1;
    await query(
      `INSERT INTO tournament_teams (id, tournament_id, team_id, seed)
       VALUES ($1, $2, $3, $4)`,
      [entryId, tournament.id, team.id, seed]
    );

    // If opening round matches exist with vacant slots, assign the team
    const openingMatches = await query<{ id: string; team1_id: string | null; team2_id: string | null }>(
      `SELECT id, team1_id, team2_id FROM matches 
       WHERE tournament_id = $1 AND (team1_id IS NULL OR team2_id IS NULL)
       ORDER BY match_order ASC LIMIT 1`,
      [tournament.id]
    );

    if (openingMatches.rows.length > 0) {
      const targetMatch = openingMatches.rows[0];
      if (!targetMatch.team1_id) {
        await query(`UPDATE matches SET team1_id = $1 WHERE id = $2`, [team.id, targetMatch.id]);
      } else if (!targetMatch.team2_id) {
        await query(`UPDATE matches SET team2_id = $1 WHERE id = $2`, [team.id, targetMatch.id]);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Команда ${team.name} успешно зарегистрирована на турнир "${tournament.title}"!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}

async function handleTournamentUpdate(user: any, body: any) {
  const {
    id,
    title,
    description,
    format,
    max_teams,
    is_public,
    access_code,
    prize_pool,
    banner_url,
    status,
    is_fantasy_locked,
    is_predictions_locked,
  } = body;

  if (!id) {
    return NextResponse.json({ error: "Укажите ID турнира" }, { status: 400 });
  }

  const tournRes = await query<{
    id: string;
    title: string;
    description: string | null;
    format: string;
    max_teams: number;
    is_public: boolean;
    access_code: string | null;
    prize_pool: string | null;
    banner_url: string | null;
    status: string;
    creator_id: string | null;
    is_fantasy_locked: boolean;
    is_predictions_locked: boolean;
  }>("SELECT * FROM tournaments WHERE id = $1", [id]);

  if (tournRes.rows.length === 0) {
    return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
  }

  const current = tournRes.rows[0];
  const isCreator = Boolean(current.creator_id && current.creator_id === user.id);
  const isAdmin = user.role === "admin";

  if (!isCreator && !isAdmin) {
    return NextResponse.json(
      { error: "У вас нет прав на редактирование этого турнира (только создатель турнира или администратор)" },
      { status: 403 }
    );
  }

  const updatedTitle = typeof title === "string" ? title.trim() : current.title;
  if (!updatedTitle || updatedTitle.length < 3) {
    return NextResponse.json({ error: "Название турнира должно содержать от 3 символов" }, { status: 400 });
  }

  const updatedDesc = description !== undefined ? (description ? description.trim() : "") : current.description;
  const updatedFormat = format || current.format;
  const updatedMaxTeams = max_teams ? Number(max_teams) : current.max_teams;
  const updatedPrize = prize_pool !== undefined ? prize_pool : current.prize_pool;
  const updatedBanner = banner_url !== undefined ? banner_url : current.banner_url;
  const updatedPublic = is_public !== undefined ? Boolean(is_public) : current.is_public;
  const updatedCode = updatedPublic ? null : (access_code !== undefined ? access_code : current.access_code);
  const updatedStatus = status || current.status;
  const updatedFantasyLock = is_fantasy_locked !== undefined ? Boolean(is_fantasy_locked) : current.is_fantasy_locked;
  const updatedPredLock = is_predictions_locked !== undefined ? Boolean(is_predictions_locked) : current.is_predictions_locked;

  await query(
    `UPDATE tournaments SET
      title = $1,
      description = $2,
      format = $3,
      max_teams = $4,
      prize_pool = $5,
      banner_url = $6,
      is_public = $7,
      access_code = $8,
      status = $9,
      is_fantasy_locked = $10,
      is_predictions_locked = $11
     WHERE id = $12`,
    [
      updatedTitle,
      updatedDesc,
      updatedFormat,
      updatedMaxTeams,
      updatedPrize,
      updatedBanner,
      updatedPublic,
      updatedCode,
      updatedStatus,
      updatedFantasyLock,
      updatedPredLock,
      id,
    ]
  );

  return NextResponse.json({
    success: true,
    message: `Настройки турнира "${updatedTitle}" успешно сохранены!`,
    tournament_id: id,
  });
}

async function handleTournamentDelete(user: any, tournamentId: string) {
  if (!tournamentId) {
    return NextResponse.json({ error: "Укажите ID турнира для удаления" }, { status: 400 });
  }

  if (tournamentId === "ti-2026-main") {
    return NextResponse.json({ error: "Главный системный турнир The International 2026 нельзя удалить" }, { status: 400 });
  }

  const tournRes = await query<{
    id: string;
    title: string;
    creator_id: string | null;
  }>("SELECT id, title, creator_id FROM tournaments WHERE id = $1", [tournamentId]);

  if (tournRes.rows.length === 0) {
    return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
  }

  const current = tournRes.rows[0];
  const isCreator = Boolean(current.creator_id && current.creator_id === user.id);
  const isAdmin = user.role === "admin";

  if (!isCreator && !isAdmin) {
    return NextResponse.json(
      { error: "У вас нет прав на удаление этого турнира (только создатель или администратор)" },
      { status: 403 }
    );
  }

  // Cascade delete matches, teams associations, predictions, fantasy cards
  await query("DELETE FROM tournament_teams WHERE tournament_id = $1", [tournamentId]);
  await query("DELETE FROM matches WHERE tournament_id = $1", [tournamentId]);
  await query("DELETE FROM predictions WHERE tournament_id = $1", [tournamentId]);
  await query("DELETE FROM fantasy_cards WHERE tournament_id = $1", [tournamentId]);
  await query("DELETE FROM tournaments WHERE id = $1", [tournamentId]);

  return NextResponse.json({
    success: true,
    message: `Турнир "${current.title}" успешно удален!`,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    const body = await req.json();
    return await handleTournamentUpdate(user, body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    const body = await req.json();
    return await handleTournamentUpdate(user, body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("id") || searchParams.get("tournament_id");
    return await handleTournamentDelete(user, tournamentId || "");
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
