export type CardQuality = "common" | "rare" | "epic" | "immortal";

export interface QualityConfig {
  id: CardQuality;
  name: string;
  nameRu: string;
  badgeClass: string;
  borderClass: string;
  glowClass: string;
  bonusMultiplier: number;
  minBonus: number;
  maxBonus: number;
}

export const CARD_QUALITIES: Record<CardQuality, QualityConfig> = {
  common: {
    id: "common",
    name: "Common",
    nameRu: "Обычный",
    badgeClass: "bg-stone-800 text-stone-300 border-stone-600",
    borderClass: "border-stone-700/60",
    glowClass: "from-stone-900/40",
    bonusMultiplier: 1.0,
    minBonus: 10,
    maxBonus: 20,
  },
  rare: {
    id: "rare",
    name: "Rare",
    nameRu: "Редкий (Серебро)",
    badgeClass: "bg-sky-950 text-sky-300 border-sky-500",
    borderClass: "border-sky-500/60 shadow-[0_0_15px_rgba(56,189,248,0.2)]",
    glowClass: "from-sky-950/50",
    bonusMultiplier: 1.1,
    minBonus: 15,
    maxBonus: 35,
  },
  epic: {
    id: "epic",
    name: "Epic",
    nameRu: "Эпический (Золото)",
    badgeClass: "bg-amber-950 text-amber-300 border-amber-500",
    borderClass: "border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.25)]",
    glowClass: "from-amber-950/60",
    bonusMultiplier: 1.25,
    minBonus: 25,
    maxBonus: 50,
  },
  immortal: {
    id: "immortal",
    name: "Immortal",
    nameRu: "Бессмертный",
    badgeClass: "bg-emerald-950 text-emerald-300 border-emerald-400",
    borderClass: "border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.35)]",
    glowClass: "from-emerald-950/70",
    bonusMultiplier: 1.4,
    minBonus: 40,
    maxBonus: 75,
  },
};

export interface CardTitle {
  id: string;
  name: string;
  description: string;
  bonusType: string;
  bonusPercent: number;
}

export const CARD_TITLES: CardTitle[] = [
  { id: "steel", name: "Стальной", description: "+15% к очкам за выживаемость и CS", bonusType: "survival", bonusPercent: 15 },
  { id: "fierce", name: "Свирепый", description: "+20% к очкам за убийства и First Blood", bonusType: "kills", bonusPercent: 20 },
  { id: "virtuoso", name: "Виртуозный", description: "+25% к очкам за GPM и добивания", bonusType: "cs", bonusPercent: 25 },
  { id: "unstoppable", name: "Неудержимый", description: "+20% к очкам за драки и объекты", bonusType: "objectives", bonusPercent: 20 },
  { id: "invulnerable", name: "Неуязвимый", description: "+30% к очкам за минимум смертей", bonusType: "deaths", bonusPercent: 30 },
  { id: "cold_blooded", name: "Хладнокровный", description: "+25% к очкам за оглушения и варды", bonusType: "support", bonusPercent: 25 },
  { id: "tactical", name: "Тактический", description: "+30% к очкам за руны и обзор", bonusType: "vision", bonusPercent: 30 },
  { id: "crushing", name: "Сокрушительный", description: "+30% к очкам за башни и Рошана", bonusType: "objectives", bonusPercent: 30 },
  { id: "legendary", name: "Легендарный", description: "+15% ко всем набранным очкам", bonusType: "all", bonusPercent: 15 },
  { id: "furious", name: "Яростный", description: "+20% к очкам за убийства и ассисты", bonusType: "kills", bonusPercent: 20 },
];

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
  locked?: boolean;
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
  camps_stacked?: number;
  runes_grabbed?: number;
  teamfight_pct?: number;
}

export const ROLE_CONFIGS: Record<string, { label: string; group: "core" | "mid" | "support"; order: number }> = {
  pos1: { label: "Керри (Позиция 1)", group: "core", order: 1 },
  pos2: { label: "Мидлейнер (Позиция 2)", group: "mid", order: 2 },
  pos3: { label: "Оффлейнер (Позиция 3)", group: "core", order: 3 },
  pos4: { label: "Частичная поддержка (Позиция 4)", group: "support", order: 4 },
  pos5: { label: "Полная поддержка (Позиция 5)", group: "support", order: 5 },
};

