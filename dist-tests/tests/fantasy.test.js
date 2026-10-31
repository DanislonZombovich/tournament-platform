"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const fantasy_1 = require("../lib/fantasy");
function testRollRandomTraits() {
    const traits = (0, fantasy_1.rollRandomTraits)(3);
    strict_1.default.equal(traits.length, 3);
    const ids = new Set(traits.map((t) => t.id));
    strict_1.default.equal(ids.size, 3);
    for (const t of traits) {
        const def = fantasy_1.FANTASY_TRAITS_POOL.find((p) => p.id === t.id);
        strict_1.default.ok(def);
        strict_1.default.ok(t.bonus >= def.minBonus && t.bonus <= def.maxBonus);
        strict_1.default.ok(t.label.length > 0);
    }
}
function testCalculateFantasyPointsBase() {
    const stats = {
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
    };
    const pts = (0, fantasy_1.calculateFantasyPoints)(stats, []);
    strict_1.default.ok(pts > 15);
    const killsPts = 10 * 0.3;
    const deathsPts = Math.max(0, 3.0 - (2 * 0.3));
    const csPts = (210) * 0.003;
    const gpmPts = 600 * 0.002;
    const wardsPts = 6 * 0.5;
    const towerPts = 2 * 1.0;
    const roshanPts = 1 * 1.5;
    const fbPts = 4.0;
    const assistsPts = 10 * 0.15;
    const stunsPts = 20 * 0.05;
    const expected = Math.round((killsPts + deathsPts + csPts + gpmPts + wardsPts + towerPts + roshanPts + fbPts + assistsPts + stunsPts) * 100) / 100;
    strict_1.default.equal(pts, expected);
}
function testCalculateFantasyPointsWithTraits() {
    const stats = {
        kills: 10,
        deaths: 2,
        assists: 0,
        last_hits: 100,
        denies: 0,
        gpm: 500,
        wards_placed: 0,
        wards_destroyed: 0,
        tower_kills: 0,
        roshan_kills: 0,
        first_blood: false,
        stuns: 0,
    };
    const basePts = (0, fantasy_1.calculateFantasyPoints)(stats, []);
    const traits = [
        { id: "kills", label: "Убийства", bonus: 20, colorClass: "" },
        { id: "gpm", label: "GPM", bonus: 30, colorClass: "" },
    ];
    const boostedPts = (0, fantasy_1.calculateFantasyPoints)(stats, traits);
    strict_1.default.ok(boostedPts > basePts);
    const extraKills = (10 * 0.3) * 0.20;
    const extraGpm = (500 * 0.002) * 0.30;
    strict_1.default.equal(boostedPts, Math.round((basePts + extraKills + extraGpm) * 100) / 100);
}
function testCalculateFantasyPointsEdgeCases() {
    const zeroStats = {
        kills: 0,
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
    };
    const zeroPts = (0, fantasy_1.calculateFantasyPoints)(zeroStats, []);
    strict_1.default.equal(zeroPts, 3.0);
    const highDeathsStats = {
        ...zeroStats,
        deaths: 25,
    };
    const highDeathsPts = (0, fantasy_1.calculateFantasyPoints)(highDeathsStats, []);
    strict_1.default.equal(highDeathsPts, 0);
}
testRollRandomTraits();
testCalculateFantasyPointsBase();
testCalculateFantasyPointsWithTraits();
testCalculateFantasyPointsEdgeCases();
console.log("Fantasy unit tests PASSED successfully!");
