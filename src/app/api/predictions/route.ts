import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const tournamentId = "ti-2026-main";

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
        predicted_winner_id: string;
        predicted_team1_score: number;
        predicted_team2_score: number;
        points_awarded: number;
        is_calculated: boolean;
      }>(
        `SELECT match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score, points_awarded, is_calculated
         FROM predictions WHERE user_id = $1`,
        [user.id]
      );
      userPredictions = predRes.rows;
    }

    const predictionMap = new Map(userPredictions.map((p) => [p.match_id, p]));

    const matchesWithPredictions = matchesRes.rows.map((m) => ({
      ...m,
      user_prediction: predictionMap.get(m.id) || null,
    }));

    return NextResponse.json({
      tournament,
      is_predictions_locked: tournament.is_predictions_locked,
      matches: matchesWithPredictions,
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

    const { match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score } = await req.json();

    if (!match_id || !predicted_winner_id || predicted_team1_score === undefined || predicted_team2_score === undefined) {
      return NextResponse.json({ error: "Все поля прогноза обязательны" }, { status: 400 });
    }

    const tournamentRes = await query<{ is_predictions_locked: boolean }>(
      `SELECT t.is_predictions_locked
       FROM matches m
       JOIN tournaments t ON t.id = m.tournament_id
       WHERE m.id = $1`,
      [match_id]
    );

    if (tournamentRes.rows.length === 0) {
      return NextResponse.json({ error: "Матч не найден" }, { status: 404 });
    }

    if (tournamentRes.rows[0].is_predictions_locked) {
      return NextResponse.json({ error: "Прогнозы заблокированы администратором" }, { status: 400 });
    }

    const matchRes = await query<{
      id: string;
      status: string;
      team1_id: string | null;
      team2_id: string | null;
    }>(
      `SELECT id, status, team1_id, team2_id FROM matches WHERE id = $1`,
      [match_id]
    );

    const match = matchRes.rows[0];
    if (match.status !== "pending") {
      return NextResponse.json({ error: "Матч уже начался или завершен" }, { status: 400 });
    }

    if (!match.team1_id || !match.team2_id) {
      return NextResponse.json({ error: "Команды для этого матча еще не определены" }, { status: 400 });
    }

    if (predicted_winner_id !== match.team1_id && predicted_winner_id !== match.team2_id) {
      return NextResponse.json({ error: "Недопустимый победитель для этого матча" }, { status: 400 });
    }

    const s1 = parseInt(predicted_team1_score, 10);
    const s2 = parseInt(predicted_team2_score, 10);
    const validScores = [
      [2, 0],
      [2, 1],
      [0, 2],
      [1, 2],
    ];

    const isValidScore = validScores.some(([a, b]) => a === s1 && b === s2);
    if (!isValidScore) {
      return NextResponse.json({ error: "Счет Bo3 матча должен быть 2:0, 2:1, 0:2 или 1:2" }, { status: 400 });
    }

    if (predicted_winner_id === match.team1_id && s1 <= s2) {
      return NextResponse.json({ error: "Выбранная команда победителем должна иметь больше выигранных карт" }, { status: 400 });
    }

    if (predicted_winner_id === match.team2_id && s2 <= s1) {
      return NextResponse.json({ error: "Выбранная команда победителем должна иметь больше выигранных карт" }, { status: 400 });
    }

    const existingPred = await query<{ id: string }>(
      `SELECT id FROM predictions WHERE user_id = $1 AND match_id = $2`,
      [user.id, match_id]
    );

    if (existingPred.rows.length === 0) {
      const predId = "pr_" + crypto.randomBytes(8).toString("hex");
      await query(
        `INSERT INTO predictions (id, user_id, match_id, predicted_winner_id, predicted_team1_score, predicted_team2_score)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [predId, user.id, match_id, predicted_winner_id, s1, s2]
      );
    } else {
      await query(
        `UPDATE predictions
         SET predicted_winner_id = $1, predicted_team1_score = $2, predicted_team2_score = $3, created_at = NOW()
         WHERE user_id = $4 AND match_id = $5`,
        [predicted_winner_id, s1, s2, user.id, match_id]
      );
    }

    return NextResponse.json({ success: true, message: "Прогноз сохранен!" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Ошибка сервера" }, { status: 500 });
  }
}
