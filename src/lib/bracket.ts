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

async function setDownstreamMatchTeam(
  tournamentId: string,
  matchCode: string,
  slot: "team1_id" | "team2_id",
  teamId: string
) {
  const currentMatchRes = await query<{
    id: string;
    team1_id: string | null;
    team2_id: string | null;
    status: string;
    winner_id: string | null;
  }>(
    `SELECT id, team1_id, team2_id, status, winner_id FROM matches WHERE tournament_id = $1 AND match_code = $2`,
    [tournamentId, matchCode]
  );

  if (currentMatchRes.rows.length === 0) return;
  const match = currentMatchRes.rows[0];
  const oldTeamInSlot = slot === "team1_id" ? match.team1_id : match.team2_id;

  if (oldTeamInSlot !== teamId) {
    if (match.status === "completed") {
      await query(
        `UPDATE matches SET ${slot} = $1, status = 'pending', team1_score = 0, team2_score = 0, winner_id = NULL
         WHERE id = $2`,
        [teamId, match.id]
      );
      await query(`DELETE FROM match_player_stats WHERE match_id = $1`, [match.id]);
      await query(
        `UPDATE predictions SET points_awarded = 0, is_calculated = false WHERE match_id = $1`,
        [match.id]
      );
    } else {
      await query(`UPDATE matches SET ${slot} = $1 WHERE id = $2`, [teamId, match.id]);
    }
  }
}

export async function advanceDoubleElimination(
  tournamentId: string,
  matchCode: string,
  winnerId: string,
  loserId: string
) {
  if (matchCode === "UB1") {
    await setDownstreamMatchTeam(tournamentId, "UBF", "team1_id", winnerId);
    await setDownstreamMatchTeam(tournamentId, "LB1", "team1_id", loserId);
  } else if (matchCode === "UB2") {
    await setDownstreamMatchTeam(tournamentId, "UBF", "team2_id", winnerId);
    await setDownstreamMatchTeam(tournamentId, "LB1", "team2_id", loserId);
  } else if (matchCode === "UBF") {
    await setDownstreamMatchTeam(tournamentId, "GF", "team1_id", winnerId);
    await setDownstreamMatchTeam(tournamentId, "LBF", "team1_id", loserId);
  } else if (matchCode === "LB1") {
    await setDownstreamMatchTeam(tournamentId, "LBF", "team2_id", winnerId);
  } else if (matchCode === "LBF") {
    await setDownstreamMatchTeam(tournamentId, "GF", "team2_id", winnerId);
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
