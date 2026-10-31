import assert from "node:assert/strict";
import { evaluatePredictionPoints } from "../lib/bracket";

function testEvaluatePredictionPoints() {
  const ptsExact = evaluatePredictionPoints("teamA", 2, 1, "teamA", 2, 1);
  assert.equal(ptsExact, 10);

  const ptsWinnerOnly = evaluatePredictionPoints("teamA", 2, 0, "teamA", 2, 1);
  assert.equal(ptsWinnerOnly, 5);

  const ptsWrongWinner = evaluatePredictionPoints("teamB", 0, 2, "teamA", 2, 1);
  assert.equal(ptsWrongWinner, 0);

  const ptsSweepExact = evaluatePredictionPoints("teamB", 0, 2, "teamB", 0, 2);
  assert.equal(ptsSweepExact, 10);
}

testEvaluatePredictionPoints();
console.log("Bracket & Prediction unit tests PASSED successfully!");
