import { SORT_FIELDS, type ListCardsQuery, type SearchCardsQuery } from './types';

type Query = Record<string, unknown>;

function str(value: unknown): string | undefined {
  if (Array.isArray(value)) value = value[0];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function int(value: unknown, fallback: number, min: number, max: number): number {
  const raw = str(value);
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

const SORT_SET = new Set<string>(SORT_FIELDS);

function parseSort(value: unknown): string | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  const field = raw.startsWith('-') ? raw.slice(1) : raw;
  return SORT_SET.has(field) ? raw : undefined;
}

export function parseListQuery(query: Query): ListCardsQuery {
  return {
    page: int(query.page, 1, 1, Number.MAX_SAFE_INTEGER),
    limit: int(query.limit, 20, 1, 100),
    sort: parseSort(query.sort),
    element: str(query.element),
    anime: str(query.anime),
    name: str(query.name),
  };
}

export function parseSearchQuery(query: Query): SearchCardsQuery {
  return {
    q: str(query.q) ?? '',
    limit: int(query.limit, 20, 1, 50),
  };
}
