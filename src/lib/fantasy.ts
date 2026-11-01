export type EmblemColor = "red" | "blue" | "green";

export interface FantasyEmblem {
  id: string;
  label: string;
  color: EmblemColor;
  points: number;
  unit: string;
  description: string;
  modifier: number;
}

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
  wards_destroyed?: number;
  tower_kills: number;
  roshan_kills: number;
  first_blood: boolean;
  stuns: number;
  madstones?: number;
  camps_stacked?: number;
  runes?: number;
  runes_grabbed?: number;
  lotuses?: number;
  watchers?: number;
  smokes?: number;
  teamfight_pct?: number;
  tormentor_kills?: number;
  courier_kills?: number;
}

export const ROLE_CONFIGS: Record<string, { label: string; group: "core" | "mid" | "support"; order: number }> = {
  pos1: { label: "Керри (Позиция 1)", group: "core", order: 1 },
  pos2: { label: "Мидлейнер (Позиция 2)", group: "mid", order: 2 },
  pos3: { label: "Оффлейнер (Позиция 3)", group: "core", order: 3 },
  pos4: { label: "Частичная поддержка (Позиция 4)", group: "support", order: 4 },
  pos5: { label: "Полная поддержка (Позиция 5)", group: "support", order: 5 },
};

export const VALVE_FANTASY_EMBLEMS: Record<string, FantasyEmblem> = {
  creepScore: {
    id: "creepScore",
    label: "Крипы",
    color: "red",
    points: 3,
    unit: "за крипа",
    description: "3 очка за каждого добитого крипа",
    modifier: 100,
  },
  gpm: {
    id: "gpm",
    label: "З/М",
    color: "red",
    points: 2,
    unit: "за золото в минуту",
    description: "2 очка за каждую единицу GPM",
    modifier: 100,
  },
  deaths: {
    id: "deaths",
    label: "Смерти",
    color: "red",
    points: 195,
    unit: "1950 стартует, -195 за смерть",
    description: "1950 очков базово минус 195 за каждую смерть",
    modifier: 100,
  },
  towerKills: {
    id: "towerKills",
    label: "Башни",
    color: "red",
    points: 352,
    unit: "за башню",
    description: "352 очка за каждую разрушенную башню",
    modifier: 100,
  },
  kills: {
    id: "kills",
    label: "Убийства",
    color: "red",
    points: 107,
    unit: "за убийство",
    description: "107 очков за каждое совершенное убийство",
    modifier: 100,
  },
  madstones: {
    id: "madstones",
    label: "Подбор безумрудов",
    color: "red",
    points: 13,
    unit: "за безумруд",
    description: "13 очков за каждый подобранный безумруд",
    modifier: 100,
  },
  campsStacked: {
    id: "campsStacked",
    label: "Стак лагерей",
    color: "blue",
    points: 234,
    unit: "за стак",
    description: "234 очка за каждый стакнутый лагерь",
    modifier: 100,
  },
  runes: {
    id: "runes",
    label: "Руны",
    color: "blue",
    points: 141,
    unit: "за руну",
    description: "141 очко за каждую руну",
    modifier: 100,
  },
  lotuses: {
    id: "lotuses",
    label: "Сбор лотосов",
    color: "blue",
    points: 176,
    unit: "за лотос",
    description: "176 очков за каждый лотос",
    modifier: 100,
  },
  watchers: {
    id: "watchers",
    label: "Захват смотрителей",
    color: "blue",
    points: 147,
    unit: "за смотрителя",
    description: "147 очков за каждого смотрителя",
    modifier: 100,
  },
  obsPlaced: {
    id: "obsPlaced",
    label: "Установка вардов",
    color: "blue",
    points: 117,
    unit: "за Observer Ward",
    description: "117 очков за каждый Observer Ward",
    modifier: 100,
  },
  smokes: {
    id: "smokes",
    label: "Применения Smoke of Deceit",
    color: "blue",
    points: 293,
    unit: "за смок",
    description: "293 очка за применение Smoke of Deceit",
    modifier: 100,
  },
  teamfight: {
    id: "teamfight",
    label: "Командные сражения",
    color: "green",
    points: 2124,
    unit: "максимум за участие",
    description: "До 2124 очков за участие в командных драках",
    modifier: 100,
  },
  stuns: {
    id: "stuns",
    label: "Оглушения",
    color: "green",
    points: 10,
    unit: "за секунду",
    description: "10 очков за секунду оглушения и контроля",
    modifier: 100,
  },
  firstblood: {
    id: "firstblood",
    label: "Первая кровь",
    color: "green",
    points: 1934,
    unit: "за первую кровь",
    description: "1934 очка за участие в первой крови",
    modifier: 100,
  },
  tormentorKills: {
    id: "tormentorKills",
    label: "Убийства Терзателей",
    color: "green",
    points: 879,
    unit: "за Терзателя",
    description: "879 очков за убийство Терзателя",
    modifier: 100,
  },
  roshanKills: {
    id: "roshanKills",
    label: "Убийства Рошана",
    color: "green",
    points: 1172,
    unit: "за Рошана",
    description: "1172 очка за убийство Рошана",
    modifier: 100,
  },
  courierKills: {
    id: "courierKills",
    label: "Убийства курьеров",
    color: "green",
    points: 703,
    unit: "за курьера",
    description: "703 очка за убийство вражеского курьера",
    modifier: 100,
  },
};

