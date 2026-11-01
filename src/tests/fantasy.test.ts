import assert from "node:assert/strict";
import {
  calculateBestGameFantasyPoints,
  calculateEmblemPoints,
  calculateFantasyPoints,
  calculateGameFantasyPoints,
  DEFAULT_ROLE_EMBLEMS,
  PlayerStats,
  VALVE_FANTASY_EMBLEMS,
} from "../lib/fantasy";

function testAll18EmblemsExist() {
  const keys = Object.keys(VALVE_FANTASY_EMBLEMS);
  assert.equal(keys.length, 18);

  const expectedIds = [
    "creepScore",
    "gpm",
    "deaths",
    "towerKills",
    "kills",
    "madstones",
    "campsStacked",
    "runes",
    "lotuses",
    "watchers",
    "obsPlaced",
    "smokes",
    "teamfight",
    "stuns",
    "firstblood",
    "tormentorKills",
    "roshanKills",
    "courierKills",
  ];

  for (const id of expectedIds) {
    const emblem = VALVE_FANTASY_EMBLEMS[id];
    assert.ok(emblem, `Emblem ${id} must exist`);
    assert.equal(emblem.id, id);
    assert.equal(emblem.modifier, 100, `Emblem ${id} modifier must be 100%`);
    assert.ok(emblem.label.length > 0);
    assert.ok(["red", "blue", "green"].includes(emblem.color));
  }
}

function testValveEmblemCalculations() {
  const stats: PlayerStats = {
    kills: 10,
    deaths: 3,
    assists: 15,
    last_hits: 300,
    denies: 10,
    gpm: 750,
    wards_placed: 8,
    tower_kills: 4,
    roshan_kills: 2,
    first_blood: true,
    stuns: 35,
    madstones: 12,
    camps_stacked: 6,
    runes: 7,
    watchers: 5,
    lotuses: 4,
    smokes: 3,
    teamfight_pct: 0.75,
    tormentor_kills: 1,
    courier_kills: 2,
  };

  assert.equal(calculateEmblemPoints("creepScore", stats), 300 * 3);
  assert.equal(calculateEmblemPoints("gpm", stats), 750 * 2);
  assert.equal(calculateEmblemPoints("deaths", stats), 1950 - 3 * 195);
  assert.equal(calculateEmblemPoints("towerKills", stats), 4 * 352);
  assert.equal(calculateEmblemPoints("kills", stats), 10 * 107);
  assert.equal(calculateEmblemPoints("madstones", stats), 12 * 13);
  assert.equal(calculateEmblemPoints("campsStacked", stats), 6 * 234);
  assert.equal(calculateEmblemPoints("runes", stats), 7 * 141);
  assert.equal(calculateEmblemPoints("watchers", stats), 5 * 147);
  assert.equal(calculateEmblemPoints("lotuses", stats), 4 * 176);
  assert.equal(calculateEmblemPoints("obsPlaced", stats), 8 * 117);
  assert.equal(calculateEmblemPoints("smokes", stats), 3 * 293);
  assert.equal(calculateEmblemPoints("teamfight", stats), Math.round(0.75 * 2124));
  assert.equal(calculateEmblemPoints("stuns", stats), 35 * 10);
  assert.equal(calculateEmblemPoints("firstblood", stats), 1934);
  assert.equal(calculateEmblemPoints("tormentorKills", stats), 1 * 879);
  assert.equal(calculateEmblemPoints("roshanKills", stats), 2 * 1172);
  assert.equal(calculateEmblemPoints("courierKills", stats), 2 * 703);
}

function testDeathsCanGoNegative() {
  const badGameStats: Partial<PlayerStats> = {
    deaths: 12,
  };
  const pts = calculateEmblemPoints("deaths", badGameStats);
  assert.equal(pts, 1950 - 12 * 195);
  assert.ok(pts < 0);
}

function testThreeEmblemsSelection() {
  const stats: Partial<PlayerStats> = {
    last_hits: 200,
    deaths: 2,
    tower_kills: 3,
  };

  const selected = ["creepScore", "deaths", "towerKills"];
  const total = calculateGameFantasyPoints(stats, selected);

  const csPts = 200 * 3;
  const deathsPts = 1950 - 2 * 195;
  const towerPts = 3 * 352;
  const expected = csPts + deathsPts + towerPts;

  assert.equal(total, expected);
  assert.equal(calculateFantasyPoints(stats, selected), expected);
}

function testBestGameRuleMultipleGames() {
  const game1Stats: Partial<PlayerStats> = {
    last_hits: 100,
    deaths: 8,
    tower_kills: 0,
  };

  const game2Stats: Partial<PlayerStats> = {
    last_hits: 450,
    deaths: 1,
    tower_kills: 5,
  };

  const game3Stats: Partial<PlayerStats> = {
    last_hits: 250,
    deaths: 4,
    tower_kills: 2,
  };

  const selectedEmblems = ["creepScore", "deaths", "towerKills"];

  const g1Score = calculateGameFantasyPoints(game1Stats, selectedEmblems);
  const g2Score = calculateGameFantasyPoints(game2Stats, selectedEmblems);
  const g3Score = calculateGameFantasyPoints(game3Stats, selectedEmblems);

  assert.ok(g2Score > g1Score);
  assert.ok(g2Score > g3Score);

  const result = calculateBestGameFantasyPoints(
    [game1Stats, game2Stats, game3Stats],
    selectedEmblems
  );

  assert.equal(result.bestScore, g2Score);
  assert.equal(result.bestGameIndex, 1);
  assert.deepEqual(result.gameScores, [g1Score, g2Score, g3Score]);
}

function testDefaultRoleEmblems() {
  assert.ok(DEFAULT_ROLE_EMBLEMS.pos1.length === 3);
  assert.ok(DEFAULT_ROLE_EMBLEMS.pos2.length === 3);
  assert.ok(DEFAULT_ROLE_EMBLEMS.pos3.length === 3);
  assert.ok(DEFAULT_ROLE_EMBLEMS.pos4.length === 3);
  assert.ok(DEFAULT_ROLE_EMBLEMS.pos5.length === 3);
}

function runAll() {
  console.log("Running Valve fantasy unit tests...");
  testAll18EmblemsExist();
  testValveEmblemCalculations();
  testDeathsCanGoNegative();
  testThreeEmblemsSelection();
  testBestGameRuleMultipleGames();
  testDefaultRoleEmblems();
  console.log("All Valve fantasy unit tests passed! [OK]");
}

runAll();
