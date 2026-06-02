import type { CardStats } from './types';

// Stat scaling model
// The database only stores BASE stats. A card's effective stats grow with four
// independent tiers, each contributing a multiplier applied to the base:
//
//   final = round(base * rarityMult * levelMult * evoMult * ascensionMult)
//
// All defaults (Base rarity, level 1, evo 1, ascension 0) resolve to x1.0, so
// the calculated stats equal the base stats — matching what has always been
// shown. Tune the numbers below to match the game's real balance.

export interface RarityTier {
  key: string;
  label: string;
  mult: number;
}

export const RARITIES: RarityTier[] = [
  { key: 'base', label: 'Base', mult: 1.0 },
  { key: 'common', label: 'Common', mult: 1.1 },
  { key: 'uncommon', label: 'Uncommon', mult: 1.25 },
  { key: 'rare', label: 'Rare', mult: 1.5 },
  { key: 'super_rare', label: 'Super Rare', mult: 1.8 },
  { key: 'ultra_rare', label: 'Ultra Rare', mult: 2.2 },
];

export const LEVEL = { min: 1, max: 100, perLevel: 0.01 } as const;

// Evolution stages 1..3 (1 = base form). Index 0 -> evo 1.
export const EVO = { min: 1, max: 3, mults: [1.0, 1.3, 1.65] } as const;

// Ascension 0..5 (0 = not ascended). Index = ascension value.
export const ASCENSION = { min: 0, max: 5, mults: [1.0, 1.08, 1.16, 1.24, 1.32, 1.4] } as const;

export interface StatParams {
  rarity: string;
  level: number;
  evo: number;
  ascension: number;
}

export interface StatMultipliers {
  rarity: number;
  level: number;
  evo: number;
  ascension: number;
  total: number;
}

export interface CalculatedStats {
  params: StatParams;
  multipliers: StatMultipliers;
  stats: CardStats;
}

const RARITY_BY_KEY = new Map(RARITIES.map((r) => [r.key, r]));

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export const DEFAULT_PARAMS: StatParams = {
  rarity: 'base',
  level: LEVEL.min,
  evo: EVO.min,
  ascension: ASCENSION.min,
};

/** Coerce arbitrary (query) input into a valid, clamped set of stat params. */
export function normalizeParams(input: Partial<Record<keyof StatParams, unknown>>): StatParams {
  const rarityRaw = String(input.rarity ?? DEFAULT_PARAMS.rarity).toLowerCase();
  const rarity = RARITY_BY_KEY.has(rarityRaw) ? rarityRaw : DEFAULT_PARAMS.rarity;

  const level = Number.isFinite(Number(input.level))
    ? clamp(Math.trunc(Number(input.level)), LEVEL.min, LEVEL.max)
    : DEFAULT_PARAMS.level;

  const evo = Number.isFinite(Number(input.evo))
    ? clamp(Math.trunc(Number(input.evo)), EVO.min, EVO.max)
    : DEFAULT_PARAMS.evo;

  const ascension = Number.isFinite(Number(input.ascension))
    ? clamp(Math.trunc(Number(input.ascension)), ASCENSION.min, ASCENSION.max)
    : DEFAULT_PARAMS.ascension;

  return { rarity, level, evo, ascension };
}

export function multipliersFor(params: StatParams): StatMultipliers {
  const rarity = RARITY_BY_KEY.get(params.rarity)?.mult ?? 1;
  const level = 1 + (params.level - 1) * LEVEL.perLevel;
  const evo = EVO.mults[params.evo - 1] ?? 1;
  const ascension = ASCENSION.mults[params.ascension] ?? 1;
  const total = rarity * level * evo * ascension;
  return { rarity, level, evo, ascension, total };
}

/** Calculate effective stats for a base stat block at the given tiers. */
export function calcStats(
  base: CardStats,
  rawParams: Partial<Record<keyof StatParams, unknown>>
): CalculatedStats {
  const params = normalizeParams(rawParams);
  const multipliers = multipliersFor(params);
  const stats: CardStats = {
    hp: Math.round(base.hp * multipliers.total),
    atk: Math.round(base.atk * multipliers.total),
    def: Math.round(base.def * multipliers.total),
    spd: Math.round(base.spd * multipliers.total),
  };
  return { params, multipliers, stats };
}

/** Roll a random set of tiers (rarity / level / evo / ascension). */
export function rollRandomParams(): StatParams {
  const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)].key;
  const level = LEVEL.min + Math.floor(Math.random() * (LEVEL.max - LEVEL.min + 1));
  const evo = EVO.min + Math.floor(Math.random() * (EVO.max - EVO.min + 1));
  const ascension = ASCENSION.min + Math.floor(Math.random() * (ASCENSION.max - ASCENSION.min + 1));
  return { rarity, level, evo, ascension };
}

// Serializable config handed to the browser so the client calculator uses the
// exact same numbers as the server (single source of truth).
export const STAT_CONFIG = {
  rarities: RARITIES,
  level: LEVEL,
  evo: EVO,
  ascension: ASCENSION,
  defaults: DEFAULT_PARAMS,
} as const;
