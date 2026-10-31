export interface TraitDefinition {
  id: string;
  label: string;
  category: "kills" | "deaths" | "cs" | "economy" | "support" | "objectives" | "combat";
  colorClass: string;
  minBonus: number;
  maxBonus: number;
}

export interface RolledTrait {
  id: string;
  label: string;
  bonus: number;
  colorClass: string;
}

export interface PlayerStats {
  kills: number;
  deaths: number;
  assists: number;
  last_hits: number;
  denies: number;
  gpm: number;
  wards_placed: number;
  wards_destroyed: number;
  tower_kills: number;
  roshan_kills: number;
  first_blood: boolean;
  stuns: number;
}

export const ROLE_CONFIGS: Record<string, { label: string; group: "core" | "mid" | "support"; order: number }> = {
  pos1: { label: "Керри (Позиция 1)", group: "core", order: 1 },
  pos2: { label: "Мидлейнер (Позиция 2)", group: "mid", order: 2 },
  pos3: { label: "Оффлейнер (Позиция 3)", group: "core", order: 3 },
  pos4: { label: "Частичная поддержка (Позиция 4)", group: "support", order: 4 },
  pos5: { label: "Полная поддержка (Позиция 5)", group: "support", order: 5 },
};

export const FANTASY_TRAITS_POOL: TraitDefinition[] = [
  { id: "kills", label: "Убийства", category: "kills", colorClass: "text-red-400 bg-red-950/50 border-red-500/40", minBonus: 15, maxBonus: 35 },
  { id: "deaths", label: "Снижение штрафа смертей", category: "deaths", colorClass: "text-emerald-400 bg-emerald-950/50 border-emerald-500/40", minBonus: 15, maxBonus: 40 },
  { id: "creep_score", label: "Добивания (CS)", category: "cs", colorClass: "text-green-400 bg-green-950/50 border-green-500/40", minBonus: 15, maxBonus: 40 },
  { id: "gpm", label: "Золото в минуту (GPM)", category: "economy", colorClass: "text-blue-300 bg-blue-950/50 border-blue-500/40", minBonus: 10, maxBonus: 30 },
  { id: "wards", label: "Установка и снятие вардов", category: "support", colorClass: "text-sky-400 bg-sky-950/50 border-sky-500/40", minBonus: 15, maxBonus: 45 },
  { id: "towers", label: "Урон по вышкам", category: "objectives", colorClass: "text-cyan-400 bg-cyan-950/50 border-cyan-500/40", minBonus: 15, maxBonus: 35 },
  { id: "roshan", label: "Убийства Рошана", category: "objectives", colorClass: "text-rose-400 bg-rose-950/50 border-rose-500/40", minBonus: 20, maxBonus: 50 },
  { id: "first_blood", label: "Первая кровь (FB)", category: "combat", colorClass: "text-purple-400 bg-purple-950/50 border-purple-500/40", minBonus: 25, maxBonus: 50 },
  { id: "stuns", label: "Оглушения", category: "combat", colorClass: "text-cyan-400 bg-cyan-950/50 border-cyan-500/40", minBonus: 15, maxBonus: 40 },
  { id: "assists", label: "Помощь в убийствах", category: "combat", colorClass: "text-teal-400 bg-teal-950/50 border-teal-500/40", minBonus: 10, maxBonus: 30 },
];

export function rollRandomTraits(count = 3): RolledTrait[] {
  const shuffled = [...FANTASY_TRAITS_POOL].sort(() => Math.random() - 0.5);
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

export const BANNER_CONFIGS = {
  core: {
    id: "core",
    title: "ОСНОВА",
    subtitle: "Керри (Позиция 1) и Оффлейнер (Позиция 3)",
    roles: ["pos1", "pos3"],
    playerCount: 2,
  },
  mid: {
    id: "mid",
    title: "ЦЕНТР",
    subtitle: "Мидлейнер (Позиция 2)",
    roles: ["pos2"],
    playerCount: 1,
  },
  support: {
    id: "support",
    title: "ПОДДЕРЖКА",
    subtitle: "Частичная (Позиция 4) и Полная поддержка (Позиция 5)",
    roles: ["pos4", "pos5"],
    playerCount: 2,
  },
} as const;

export function calculateFantasyPoints(stats: Partial<PlayerStats>, traits: RolledTrait[] = []): number {
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
    if (t.id === "kills") bonusKills = fraction;
    if (t.id === "deaths") bonusDeaths = fraction;
    if (t.id === "creep_score") bonusCs = fraction;
    if (t.id === "gpm") bonusGpm = fraction;
    if (t.id === "wards") bonusWards = fraction;
    if (t.id === "towers") bonusTowers = fraction;
    if (t.id === "roshan") bonusRoshan = fraction;
    if (t.id === "first_blood") bonusFb = fraction;
    if (t.id === "stuns") bonusStuns = fraction;
    if (t.id === "assists") bonusAssists = fraction;
  }

  const kills = Number(stats.kills) || 0;
  const deaths = Number(stats.deaths) || 0;
  const assists = Number(stats.assists) || 0;
  const lastHits = Number(stats.last_hits) || 0;
  const denies = Number(stats.denies) || 0;
  const gpm = Number(stats.gpm) || 0;
  const wardsPlaced = Number(stats.wards_placed) || 0;
  const wardsDestroyed = Number(stats.wards_destroyed) || 0;
  const towerKills = Number(stats.tower_kills) || 0;
  const roshanKills = Number(stats.roshan_kills) || 0;
  const firstBlood = Boolean(stats.first_blood);
  const stuns = Number(stats.stuns) || 0;

  const killsPts = (kills * 0.3) * (1 + bonusKills);
  const deathPenalty = (deaths * 0.3) * (1 - bonusDeaths);
  const deathsPts = Math.max(0, 3.0 - deathPenalty);
  const csPts = ((lastHits + denies) * 0.003) * (1 + bonusCs);
  const gpmPts = (gpm * 0.002) * (1 + bonusGpm);
  const wardsPts = ((wardsPlaced + wardsDestroyed) * 0.5) * (1 + bonusWards);
  const towersPts = (towerKills * 1.0) * (1 + bonusTowers);
  const roshanPts = (roshanKills * 1.5) * (1 + bonusRoshan);
  const fbPts = (firstBlood ? 4.0 : 0) * (1 + bonusFb);
  const assistsPts = (assists * 0.15) * (1 + bonusAssists);
  const stunsPts = (stuns * 0.05) * (1 + bonusStuns);

  const total = killsPts + deathsPts + csPts + gpmPts + wardsPts + towersPts + roshanPts + fbPts + assistsPts + stunsPts;
  return Math.round(total * 100) / 100;
}
