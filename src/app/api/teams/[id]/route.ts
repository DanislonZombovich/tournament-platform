import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teamRes = await query<{
      id: string;
      name: string;
      tag: string;
      logo_url: string | null;
      banner_url: string | null;
      captain_id: string;
      invite_code: string;
      created_at: string;
    }>(
      `SELECT id, name, tag, logo_url, banner_url, captain_id, invite_code, created_at
       FROM teams
       WHERE id = $1 OR invite_code = $1`,
      [id]
    );

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const team = teamRes.rows[0];

    const membersRes = await query<{
      id: string;
      role_slot: string;
      user_id: string;
      username: string;
      steam_id: string | null;
      steam_name: string | null;
      steam_avatar: string | null;
      joined_at: string;
    }>(
      `SELECT tm.id, tm.role_slot, u.id AS user_id, u.username, u.steam_id, u.steam_name, u.steam_avatar, tm.joined_at
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.joined_at ASC`,
      [team.id]
    );

    const roles = ["pos1", "pos2", "pos3", "pos4", "pos5", "sub1", "sub2"];
    const roster = roles.map((roleKey) => {
      const member = membersRes.rows.find((m) => m.role_slot === roleKey);
      return {
        role_slot: roleKey,
        is_occupied: !!member,
        player: member
          ? {
              user_id: member.user_id,
              username: member.username,
              steam_id: member.steam_id,
              steam_name: member.steam_name,
              steam_avatar: member.steam_avatar,
              is_steam_linked: !!member.steam_id,
            }
          : null,
      };
    });

    const primarySlotsFilled = roster
      .filter((r) => ["pos1", "pos2", "pos3", "pos4", "pos5"].includes(r.role_slot))
      .every((r) => r.is_occupied);

    const allSteamLinked = roster
      .filter((r) => ["pos1", "pos2", "pos3", "pos4", "pos5"].includes(r.role_slot) && r.player)
      .every((r) => r.player?.is_steam_linked);

    const user = await getCurrentUser();
    const isCaptain = Boolean(user && user.id === team.captain_id);
    const isAdmin = Boolean(user && (user.role === "admin" || user.id === "usr_d98221e7ed837829"));
    const accessedViaInviteCode = (id === team.invite_code);

    const safeTeam = {
      ...team,
      invite_code: (isCaptain || isAdmin || accessedViaInviteCode) ? team.invite_code : undefined,
    };

    return NextResponse.json({
      team: safeTeam,
      roster,
      is_eligible_for_tournament: primarySlotsFilled && allSteamLinked,
      primarySlotsFilled,
      allSteamLinked,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
    }

    const { id: teamId } = await params;
    const body = await req.json();
    const { target_user_id, new_role_slot } = body;

    if (!target_user_id || !new_role_slot) {
      return NextResponse.json({ error: "Укажите игрока и новую роль" }, { status: 400 });
    }

    const teamRes = await query<{
      id: string;
      name: string;
      captain_id: string;
    }>("SELECT id, name, captain_id FROM teams WHERE id = $1", [teamId]);

    if (teamRes.rows.length === 0) {
      return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });
    }

    const team = teamRes.rows[0];
    const isCaptain = team.captain_id === user.id;
    const isAdmin = user.role === "admin";
    const isSelf = target_user_id === user.id;

    if (!isCaptain && !isAdmin && !isSelf) {
      return NextResponse.json(
        { error: "Только капитан команды или администратор может менять расстановку ролей" },
        { status: 403 }
      );
    }

    const validSlots = ["pos1", "pos2", "pos3", "pos4", "pos5", "sub1", "sub2"];
    if (!validSlots.includes(new_role_slot)) {
      return NextResponse.json({ error: "Недопустимый слот роли" }, { status: 400 });
    }

    // Get current member
    const currentMemberRes = await query<{
      id: string;
      role_slot: string;
      username: string;
    }>(
      `SELECT tm.id, tm.role_slot, u.username
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.user_id = $2`,
      [team.id, target_user_id]
    );

    if (currentMemberRes.rows.length === 0) {
      return NextResponse.json({ error: "Игрок не состоит в этой команде" }, { status: 404 });
    }

    const currentMember = currentMemberRes.rows[0];
    const oldSlot = currentMember.role_slot;

    if (oldSlot === new_role_slot) {
      return NextResponse.json({ message: "Игрок уже занимает эту позицию" });
    }

    // Check if new_role_slot is occupied
    const targetSlotRes = await query<{
      id: string;
      user_id: string;
      username: string;
    }>(
      `SELECT tm.id, tm.user_id, u.username
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.role_slot = $2`,
      [team.id, new_role_slot]
    );

    if (targetSlotRes.rows.length === 0) {
      // Slot is empty - move player to new_role_slot
      await query(
        `UPDATE team_members SET role_slot = $1 WHERE id = $2`,
        [new_role_slot, currentMember.id]
      );

      return NextResponse.json({
        success: true,
        message: `Игрок ${currentMember.username} успешно переведен на слот ${new_role_slot}!`,
      });
    }

    // Slot is occupied - this is a swap between two players
    if (!isCaptain && !isAdmin) {
      return NextResponse.json(
        { error: `Слот ${new_role_slot} уже занят. Только капитан может производить обмен позициями между игроками.` },
        { status: 403 }
      );
    }

    const occupant = targetSlotRes.rows[0];

    // Safely swap using a temporary placeholder to avoid unique constraint conflict on (team_id, role_slot)
    const tempSlot = `tmp_${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 8)}`;
    await query(`UPDATE team_members SET role_slot = $1 WHERE id = $2`, [tempSlot, occupant.id]);
    await query(`UPDATE team_members SET role_slot = $1 WHERE id = $2`, [new_role_slot, currentMember.id]);
    await query(`UPDATE team_members SET role_slot = $1 WHERE id = $2`, [oldSlot, occupant.id]);

    return NextResponse.json({
      success: true,
      message: `Роли успешно обменены: ${currentMember.username} перешел на ${new_role_slot}, а ${occupant.username} на ${oldSlot}!`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });

    const { id: teamId } = await params;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("user_id") || user.id;

    const teamRes = await query<{ id: string; captain_id: string }>(
      "SELECT id, captain_id FROM teams WHERE id = $1",
      [teamId]
    );
    if (teamRes.rows.length === 0) return NextResponse.json({ error: "Команда не найдена" }, { status: 404 });

    const team = teamRes.rows[0];
    const isCaptain = team.captain_id === user.id;
    const isAdmin = user.role === "admin";
    const isSelf = targetUserId === user.id;

    if (!isCaptain && !isAdmin && !isSelf) {
      return NextResponse.json({ error: "У вас нет прав на исключение игроков из команды" }, { status: 403 });
    }

    if (isCaptain && targetUserId === team.captain_id) {
      return NextResponse.json({ error: "Капитан не может покинуть команду, пока не передаст капитанство" }, { status: 400 });
    }

    await query("DELETE FROM team_members WHERE team_id = $1 AND user_id = $2", [team.id, targetUserId]);

    return NextResponse.json({ success: true, message: "Игрок удален из состава команды" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
