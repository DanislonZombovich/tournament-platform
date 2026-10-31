import assert from "node:assert/strict";
import {
  calculateFantasyPoints,
  FANTASY_TRAITS_POOL,
  PlayerStats,
  RolledTrait,
  rollRandomTraits,
  CARD_QUALITIES,
  CARD_TITLES,
} from "../lib/fantasy";

function testRollRandomTraits() {
  const traits = rollRandomTraits(3, "common");
  assert.equal(traits.length, 3);

  const ids = new Set(traits.map((t) => t.id));
  assert.equal(ids.size, 3);

  for (const t of traits) {
    const def = FANTASY_TRAITS_POOL.find((p) => p.id === t.id);
    assert.ok(def);
    assert.ok(t.bonus >= 10);
    assert.ok(t.label.length > 0);
  }
}

function testTraitLocking() {
  const initialTraits: RolledTrait[] = [
    { id: "kills", label: "Убийства", bonus: 35, colorClass: "", locked: true },
    { id: "deaths", label: "Смерти", bonus: 20, colorClass: "", locked: false },
    { id: "gpm", label: "GPM", bonus: 15, colorClass: "", locked: false },
  ];

  const rerolled = rollRandomTraits(3, "common", initialTraits);
  assert.equal(rerolled.length, 3);

  // The locked trait must remain intact with identical id, bonus and locked flag
  const lockedOne = rerolled.find((t) => t.id === "kills");
  assert.ok(lockedOne);
  assert.equal(lockedOne.bonus, 35);
  assert.equal(lockedOne.locked, true);
}

function testCalculateFantasyPointsBase() {
  const stats: PlayerStats = {
    kills: 10,
    deaths: 2,
    assists: 10,
    last_hits: 200,
    denies: 10,
    gpm: 600,
    wards_placed: 4,
    wards_destroyed: 2,
    tower_kills: 2,
    roshan_kills: 1,
    first_blood: true,
    stuns: 20,
    teamfight_pct: 0.6,
  };

  const pts = calculateFantasyPoints(stats, [], "common", "None");
  assert.ok(pts > 50);

  // Exact battlepass formula:
  // Kills: 10 * 1.21 = 12.1
  // Deaths: 18 - 2 * 1.8 = 14.4
  // CS: 210 * 0.03 = 6.3
  // GPM: 600 * 0.02 = 12.0
  // Wards: 6 * 1.13 = 6.78
  // Towers: 2 * 3.40 = 6.80
  // Roshan: 1 * 8.50 = 8.50
  // FB: 17.00
  // Assists: 10 * 0.60 = 6.00
  // Stuns: 20 * 0.15 = 3.00
  // Teamfight: 0.6 * 18.95 = 11.37
  // Total: 104.25
  const killsPts = 10 * 1.21;
  const deathsPts = Math.max(0, 18.00 - (2 * 1.80));
  const csPts = 210 * 0.03;
  const gpmPts = 600 * 0.02;
  const wardsPts = 6 * 1.13;
  const towerPts = 2 * 3.40;
  const roshanPts = 1 * 8.50;
  const fbPts = 17.00;
  const assistsPts = 10 * 0.60;
  const stunsPts = 20 * 0.15;
  const tfPts = 0.6 * 18.95;

  const expected = Math.round((killsPts + deathsPts + csPts + gpmPts + wardsPts + towerPts + roshanPts + fbPts + assistsPts + stunsPts + tfPts) * 100) / 100;
  assert.equal(pts, expected);
}

function testCalculateFantasyPointsQualityMultiplier() {
  const stats: PlayerStats = {
    kills: 10,
    deaths: 0,
    assists: 0,
    last_hits: 0,
    denies: 0,
    gpm: 0,
    wards_placed: 0,
    wards_destroyed: 0,
    tower_kills: 0,
    roshan_kills: 0,
    first_blood: false,
    stuns: 0,
    teamfight_pct: 0,
  };

  const commonPts = calculateFantasyPoints(stats, [], "common", "None");
  const rarePts = calculateFantasyPoints(stats, [], "rare", "None");
  const epicPts = calculateFantasyPoints(stats, [], "epic", "None");
  const immortalPts = calculateFantasyPoints(stats, [], "immortal", "None");

  assert.equal(rarePts, Math.round(commonPts * 1.1 * 100) / 100);
  assert.equal(epicPts, Math.round(commonPts * 1.25 * 100) / 100);
  assert.equal(immortalPts, Math.round(commonPts * 1.4 * 100) / 100);
}

function runAll() {
  console.log("Running fantasy unit tests...");
  testRollRandomTraits();
  testTraitLocking();
  testCalculateFantasyPointsBase();
  testCalculateFantasyPointsQualityMultiplier();
  console.log("All fantasy unit tests passed! [OK]");
}

runAll();
