import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tournamentId = "ti-2026-main";

    const fantasyPointsRes = await query<{
      user_id: string;
      fantasy_points: string;
    }>(
      `SELECT user_id, COALESCE(SUM(points_earned), 0) AS fantasy_points
       FROM fantasy_cards
       WHERE tournament_id = $1
       GROUP BY user_id`,
      [tournamentId]
    );

    const predictionPointsRes = await query<{
      user_id: string;
      prediction_points: string;
    }>(
      `SELECT p.user_id, COALESCE(SUM(p.points_awarded), 0) AS prediction_points
       FROM predictions p
       JOIN matches m ON m.id = p.match_id
       WHERE m.tournament_id = $1
       GROUP BY p.user_id`,
      [tournamentId]
    );

    const usersRes = await query<{
      id: string;
      username: string;
      steam_id: string | null;
      steam_name: string | null;
      steam_avatar: string | null;
    }>(
      `SELECT id, username, steam_id, steam_name, steam_avatar FROM users`
    );

    const fantasyMap = new Map(
      fantasyPointsRes.rows.map((r) => [r.user_id, parseFloat(r.fantasy_points) || 0])
    );
    const predictionMap = new Map(
      predictionPointsRes.rows.map((r) => [r.user_id, parseInt(r.prediction_points, 10) || 0])
    );

    const leaderboard = usersRes.rows.map((u) => {
      const fPts = Math.round((fantasyMap.get(u.id) || 0) * 100) / 100;
      const pPts = predictionMap.get(u.id) || 0;
      const total = Math.round((fPts + pPts) * 100) / 100;
      return {
        user_id: u.id,
        username: u.username,
        steam_id: u.steam_id,
        steam_name: u.steam_name,
        steam_avatar: u.steam_avatar,
        fantasy_points: fPts,
        prediction_points: pPts,
        total_points: total,
      };
    });

    leaderboard.sort((a, b) => b.total_points - a.total_points || b.fantasy_points - a.fantasy_points);

    const rankedLeaderboard = leaderboard.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    let currentUserEntry = null;
    if (user) {
      currentUserEntry = rankedLeaderboard.find((item) => item.user_id === user.id) || null;
    }

    return NextResponse.json({
      leaderboard: rankedLeaderboard,
      current_user_rank: currentUserEntry,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
