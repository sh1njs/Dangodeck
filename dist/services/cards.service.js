"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardsService = void 0;
const fuse_js_1 = __importDefault(require("fuse.js"));
const REMOTE_URL = 'https://raw.githubusercontent.com/MochiiLabs/Dangodeck-Database/refs/heads/main/cards.json';
const DB_REFRESH_TTL = 5 * 60 * 1000;
class CardsService {
    cards = [];
    byId = new Map();
    fuse;
    lastLoad = 0;
    async init() {
        await this.loadCards();
    }
    slugify(name, id) {
        const base = name
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
        return base ? `${base}-${id}` : `card-${id}`;
    }
    normalize(raw) {
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
    async loadCards() {
        // Cloud-only: card data is always fetched from the MochiiLabs raw GitHub
        // database. On failure we keep whatever is already in memory (if any).
        let raw;
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(REMOTE_URL, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            raw = (await res.json());
            console.log(`[cards] Loaded ${raw.length} cards from remote source.`);
        }
        catch (err) {
            console.warn(`[cards] Remote fetch failed (${err.message}).`);
            if (this.cards.length > 0)
                return; // keep last-good data
            raw = [];
        }
        if (raw.length === 0 && this.cards.length > 0)
            return;
        this.cards = this.normalize(raw);
        this.byId = new Map(this.cards.map((c) => [c.id, c]));
        this.fuse = new fuse_js_1.default(this.cards, {
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
    async ensureFresh() {
        if (this.cards.length === 0 || Date.now() - this.lastLoad > DB_REFRESH_TTL) {
            await this.loadCards();
        }
    }
    async getAllRaw() {
        await this.ensureFresh();
        return this.cards;
    }
    async getRandom() {
        await this.ensureFresh();
        const idx = Math.floor(Math.random() * this.cards.length);
        return this.cards[idx];
    }
    async getById(id) {
        await this.ensureFresh();
        return this.byId.get(id) ?? null;
    }
    async getBySlug(slug) {
        await this.ensureFresh();
        return this.cards.find((c) => c.slug === slug) ?? null;
    }
    async search(query) {
        await this.ensureFresh();
        const q = query.q.trim();
        if (!q)
            return [];
        const lower = q.toLowerCase();
        const exact = this.cards.filter((c) => c.name.toLowerCase() === lower);
        const partial = this.cards.filter((c) => c.name.toLowerCase().includes(lower) && c.name.toLowerCase() !== lower);
        const fuzzy = this.fuse.search(q).map((r) => r.item);
        const seen = new Set();
        const ordered = [];
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
    async list(query) {
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
            const field = (desc ? query.sort.slice(1) : query.sort);
            result.sort((a, b) => this.compare(a, b, field) * (desc ? -1 : 1));
        }
        const total = result.length;
        const totalPages = Math.max(1, Math.ceil(total / query.limit));
        const start = (query.page - 1) * query.limit;
        const items = result.slice(start, start + query.limit);
        return { items, page: query.page, limit: query.limit, total, totalPages };
    }
    compare(a, b, field) {
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
    async facets() {
        await this.ensureFresh();
        const elements = [...new Set(this.cards.map((c) => c.element))].sort();
        const animes = [...new Set(this.cards.map((c) => c.anime))].sort();
        return { elements, animes, total: this.cards.length };
    }
    async related(id, limit = 6) {
        const card = await this.getById(id);
        if (!card)
            return [];
        const sameAnime = this.cards.filter((c) => c.anime === card.anime && c.id !== card.id);
        if (sameAnime.length >= limit)
            return sameAnime.slice(0, limit);
        const sameElement = this.cards.filter((c) => c.element === card.element && c.id !== card.id && c.anime !== card.anime);
        return [...sameAnime, ...sameElement].slice(0, limit);
    }
}
exports.CardsService = CardsService;
//# sourceMappingURL=cards.service.js.map