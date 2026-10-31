import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("tournament_id") || "ti-2026-main";

    const tournamentRes = await query<{
      id: string;
      title: string;
      status: string;
      is_predictions_locked: boolean;
    }>(
      `SELECT id, title, status, is_predictions_locked FROM tournaments WHERE id = $1`,
      [tournamentId]
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Турнир не найден" }, { status: 404 });
    }

    const tournament = tournamentRes.rows[0];

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
      [tournamentId]
    );

    let userPredictions: any[] = [];
    if (user) {
      const predRes = await query<{
        match_id: string;
        predicted_winner_id: string | null;
        predicted_team1_score: number;
        predicted_team2_score: number;
        points_awarded: number;
        is_calculated: boolean;
      }>(
        `SELECT p.match_id, p.predicted_winner_id, p.predicted_team1_score, p.predicted_team2_score,
                p.points_awarded, p.is_calculated
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         WHERE p.user_id = $1 AND m.tournament_id = $2`,
        [user.id, tournamentId]
      );
      userPredictions = predRes.rows;
    }

    return NextResponse.json({
      tournament,
      is_predictions_locked: tournament.is_predictions_locked,
      matches: matchesRes.rows,
      user_predictions: userPredictions,
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

    const {
      match_id,
      predicted_winner_id,
      predicted_team1_score,
      predicted_team2_score,
      tournament_id = "ti-2026-main",
    } = await req.json();

    if (!match_id) {
      return NextResponse.json({ error: "Не указан матч" }, { status: 400 });
    }

    const matchRes = await query<{
      id: string;
      tournament_id: string;
      status: string;
      team1_id: string | null;
      team2_id: string | null;
    }>(
      `SELECT m.id, m.tournament_id, m.status, m.team1_id, m.team2_id
       FROM matches m
       WHERE m.id = $1`,
      [match_id]
    );

    if (matchRes.rows.length === 0) {
      return NextResponse.json({ error: "Матч не найден" }, { status: 404 });
    }

    const match = matchRes.rows[0];

    const tournamentRes = await query<{ id: string; is_predictions_locked: boolean }>(
      `SELECT id, is_predictions_locked FROM tournaments WHERE id = $1`,
      [match.tournament_id]
    );

    if (tournamentRes.rows.length > 0 && tournamentRes.rows[0].is_predictions_locked) {
      return NextResponse.json({ error: "Прогнозы заблокированы администратором турнира" }, { status: 400 });
    }

    if (match.status === "completed") {
      return NextResponse.json({ error: "Матч уже завершен, прогноз не принимается" }, { status: 400 });
    }

    const s1 = parseInt(predicted_team1_score, 10);
    const s2 = parseInt(predicted_team2_score, 10);

    if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) {
      return NextResponse.json({ error: "Некорректный прогноз счета" }, { status: 400 });
    }

    if (s1 === s2) {
      return NextResponse.json({ error: "В матче плей-офф не может быть ничьей" }, { status: 400 });
    }

    const predId = "pred_" + crypto.randomBytes(8).toString("hex");

    await query(
      `INSERT INTO predictions (
        id, user_id, match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score, points_awarded, is_calculated
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, false)
      ON CONFLICT (user_id, match_id)
      DO UPDATE SET
        predicted_winner_id = EXCLUDED.predicted_winner_id,
        predicted_team1_score = EXCLUDED.predicted_team1_score,
        predicted_team2_score = EXCLUDED.predicted_team2_score,
        points_awarded = 0,
        is_calculated = false`,
      [predId, user.id, match.id, predicted_winner_id, s1, s2]
    );

    return NextResponse.json({
      success: true,
      message: "Прогноз сохранен!",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
