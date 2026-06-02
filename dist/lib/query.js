"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseListQuery = parseListQuery;
exports.parseSearchQuery = parseSearchQuery;
const types_1 = require("./types");
function str(value) {
    if (Array.isArray(value))
        value = value[0];
    if (typeof value !== 'string')
        return undefined;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
}
function int(value, fallback, min, max) {
    const raw = str(value);
    if (raw === undefined)
        return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n))
        return fallback;
    return Math.min(max, Math.max(min, Math.trunc(n)));
}
const SORT_SET = new Set(types_1.SORT_FIELDS);
function parseSort(value) {
    const raw = str(value);
    if (!raw)
        return undefined;
    const field = raw.startsWith('-') ? raw.slice(1) : raw;
    return SORT_SET.has(field) ? raw : undefined;
}
function parseListQuery(query) {
    return {
        page: int(query.page, 1, 1, Number.MAX_SAFE_INTEGER),
        limit: int(query.limit, 20, 1, 100),
        sort: parseSort(query.sort),
        element: str(query.element),
        anime: str(query.anime),
        name: str(query.name),
    };
}
function parseSearchQuery(query) {
    return {
        q: str(query.q) ?? '',
        limit: int(query.limit, 20, 1, 50),
    };
}
//# sourceMappingURL=query.js.map