export const FANTASY_TRAITS_POOL: TraitDefinition[] = [
  { id: "kills", label: "Убийства (+1.21 за килл)", category: "kills", colorClass: "text-red-400 bg-red-950/60 border-red-500/40", minBonus: 15, maxBonus: 40 },
  { id: "deaths", label: "Снижение штрафа смертей", category: "deaths", colorClass: "text-emerald-400 bg-emerald-950/60 border-emerald-500/40", minBonus: 15, maxBonus: 45 },
  { id: "creep_score", label: "Добивания и денаи (CS)", category: "cs", colorClass: "text-green-400 bg-green-950/60 border-green-500/40", minBonus: 15, maxBonus: 40 },
  { id: "gpm", label: "Золото в минуту (GPM)", category: "economy", colorClass: "text-yellow-400 bg-yellow-950/60 border-yellow-500/40", minBonus: 10, maxBonus: 35 },
  { id: "wards", label: "Установка и снятие вардов (+1.13)", category: "support", colorClass: "text-sky-400 bg-sky-950/60 border-sky-500/40", minBonus: 15, maxBonus: 45 },
  { id: "towers", label: "Урон и добивание вышек (+3.40)", category: "objectives", colorClass: "text-amber-400 bg-amber-950/60 border-amber-500/40", minBonus: 15, maxBonus: 40 },
  { id: "roshan", label: "Убийства Рошана (+8.50)", category: "objectives", colorClass: "text-rose-400 bg-rose-950/60 border-rose-500/40", minBonus: 20, maxBonus: 50 },
  { id: "first_blood", label: "Первая кровь (FB +17.0)", category: "combat", colorClass: "text-purple-400 bg-purple-950/60 border-purple-500/40", minBonus: 20, maxBonus: 50 },
  { id: "stuns", label: "Оглушения (+0.15/сек)", category: "combat", colorClass: "text-cyan-400 bg-cyan-950/60 border-cyan-500/40", minBonus: 15, maxBonus: 45 },
  { id: "assists", label: "Помощь в убийствах (+0.60)", category: "combat", colorClass: "text-teal-400 bg-teal-950/60 border-teal-500/40", minBonus: 10, maxBonus: 35 },
  { id: "teamfight", label: "Участие в драках (Teamfight)", category: "combat", colorClass: "text-orange-400 bg-orange-950/60 border-orange-500/40", minBonus: 15, maxBonus: 40 },
  { id: "runes", label: "Подбор рун (+1.21)", category: "support", colorClass: "text-indigo-400 bg-indigo-950/60 border-indigo-500/40", minBonus: 15, maxBonus: 40 },
];

export function getRandomQuality(): CardQuality {
  const roll = Math.random();
  if (roll < 0.05) return "immortal"; // 5%
  if (roll < 0.25) return "epic";     // 20%
  if (roll < 0.60) return "rare";     // 35%
  return "common";                    // 40%
}

export function getRandomTitle(): string {
  const title = CARD_TITLES[Math.floor(Math.random() * CARD_TITLES.length)];
  return title.name;
}

export function rollRandomTraits(
  count = 3,
  quality: CardQuality = "common",
  existingTraits: RolledTrait[] = []
): RolledTrait[] {
  const qualityCfg = CARD_QUALITIES[quality] || CARD_QUALITIES.common;
  const result: RolledTrait[] = [];

  // Preserve locked traits
  const lockedTraits = existingTraits.filter((t) => t.locked);
  const lockedIds = new Set(lockedTraits.map((t) => t.id));
  result.push(...lockedTraits);

  const neededCount = Math.max(0, count - lockedTraits.length);
  const availablePool = FANTASY_TRAITS_POOL.filter((t) => !lockedIds.has(t.id));
  const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, neededCount);

  for (const trait of selected) {
    const min = Math.max(trait.minBonus, qualityCfg.minBonus);
    const max = Math.max(trait.maxBonus, qualityCfg.maxBonus);
    const bonus = Math.floor(Math.random() * (max - min + 1)) + min;

    result.push({
      id: trait.id,
      label: trait.label,
      bonus,
      colorClass: trait.colorClass,
      locked: false,
    });
  }

  return result;
}