export const DEFAULT_ROLE_EMBLEMS: Record<string, string[]> = {
  pos1: ["creepScore", "deaths", "towerKills"],
  pos2: ["kills", "runes", "teamfight"],
  pos3: ["stuns", "tormentorKills", "teamfight"],
  pos4: ["obsPlaced", "campsStacked", "smokes"],
  pos5: ["obsPlaced", "teamfight", "watchers"],
};

export function calculateEmblemPoints(emblemId: string, stats: Partial<PlayerStats>): number {
  const emblem = VALVE_FANTASY_EMBLEMS[emblemId];
  if (!emblem) return 0;

  let baseScore = 0;
  switch (emblemId) {
    case "creepScore":
      baseScore = (Number(stats.last_hits) || 0) * 3;
      break;
    case "gpm":
      baseScore = (Number(stats.gpm) || 0) * 2;
      break;
    case "deaths":
      baseScore = 1950 - (Number(stats.deaths) || 0) * 195;
      break;
    case "towerKills":
      baseScore = (Number(stats.tower_kills) || 0) * 352;
      break;
    case "kills":
      baseScore = (Number(stats.kills) || 0) * 107;
      break;
    case "madstones":
      baseScore = (Number(stats.madstones) || 0) * 13;
      break;
    case "campsStacked":
      baseScore = (Number(stats.camps_stacked) || 0) * 234;
      break;
    case "runes":
      baseScore = (Number(stats.runes ?? stats.runes_grabbed) || 0) * 141;
      break;
    case "lotuses":
      baseScore = (Number(stats.lotuses) || 0) * 176;
      break;
    case "watchers":
      baseScore = (Number(stats.watchers) || 0) * 147;
      break;
    case "obsPlaced":
      baseScore = (Number(stats.wards_placed) || 0) * 117;
      break;
    case "smokes":
      baseScore = (Number(stats.smokes) || 0) * 293;
      break;
    case "teamfight": {
      const tfPct = typeof stats.teamfight_pct === "number"
        ? Math.min(1, Math.max(0, stats.teamfight_pct))
        : ((Number(stats.assists) || 0) > 0
            ? Math.min(1, ((Number(stats.kills) || 0) + (Number(stats.assists) || 0)) / Math.max(1, ((Number(stats.kills) || 0) + (Number(stats.assists) || 0)) * 1.4))
            : 0.6);
      baseScore = Math.round(tfPct * 2124);
      break;
    }
    case "stuns":
      baseScore = Math.round((Number(stats.stuns) || 0) * 10);
      break;
    case "firstblood":
      baseScore = stats.first_blood ? 1934 : 0;
      break;
    case "tormentorKills":
      baseScore = (Number(stats.tormentor_kills) || 0) * 879;
      break;
    case "roshanKills":
      baseScore = (Number(stats.roshan_kills) || 0) * 1172;
      break;
    case "courierKills":
      baseScore = (Number(stats.courier_kills) || 0) * 703;
      break;
    default:
      baseScore = 0;
  }

  const modifier = (emblem.modifier || 100) / 100;
  return Math.round(baseScore * modifier * 100) / 100;
}

