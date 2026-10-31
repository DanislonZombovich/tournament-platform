import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const tournamentRes = await query<{
      id: string;
      title: string;
      status: string;
      is_fantasy_locked: boolean;
      is_predictions_locked: boolean;
    }>(
      `SELECT id, title, status, is_fantasy_locked, is_predictions_locked
       FROM tournaments
       WHERE id = 'ti-2026-main'
       LIMIT 1`
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];

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
      [tournament.id]
    );

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
      [tournament.id]
    );

    return NextResponse.json({
      tournament,
      registered_teams: teamsRes.rows,
      matches: matchesRes.rows,
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

    const { team_id } = await req.json();
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

    const tournamentRes = await query<{ id: string; status: string }>(
      `SELECT id, status FROM tournaments WHERE id = 'ti-2026-main'`
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];
    if (tournament.status !== "registration") {
      return NextResponse.json({ error: "Регистрация на турнир уже закрыта" }, { status: 400 });
    }

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
          error: `У игрока ${member.username} (${role}) не привязан Steam аккаунт. Все 5 основных игроков должны иметь привязанный Steam!`,
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
    if (count >= 4) {
      return NextResponse.json({ error: "Все 4 слота команд на турнир уже заняты" }, { status: 400 });
    }

    const entryId = "tt_" + crypto.randomBytes(8).toString("hex");
    await query(
      `INSERT INTO tournament_teams (id, tournament_id, team_id, seed)
       VALUES ($1, $2, $3, $4)`,
      [entryId, tournament.id, team.id, count + 1]
    );

    return NextResponse.json({
      success: true,
      message: `Команда ${team.name} успешно зарегистрирована на The International 2026!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
