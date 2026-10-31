"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BRACKET_MATCH_DEFINITIONS = void 0;
exports.advanceDoubleElimination = advanceDoubleElimination;
exports.evaluatePredictionPoints = evaluatePredictionPoints;
const db_1 = require("./db");
exports.BRACKET_MATCH_DEFINITIONS = [
    { match_code: "UB1", bracket_type: "upper", round_name: "Верхняя сетка — Полуфинал 1", match_order: 1 },
    { match_code: "UB2", bracket_type: "upper", round_name: "Верхняя сетка — Полуфинал 2", match_order: 2 },
    { match_code: "LB1", bracket_type: "lower", round_name: "Нижняя сетка — Раунд 1", match_order: 3 },
    { match_code: "UBF", bracket_type: "upper", round_name: "Верхняя сетка — Финал", match_order: 4 },
    { match_code: "LBF", bracket_type: "lower", round_name: "Нижняя сетка — Финал", match_order: 5 },
    { match_code: "GF", bracket_type: "grand_final", round_name: "Гранд-Финал (Bo3)", match_order: 6 },
];
async function advanceDoubleElimination(tournamentId, matchCode, winnerId, loserId) {
    if (matchCode === "UB1") {
        await (0, db_1.query)(`UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'UBF'`, [winnerId, tournamentId]);
        await (0, db_1.query)(`UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'LB1'`, [loserId, tournamentId]);
    }
    else if (matchCode === "UB2") {
        await (0, db_1.query)(`UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'UBF'`, [winnerId, tournamentId]);
        await (0, db_1.query)(`UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'LB1'`, [loserId, tournamentId]);
    }
    else if (matchCode === "UBF") {
        await (0, db_1.query)(`UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'GF'`, [winnerId, tournamentId]);
        await (0, db_1.query)(`UPDATE matches SET team1_id = $1 WHERE tournament_id = $2 AND match_code = 'LBF'`, [loserId, tournamentId]);
    }
    else if (matchCode === "LB1") {
        await (0, db_1.query)(`UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'LBF'`, [winnerId, tournamentId]);
    }
    else if (matchCode === "LBF") {
        await (0, db_1.query)(`UPDATE matches SET team2_id = $1 WHERE tournament_id = $2 AND match_code = 'GF'`, [winnerId, tournamentId]);
    }
}
function evaluatePredictionPoints(predWinnerId, predT1, predT2, actualWinnerId, actualT1, actualT2) {
    if (predWinnerId !== actualWinnerId) {
        return 0;
    }
    let points = 5;
    if (predT1 === actualT1 && predT2 === actualT2) {
        points += 5;
    }
    return points;
}