/**
 * Calculates official fantasy points using Valve TI & Battlepass.ru formula:
 * - Kills: +1.21
 * - Deaths: Math.max(0, 18.0 - 1.8 * deaths)
 * - Creep Score (Last Hits + Denies): +0.03
 * - GPM: GPM * 0.02
 * - Tower Kills: +3.40
 * - Roshan Kills: +8.50
 * - Wards: +1.13 per observer ward
 * - Stuns: +0.15 per sec
 * - First Blood: +17.00
 * - Assists: +0.60
 * - Teamfight participation: up to 18.95
 * Applies bonuses from rolled card traits, title bonus, and quality multiplier.
 */
export function calculateFantasyPoints(
  stats: Partial<PlayerStats>,
  traits: RolledTrait[] = [],
  quality: CardQuality = "common",
  titleName = "Стальной"
): number {
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
  let bonusTeamfight = 0;
  let bonusRunes = 0;

  for (const t of traits) {
    const fraction = (t.bonus || 0) / 100;
    if (t.id === "kills") bonusKills += fraction;
    if (t.id === "deaths") bonusDeaths += fraction;
    if (t.id === "creep_score") bonusCs += fraction;
    if (t.id === "gpm") bonusGpm += fraction;
    if (t.id === "wards") bonusWards += fraction;
    if (t.id === "towers") bonusTowers += fraction;
    if (t.id === "roshan") bonusRoshan += fraction;
    if (t.id === "first_blood") bonusFb += fraction;
    if (t.id === "stuns") bonusStuns += fraction;
    if (t.id === "assists") bonusAssists += fraction;
    if (t.id === "teamfight") bonusTeamfight += fraction;
    if (t.id === "runes") bonusRunes += fraction;
  }

  // Title extra bonus
  const matchedTitle = CARD_TITLES.find((t) => t.name === titleName);
  if (matchedTitle) {
    const tFraction = matchedTitle.bonusPercent / 100;
    if (matchedTitle.bonusType === "kills") { bonusKills += tFraction; bonusFb += tFraction; }
    if (matchedTitle.bonusType === "survival") { bonusDeaths += tFraction; bonusCs += tFraction; }
    if (matchedTitle.bonusType === "cs") { bonusCs += tFraction; bonusGpm += tFraction; }
    if (matchedTitle.bonusType === "objectives") { bonusTowers += tFraction; bonusRoshan += tFraction; }
    if (matchedTitle.bonusType === "deaths") { bonusDeaths += tFraction; }
    if (matchedTitle.bonusType === "support") { bonusStuns += tFraction; bonusWards += tFraction; }
    if (matchedTitle.bonusType === "vision") { bonusWards += tFraction; bonusRunes += tFraction; }
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
  const runes = Number(stats.runes_grabbed) || 0;
  const teamfightPct = Number(stats.teamfight_pct) || 0.6; // default 60% if not tracked

  // Battlepass.ru exact formula weights
  const killsPts = (kills * 1.21) * (1 + bonusKills);
  const deathPenalty = (deaths * 1.80) * (1 - Math.min(0.8, bonusDeaths));
  const deathsPts = Math.max(0, 18.00 - deathPenalty);
  const csPts = ((lastHits + denies) * 0.03) * (1 + bonusCs);
  const gpmPts = (gpm * 0.02) * (1 + bonusGpm);
  const wardsPts = ((wardsPlaced + wardsDestroyed) * 1.13) * (1 + bonusWards);
  const towersPts = (towerKills * 3.40) * (1 + bonusTowers);
  const roshanPts = (roshanKills * 8.50) * (1 + bonusRoshan);
  const fbPts = (firstBlood ? 17.00 : 0) * (1 + bonusFb);
  const assistsPts = (assists * 0.60) * (1 + bonusAssists);
  const stunsPts = (stuns * 0.15) * (1 + bonusStuns);
  const runesPts = (runes * 1.21) * (1 + bonusRunes);
  const teamfightPts = (teamfightPct * 18.95) * (1 + bonusTeamfight);

  let rawTotal = killsPts + deathsPts + csPts + gpmPts + wardsPts + towersPts + roshanPts + fbPts + assistsPts + stunsPts + runesPts + teamfightPts;

  // Title 'all' bonus (e.g. Легендарный)
  if (matchedTitle?.bonusType === "all") {
    rawTotal *= (1 + matchedTitle.bonusPercent / 100);
  }

  // Quality multiplier (Rare: x1.1, Epic: x1.25, Immortal: x1.4)
  const qualityCfg = CARD_QUALITIES[quality] || CARD_QUALITIES.common;
  const finalTotal = rawTotal * qualityCfg.bonusMultiplier;

  return Math.round(finalTotal * 100) / 100;
}
