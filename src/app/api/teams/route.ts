import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const teamsRes = await query<{
      id: string;
      name: string;
      tag: string;
      logo_url: string | null;
      banner_url: string | null;
      captain_id: string;
      captain_name: string;
      invite_code: string;
      member_count: string;
    }>(
      `SELECT t.id, t.name, t.tag, t.logo_url, t.banner_url, t.captain_id, t.invite_code,
              u.username AS captain_name,
              COUNT(tm.id) AS member_count
       FROM teams t
       LEFT JOIN users u ON u.id = t.captain_id
       LEFT JOIN team_members tm ON tm.team_id = t.id
       GROUP BY t.id, u.username
       ORDER BY t.created_at DESC`
    );

    const membersRes = await query<{
      team_id: string;
      role_slot: string;
      user_id: string;
      username: string;
      steam_id: string | null;
      steam_name: string | null;
      steam_avatar: string | null;
    }>(
      `SELECT tm.team_id, tm.role_slot, u.id AS user_id, u.username, u.steam_id, u.steam_name, u.steam_avatar
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id`
    );

    const membersByTeam: Record<string, any[]> = {};
    for (const m of membersRes.rows) {
      if (!membersByTeam[m.team_id]) {
        membersByTeam[m.team_id] = [];
      }
      membersByTeam[m.team_id].push(m);
    }

    const teams = teamsRes.rows.map((t) => ({
      ...t,
      members: membersByTeam[t.id] || [],
    }));

    return NextResponse.json({ teams });
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

    if (!user.steam_id) {
      return NextResponse.json({
        error: "Для создания команды и занятия позиции в ростере необходимо привязать Steam аккаунт в профиле",
      }, { status: 400 });
    }

    const { name, tag, logo_url, banner_url, captain_role_slot } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Название команды должно быть не короче 2 символов" }, { status: 400 });
    }

    if (!tag || typeof tag !== "string" || tag.trim().length < 2 || tag.trim().length > 6) {
      return NextResponse.json({ error: "Тег команды должен содержать от 2 до 6 символов" }, { status: 400 });
    }

    const validSlots = ["pos1", "pos2", "pos3", "pos4", "pos5", "sub1", "sub2"];
    const chosenSlot = validSlots.includes(captain_role_slot) ? captain_role_slot : "pos1";

    const cleanName = name.trim();
    const cleanTag = tag.trim().toUpperCase();

    const existingTeam = await query(
      `SELECT id FROM teams WHERE LOWER(name) = LOWER($1) OR UPPER(tag) = $2`,
      [cleanName, cleanTag]
    );

    if (existingTeam.rows.length > 0) {
      return NextResponse.json({ error: "Команда с таким названием или тегом уже существует" }, { status: 409 });
    }

    const existingMembership = await query(
      `SELECT team_id FROM team_members WHERE user_id = $1`,
      [user.id]
    );

    if (existingMembership.rows.length > 0) {
      return NextResponse.json({ error: "Вы уже состоите в другой команде" }, { status: 400 });
    }

    const teamId = "team_" + crypto.randomBytes(8).toString("hex");
    const inviteCode = "inv_" + crypto.randomBytes(6).toString("hex");
    const logo = logo_url?.trim() || `https://api.dicebear.com/7.x/identicon/svg?seed=${cleanTag}`;
    const banner = banner_url?.trim() || null;

    await query(
      `INSERT INTO teams (id, name, tag, logo_url, banner_url, captain_id, invite_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [teamId, cleanName, cleanTag, logo, banner, user.id, inviteCode]
    );

    const memberId = "mem_" + crypto.randomBytes(8).toString("hex");
    await query(
      `INSERT INTO team_members (id, team_id, user_id, role_slot)
       VALUES ($1, $2, $3, $4)`,
      [memberId, teamId, user.id, chosenSlot]
    );

    return NextResponse.json({
      team: {
        id: teamId,
        name: cleanName,
        tag: cleanTag,
        logo_url: logo,
        banner_url: banner,
        captain_id: user.id,
        invite_code: inviteCode,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
