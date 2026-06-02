import Fuse from 'fuse.js';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import type {
  Card,
  Facets,
  ListCardsQuery,
  Paginated,
  RawCard,
  SearchCardsQuery,
  SortField,
} from '../lib/types';

const REMOTE_URL =
  'https://raw.githubusercontent.com/MochiiLabs/database/refs/heads/main/tgc%3A%20anime/cards.json';
const DB_REFRESH_TTL = 5 * 60 * 1000;

export class CardsService {
  private cards: Card[] = [];
  private byId = new Map<number, Card>();
  private fuse!: Fuse<Card>;
  private lastLoad = 0;

  async init(): Promise<void> {
    await this.loadCards();
  }

  private slugify(name: string, id: number): string {
    const base = name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return base ? `${base}-${id}` : `card-${id}`;
  }

  private normalize(raw: RawCard[]): Card[] {
    return raw.map((c) => ({
      id: c.id,
      name: c.name,
      slug: this.slugify(c.name ?? `card-${c.id}`, c.id),
      anime: c.anime,
      element: c.element,
      stats: c.stats,
      talent: c.talent,
      image: c.image,
      lastPatch: Boolean(c.lastPatch),
    }));
  }

  private async loadCards(): Promise<void> {
    let raw: RawCard[] | null = null;

    if (config.cardsSource === 'local') {
      // Local-only mode: read the bundled snapshot, never touch the network.
      raw = this.readLocal();
      if (raw && raw.length > 0) {
        console.log(`[cards] Loaded ${raw.length} cards from local snapshot (CARDS_SOURCE=local).`);
      }
    } else {
      // Cloud mode: prefer raw GitHub (MochiiLabs), fall back to local snapshot.
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(REMOTE_URL, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        raw = (await res.json()) as RawCard[];
        console.log(`[cards] Loaded ${raw.length} cards from remote source.`);
      } catch (err) {
        console.warn(
          `[cards] Remote fetch failed (${(err as Error).message}), using local snapshot.`
        );
        raw = this.readLocal();
      }
    }

    if (!raw || raw.length === 0) {
      if (this.cards.length > 0) return;
      raw = this.readLocal() ?? [];
    }

    this.cards = this.normalize(raw);
    this.byId = new Map(this.cards.map((c) => [c.id, c]));
    this.fuse = new Fuse(this.cards, {
      keys: [
        { name: 'name', weight: 0.7 },
        { name: 'anime', weight: 0.3 },
      ],
      includeScore: true,
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 1,
    });
    this.lastLoad = Date.now();
  }

  private readLocal(): RawCard[] | null {
    const candidates = [
      path.join(__dirname, '..', 'data', 'cards.json'),
      path.join(process.cwd(), 'src', 'data', 'cards.json'),
      path.join(process.cwd(), 'data', 'cards.json'),
      path.join(process.cwd(), 'dist', 'data', 'cards.json'),
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p)) {
          return JSON.parse(fs.readFileSync(p, 'utf-8')) as RawCard[];
        }
      } catch {
        // try next
      }
    }
    return null;
  }

  private async ensureFresh(): Promise<void> {
    if (this.cards.length === 0 || Date.now() - this.lastLoad > DB_REFRESH_TTL) {
      await this.loadCards();
    }
  }

  async getAllRaw(): Promise<Card[]> {
    await this.ensureFresh();
    return this.cards;
  }

  async getRandom(): Promise<Card> {
    await this.ensureFresh();
    const idx = Math.floor(Math.random() * this.cards.length);
    return this.cards[idx];
  }

  async getById(id: number): Promise<Card | null> {
    await this.ensureFresh();
    return this.byId.get(id) ?? null;
  }

  async getBySlug(slug: string): Promise<Card | null> {
    await this.ensureFresh();
    return this.cards.find((c) => c.slug === slug) ?? null;
  }

  async search(query: SearchCardsQuery): Promise<Card[]> {
    await this.ensureFresh();
    const q = query.q.trim();
    if (!q) return [];

    const lower = q.toLowerCase();
    const exact = this.cards.filter((c) => c.name.toLowerCase() === lower);
    const partial = this.cards.filter(
      (c) => c.name.toLowerCase().includes(lower) && c.name.toLowerCase() !== lower
    );
    const fuzzy = this.fuse.search(q).map((r) => r.item);

    const seen = new Set<number>();
    const ordered: Card[] = [];
    for (const group of [exact, partial, fuzzy]) {
      for (const c of group) {
        if (!seen.has(c.id)) {
          seen.add(c.id);
          ordered.push(c);
        }
      }
    }
    return ordered.slice(0, query.limit);
  }

  async list(query: ListCardsQuery): Promise<Paginated<Card>> {
    await this.ensureFresh();
    let result = [...this.cards];

    if (query.element) {
      const el = query.element.toLowerCase();
      result = result.filter((c) => c.element.toLowerCase() === el);
    }
    if (query.anime) {
      const a = query.anime.toLowerCase();
      result = result.filter((c) => c.anime.toLowerCase().includes(a));
    }
    if (query.name) {
      const n = query.name.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(n));
    }

    if (query.sort) {
      const desc = query.sort.startsWith('-');
      const field = (desc ? query.sort.slice(1) : query.sort) as SortField;
      result.sort((a, b) => this.compare(a, b, field) * (desc ? -1 : 1));
    }

    const total = result.length;
    const totalPages = Math.max(1, Math.ceil(total / query.limit));
    const start = (query.page - 1) * query.limit;
    const items = result.slice(start, start + query.limit);

    return { items, page: query.page, limit: query.limit, total, totalPages };
  }

  private compare(a: Card, b: Card, field: SortField): number {
    switch (field) {
      case 'id':
        return a.id - b.id;
      case 'hp':
      case 'atk':
      case 'def':
      case 'spd':
        return a.stats[field] - b.stats[field];
      case 'name':
      case 'anime':
      case 'element':
        return a[field].localeCompare(b[field]);
      default:
        return 0;
    }
  }

  async facets(): Promise<Facets> {
    await this.ensureFresh();
    const elements = [...new Set(this.cards.map((c) => c.element))].sort();
    const animes = [...new Set(this.cards.map((c) => c.anime))].sort();
    return { elements, animes, total: this.cards.length };
  }

  async related(id: number, limit = 6): Promise<Card[]> {
    const card = await this.getById(id);
    if (!card) return [];
    const sameAnime = this.cards.filter((c) => c.anime === card.anime && c.id !== card.id);
    if (sameAnime.length >= limit) return sameAnime.slice(0, limit);
    const sameElement = this.cards.filter(
      (c) => c.element === card.element && c.id !== card.id && c.anime !== card.anime
    );
    return [...sameAnime, ...sameElement].slice(0, limit);
  }
}
