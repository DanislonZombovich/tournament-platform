import { query } from "./db";

export interface MatchEntity {
  id: string;
  tournament_id: string;
  match_code: string;
  bracket_type: "upper" | "lower" | "grand_final";
  round_name: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number;
  team2_score: number;
  winner_id: string | null;
  status: "pending" | "in_progress" | "completed";
  match_order: number;
}

export const BRACKET_MATCH_DEFINITIONS = [
  { match_code: "UB1", bracket_type: "upper", round_name: "Верхняя сетка — Полуфинал 1", match_order: 1 },
  { match_code: "UB2", bracket_type: "upper", round_name: "Верхняя сетка — Полуфинал 2", match_order: 2 },
  { match_code: "LB1", bracket_type: "lower", round_name: "Нижняя сетка — Раунд 1", match_order: 3 },
  { match_code: "UBF", bracket_type: "upper", round_name: "Верхняя сетка — Финал", match_order: 4 },
  { match_code: "LBF", bracket_type: "lower", round_name: "Нижняя сетка — Финал", match_order: 5 },
  { match_code: "GF", bracket_type: "grand_final", round_name: "Гранд-Финал (Bo3)", match_order: 6 },
];

export async function advanceDoubleElimination(
  tournamentId: string,
  matchCode: string,
  winnerId: string,
  loserId: string
) {
  if (matchCode === "UB1") {
    await query(
      `UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'UBF'`,
      [winnerId, tournamentId]
    );
    await query(
      `UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'LB1'`,
      [loserId, tournamentId]
    );
  } else if (matchCode === "UB2") {
    await query(
      `UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'UBF'`,
      [winnerId, tournamentId]
    );
    await query(
      `UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'LB1'`,
      [loserId, tournamentId]
    );
  } else if (matchCode === "UBF") {
    await query(
      `UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'GF'`,
      [winnerId, tournamentId]
    );
    await query(
      `UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'LBF'`,
      [loserId, tournamentId]
    );
  } else if (matchCode === "LB1") {
    await query(
      `UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'LBF'`,
      [winnerId, tournamentId]
    );
  } else if (matchCode === "LBF") {
    await query(
      `UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'GF'`,
      [winnerId, tournamentId]
    );
  }
}

export function evaluatePredictionPoints(
  predWinnerId: string,
  predT1: number,
  predT2: number,
  actualWinnerId: string,
  actualT1: number,
  actualT2: number
): number {
  if (predWinnerId !== actualWinnerId) {
    return 0;
  }
  let points = 5;
  if (predT1 === actualT1 && predT2 === actualT2) {
    points += 5;
  }
  return points;
}
