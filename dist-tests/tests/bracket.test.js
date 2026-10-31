"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const bracket_1 = require("../lib/bracket");
function testEvaluatePredictionPoints() {
    const ptsExact = (0, bracket_1.evaluatePredictionPoints)("teamA", 2, 1, "teamA", 2, 1);
    strict_1.default.equal(ptsExact, 10);
    const ptsWinnerOnly = (0, bracket_1.evaluatePredictionPoints)("teamA", 2, 0, "teamA", 2, 1);
    strict_1.default.equal(ptsWinnerOnly, 5);
    const ptsWrongWinner = (0, bracket_1.evaluatePredictionPoints)("teamB", 0, 2, "teamA", 2, 1);
    strict_1.default.equal(ptsWrongWinner, 0);
    const ptsSweepExact = (0, bracket_1.evaluatePredictionPoints)("teamB", 0, 2, "teamB", 0, 2);
    strict_1.default.equal(ptsSweepExact, 10);
}
testEvaluatePredictionPoints();
console.log("Bracket & Prediction unit tests PASSED successfully!");