export function calculateGameFantasyPoints(
  stats: Partial<PlayerStats>,
  selectedEmblemIds: string[]
): number {
  if (!selectedEmblemIds || selectedEmblemIds.length === 0) return 0;
  const activeIds = selectedEmblemIds.slice(0, 3);
  let total = 0;
  for (const emblemId of activeIds) {
    total += calculateEmblemPoints(emblemId, stats);
  }
  return Math.round(total * 100) / 100;
}

export function calculateBestGameFantasyPoints(
  gamesStats: Partial<PlayerStats>[],
  selectedEmblemIds: string[]
): { bestScore: number; bestGameIndex: number; gameScores: number[] } {
  if (!gamesStats || gamesStats.length === 0 || !selectedEmblemIds || selectedEmblemIds.length === 0) {
    return { bestScore: 0, bestGameIndex: -1, gameScores: [] };
  }

  const gameScores = gamesStats.map((st) => calculateGameFantasyPoints(st, selectedEmblemIds));
  let bestScore = gameScores[0];
  let bestGameIndex = 0;

  for (let i = 1; i < gameScores.length; i++) {
    if (gameScores[i] > bestScore) {
      bestScore = gameScores[i];
      bestGameIndex = i;
    }
  }

  return {
    bestScore: Math.round(bestScore * 100) / 100,
    bestGameIndex,
    gameScores,
  };
}

export function calculateFantasyPoints(
  stats: Partial<PlayerStats>,
  emblemsOrTraits: any[] = [],
  _quality: CardQuality = "common",
  _titleName = "Стальной"
): number {
  if (Array.isArray(emblemsOrTraits) && emblemsOrTraits.length > 0 && typeof emblemsOrTraits[0] === "string") {
    return calculateGameFantasyPoints(stats, emblemsOrTraits as string[]);
  }

  if (Array.isArray(emblemsOrTraits) && emblemsOrTraits.length > 0 && typeof emblemsOrTraits[0] === "object" && emblemsOrTraits[0]?.id && VALVE_FANTASY_EMBLEMS[emblemsOrTraits[0].id]) {
    const ids = emblemsOrTraits.map((t) => t.id);
    return calculateGameFantasyPoints(stats, ids);
  }

  const defaultKeys = ["creepScore", "deaths", "towerKills"];
  return calculateGameFantasyPoints(stats, defaultKeys);
}

export function getRandomQuality(): CardQuality {
  return "common";
}

export function getRandomTitle(): string {
  return "Стальной";
}

export function rollRandomTraits(
  count = 3,
  _quality: CardQuality = "common",
  _existingTraits: RolledTrait[] = []
): RolledTrait[] {
  const result: RolledTrait[] = [];
  const defaultKeys = ["creepScore", "deaths", "towerKills"];
  for (let i = 0; i < count; i++) {
    const key = defaultKeys[i % defaultKeys.length];
    const def = VALVE_FANTASY_EMBLEMS[key];
    result.push({
      id: key,
      label: def ? def.label : key,
      bonus: 100,
      colorClass: def?.color === "red" ? "text-red-400" : def?.color === "blue" ? "text-sky-400" : "text-emerald-400",
      locked: false,
    });
  }
  return result;
}

export const FANTASY_TRAITS_POOL = Object.values(VALVE_FANTASY_EMBLEMS).map((emb) => ({
  id: emb.id,
  label: emb.label,
  category: emb.color === "red" ? "kills" : emb.color === "blue" ? "support" : "combat",
  colorClass: emb.color === "red" ? "text-red-400 bg-red-950/60 border-red-500/40" : emb.color === "blue" ? "text-sky-400 bg-sky-950/60 border-sky-500/40" : "text-emerald-400 bg-emerald-950/60 border-emerald-500/40",
  minBonus: 100,
  maxBonus: 100,
}));
