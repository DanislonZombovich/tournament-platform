import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация для вступления в команду" }, { status: 401 });
    }

    if (!user.steam_id) {
      return NextResponse.json({
        error: "Для вступления в состав команды необходимо привязать Steam аккаунт в профиле",
      }, { status: 400 });
    }

    const { invite_code, role_slot } = await req.json();

    if (!invite_code || !role_slot) {
      return NextResponse.json({ error: "Не указан код приглашения или роль" }, { status: 400 });
    }

    const validSlots = ["pos1", "pos2", "pos3", "pos4", "pos5", "sub1", "sub2"];
    if (!validSlots.includes(role_slot)) {
      return NextResponse.json({ error: "Некорректный слот роли" }, { status: 400 });
    }

    const teamRes = await query<{ id: string; name: string }>(
      `SELECT id, name FROM teams WHERE invite_code = $1`,
      [invite_code.trim()]
    );

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: "Команда по данному коду не найдена" }, { status: 404 });
    }

    const team = teamRes.rows[0];

    const currentTeamMembership = await query<{ team_id: string }>(
      `SELECT team_id FROM team_members WHERE user_id = $1`,
      [user.id]
    );

    if (currentTeamMembership.rows.length > 0) {
      if (currentTeamMembership.rows[0].team_id === team.id) {
        return NextResponse.json({ error: "Вы уже состоите в этой команде" }, { status: 400 });
      }
      return NextResponse.json({ error: "Вы уже состоите в другой команде" }, { status: 400 });
    }

    const slotTaken = await query(
      `SELECT id FROM team_members WHERE team_id = $1 AND role_slot = $2`,
      [team.id, role_slot]
    );

    if (slotTaken.rows.length > 0) {
      return NextResponse.json({ error: "Данная роль в команде уже занята" }, { status: 409 });
    }

    const memberId = "mem_" + crypto.randomBytes(8).toString("hex");
    await query(
      `INSERT INTO team_members (id, team_id, user_id, role_slot)
       VALUES ($1, $2, $3, $4)`,
      [memberId, team.id, user.id, role_slot]
    );

    return NextResponse.json({
      success: true,
      team_id: team.id,
      role_slot,
      message: `Вы успешно вступили в команду ${team.name}!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
