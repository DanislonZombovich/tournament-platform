import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }

  const teamRes = await query<{
    team_id: string;
    team_name: string;
    team_tag: string;
    team_logo: string;
    role_slot: string;
  }>(
    `SELECT t.id AS team_id, t.name AS team_name, t.tag AS team_tag, t.logo_url AS team_logo, tm.role_slot
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1`,
    [user.id]
  );

  return NextResponse.json({
    user,
    team: teamRes.rows[0] || null,
  });
}
