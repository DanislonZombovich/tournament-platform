"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FANTASY_TRAITS_POOL = exports.ROLE_CONFIGS = void 0;
exports.rollRandomTraits = rollRandomTraits;
exports.calculateFantasyPoints = calculateFantasyPoints;
exports.ROLE_CONFIGS = {
    pos1: { label: "Керри (Позиция 1)", group: "core", order: 1 },
    pos2: { label: "Мидлейнер (Позиция 2)", group: "mid", order: 2 },
    pos3: { label: "Оффлейнер (Позиция 3)", group: "core", order: 3 },
    pos4: { label: "Частичная поддержка (Позиция 4)", group: "support", order: 4 },
    pos5: { label: "Полная поддержка (Позиция 5)", group: "support", order: 5 },
};
exports.FANTASY_TRAITS_POOL = [
    { id: "kills", label: "Убийства", category: "kills", colorClass: "text-red-400 bg-red-950/50 border-red-500/40", minBonus: 15, maxBonus: 35 },
    { id: "deaths", label: "Снижение штрафа смертей", category: "deaths", colorClass: "text-emerald-400 bg-emerald-950/50 border-emerald-500/40", minBonus: 15, maxBonus: 40 },
    { id: "creep_score", label: "Добивания (CS)", category: "cs", colorClass: "text-green-400 bg-green-950/50 border-green-500/40", minBonus: 15, maxBonus: 40 },
    { id: "gpm", label: "Золото в минуту (GPM)", category: "economy", colorClass: "text-amber-300 bg-amber-950/50 border-amber-500/40", minBonus: 10, maxBonus: 30 },
    { id: "wards", label: "Установка и снятие вардов", category: "support", colorClass: "text-sky-400 bg-sky-950/50 border-sky-500/40", minBonus: 15, maxBonus: 45 },
    { id: "towers", label: "Урон по вышкам", category: "objectives", colorClass: "text-orange-400 bg-orange-950/50 border-orange-500/40", minBonus: 15, maxBonus: 35 },
    { id: "roshan", label: "Убийства Рошана", category: "objectives", colorClass: "text-rose-400 bg-rose-950/50 border-rose-500/40", minBonus: 20, maxBonus: 50 },
    { id: "first_blood", label: "Первая кровь (FB)", category: "combat", colorClass: "text-purple-400 bg-purple-950/50 border-purple-500/40", minBonus: 25, maxBonus: 50 },
    { id: "stuns", label: "Оглушения", category: "combat", colorClass: "text-cyan-400 bg-cyan-950/50 border-cyan-500/40", minBonus: 15, maxBonus: 40 },
    { id: "assists", label: "Помощь в убийствах", category: "combat", colorClass: "text-teal-400 bg-teal-950/50 border-teal-500/40", minBonus: 10, maxBonus: 30 },
];
function rollRandomTraits(count = 3) {
    const shuffled = [...exports.FANTASY_TRAITS_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    return selected.map((trait) => {
        const bonus = Math.floor(Math.random() * (trait.maxBonus - trait.minBonus + 1)) + trait.minBonus;
        return {
            id: trait.id,
            label: trait.label,
            bonus,
            colorClass: trait.colorClass,
        };
    });
}
function calculateFantasyPoints(stats, traits = []) {
    let bonusKills = 0;
    let bonusDeaths = 0;
    let bonusCs = 0;
    let bonusGpm = 0;
    let bonusWards = 0;
    let bonusTowers = 0;
    let bonusRoshan = 0;
    let bonusFb = 0;
    let bonusStuns = 0;
    let bonusAssists = 0;
    for (const t of traits) {
        const fraction = (t.bonus || 0) / 100;
        if (t.id === "kills")
            bonusKills = fraction;
        if (t.id === "deaths")
            bonusDeaths = fraction;
        if (t.id === "creep_score")
            bonusCs = fraction;
        if (t.id === "gpm")
            bonusGpm = fraction;
        if (t.id === "wards")
            bonusWards = fraction;
        if (t.id === "towers")
            bonusTowers = fraction;
        if (t.id === "roshan")
            bonusRoshan = fraction;
        if (t.id === "first_blood")
            bonusFb = fraction;
        if (t.id === "stuns")
            bonusStuns = fraction;
        if (t.id === "assists")
            bonusAssists = fraction;
    }
    const killsPts = (stats.kills * 0.3) * (1 + bonusKills);
    const deathPenalty = (stats.deaths * 0.3) * (1 - bonusDeaths);
    const deathsPts = Math.max(0, 3.0 - deathPenalty);
    const csPts = ((stats.last_hits + stats.denies) * 0.003) * (1 + bonusCs);
    const gpmPts = (stats.gpm * 0.002) * (1 + bonusGpm);
    const wardsPts = ((stats.wards_placed + stats.wards_destroyed) * 0.5) * (1 + bonusWards);
    const towersPts = (stats.tower_kills * 1.0) * (1 + bonusTowers);
    const roshanPts = (stats.roshan_kills * 1.5) * (1 + bonusRoshan);
    const fbPts = (stats.first_blood ? 4.0 : 0) * (1 + bonusFb);
    const assistsPts = (stats.assists * 0.15) * (1 + bonusAssists);
    const stunsPts = (stats.stuns * 0.05) * (1 + bonusStuns);
    const total = killsPts + deathsPts + csPts + gpmPts + wardsPts + towersPts + roshanPts + fbPts + assistsPts + stunsPts;
    return Math.round(total * 100) / 100;
}
