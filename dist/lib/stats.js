"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAT_CONFIG = exports.DEFAULT_PARAMS = exports.ASCENSION = exports.EVO = exports.LEVEL = exports.RARITIES = void 0;
exports.normalizeParams = normalizeParams;
exports.multipliersFor = multipliersFor;
exports.calcStats = calcStats;
exports.rollRandomParams = rollRandomParams;
exports.RARITIES = [
    { key: 'base', label: 'Base', mult: 1.0 },
    { key: 'common', label: 'Common', mult: 1.1 },
    { key: 'uncommon', label: 'Uncommon', mult: 1.25 },
    { key: 'rare', label: 'Rare', mult: 1.5 },
    { key: 'super_rare', label: 'Super Rare', mult: 1.8 },
    { key: 'ultra_rare', label: 'Ultra Rare', mult: 2.2 },
];
exports.LEVEL = { min: 1, max: 100, perLevel: 0.01 };
// Evolution stages 1..3 (1 = base form). Index 0 -> evo 1.
exports.EVO = { min: 1, max: 3, mults: [1.0, 1.3, 1.65] };
// Ascension 0..5 (0 = not ascended). Index = ascension value.
exports.ASCENSION = { min: 0, max: 5, mults: [1.0, 1.08, 1.16, 1.24, 1.32, 1.4] };
const RARITY_BY_KEY = new Map(exports.RARITIES.map((r) => [r.key, r]));
function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}
exports.DEFAULT_PARAMS = {
    rarity: 'base',
    level: exports.LEVEL.min,
    evo: exports.EVO.min,
    ascension: exports.ASCENSION.min,
};
/** Coerce arbitrary (query) input into a valid, clamped set of stat params. */
function normalizeParams(input) {
    const rarityRaw = String(input.rarity ?? exports.DEFAULT_PARAMS.rarity).toLowerCase();
    const rarity = RARITY_BY_KEY.has(rarityRaw) ? rarityRaw : exports.DEFAULT_PARAMS.rarity;
    const level = Number.isFinite(Number(input.level))
        ? clamp(Math.trunc(Number(input.level)), exports.LEVEL.min, exports.LEVEL.max)
        : exports.DEFAULT_PARAMS.level;
    const evo = Number.isFinite(Number(input.evo))
        ? clamp(Math.trunc(Number(input.evo)), exports.EVO.min, exports.EVO.max)
        : exports.DEFAULT_PARAMS.evo;
    const ascension = Number.isFinite(Number(input.ascension))
        ? clamp(Math.trunc(Number(input.ascension)), exports.ASCENSION.min, exports.ASCENSION.max)
        : exports.DEFAULT_PARAMS.ascension;
    return { rarity, level, evo, ascension };
}
function multipliersFor(params) {
    const rarity = RARITY_BY_KEY.get(params.rarity)?.mult ?? 1;
    const level = 1 + (params.level - 1) * exports.LEVEL.perLevel;
    const evo = exports.EVO.mults[params.evo - 1] ?? 1;
    const ascension = exports.ASCENSION.mults[params.ascension] ?? 1;
    const total = rarity * level * evo * ascension;
    return { rarity, level, evo, ascension, total };
}
/** Calculate effective stats for a base stat block at the given tiers. */
function calcStats(base, rawParams) {
    const params = normalizeParams(rawParams);
    const multipliers = multipliersFor(params);
    const stats = {
        hp: Math.round(base.hp * multipliers.total),
        atk: Math.round(base.atk * multipliers.total),
        def: Math.round(base.def * multipliers.total),
        spd: Math.round(base.spd * multipliers.total),
    };
    return { params, multipliers, stats };
}
/** Roll a random set of tiers (rarity / level / evo / ascension). */
function rollRandomParams() {
    const rarity = exports.RARITIES[Math.floor(Math.random() * exports.RARITIES.length)].key;
    const level = exports.LEVEL.min + Math.floor(Math.random() * (exports.LEVEL.max - exports.LEVEL.min + 1));
    const evo = exports.EVO.min + Math.floor(Math.random() * (exports.EVO.max - exports.EVO.min + 1));
    const ascension = exports.ASCENSION.min + Math.floor(Math.random() * (exports.ASCENSION.max - exports.ASCENSION.min + 1));
    return { rarity, level, evo, ascension };
}
// Serializable config handed to the browser so the client calculator uses the
// exact same numbers as the server (single source of truth).
exports.STAT_CONFIG = {
    rarities: exports.RARITIES,
    level: exports.LEVEL,
    evo: exports.EVO,
    ascension: exports.ASCENSION,
    defaults: exports.DEFAULT_PARAMS,
};
//# sourceMappingURL=stats.js.map