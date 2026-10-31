import { NextRequest, NextResponse } from "next/server";
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

    return NextResponse.json({
      team,
      roster,
      is_eligible_for_tournament: primarySlotsFilled && allSteamLinked,
      primarySlotsFilled,
      allSteamLinked,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
