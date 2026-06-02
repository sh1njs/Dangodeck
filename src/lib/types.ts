export interface CardStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export interface CardTalent {
  name: string;
  description: string;
}

export interface Card {
  id: number;
  name: string;
  slug: string;
  anime: string;
  element: string;
  stats: CardStats;
  talent: CardTalent;
  image: string;
  lastPatch: boolean;
}

export type RawCard = Omit<Card, 'slug'> & { slug?: string };

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Facets {
  elements: string[];
  animes: string[];
  total: number;
}

export const SORT_FIELDS = ['id', 'name', 'anime', 'element', 'hp', 'atk', 'def', 'spd'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export const ELEMENTS = [
  'Neutral',
  'Light',
  'Ground',
  'Dark',
  'Electric',
  'Grass',
  'Fire',
  'Water',
  'Null',
] as const;

export interface ListCardsQuery {
  page: number;
  limit: number;
  sort?: string;
  element?: string;
  anime?: string;
  name?: string;
}

export interface SearchCardsQuery {
  q: string;
  limit: number;
}
