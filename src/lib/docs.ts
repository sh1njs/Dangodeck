// Static metadata for the human-facing /docs page: the endpoint catalog and the
// sort options surfaced in the card browser. Kept here (rather than inline in the
// route) so the route file stays focused on request handling.

export interface DocsEndpointParam {
  name: string;
  type: string;
  desc: string;
}

export interface DocsEndpoint {
  id: string;
  method: string;
  path: string;
  title: string;
  desc: string;
  params: DocsEndpointParam[];
}

export const DOCS_ENDPOINTS: DocsEndpoint[] = [
  {
    id: 'ep-random',
    method: 'GET',
    path: '/api/cards/random',
    title: 'Random Card (rolled stats)',
    desc: 'Returns a random card with a randomly rolled rarity, level (1-100), evo (1-3) and ascension (0-5). The "stats" field holds the calculated stats; "baseStats", "params" and "multipliers" show the breakdown. Great for game bots.',
    params: [],
  },
  {
    id: 'ep-random-base',
    method: 'GET',
    path: '/api/cards/random/base',
    title: 'Random Card (base stats)',
    desc: 'Returns a single randomly selected card with its base stats only.',
    params: [],
  },
  {
    id: 'ep-stats',
    method: 'GET',
    path: '/api/cards/1/stats?rarity=ultra_rare&level=100&evo=3&ascension=5',
    title: 'Calculate Card Stats',
    desc: 'Deterministic stat calculation for a card at chosen tiers: final = round(base × rarity × level × evo × ascension).',
    params: [
      { name: 'id', type: 'number (path)', desc: 'Numeric ID of the card.' },
      {
        name: 'rarity',
        type: 'string',
        desc: 'base, common, uncommon, rare, super_rare, ultra_rare. Default base.',
      },
      { name: 'level', type: 'number (1-100)', desc: 'Card level. Default 1.' },
      { name: 'evo', type: 'number (1-3)', desc: 'Evolution stage. Default 1.' },
      { name: 'ascension', type: 'number (0-5)', desc: 'Ascension rank. Default 0.' },
    ],
  },
  {
    id: 'ep-id',
    method: 'GET',
    path: '/api/cards/1',
    title: 'Card by ID',
    desc: 'Returns the card matching the given numeric ID. Returns 404 if not found.',
    params: [{ name: 'id', type: 'number (path)', desc: 'Numeric ID of the card.' }],
  },
  {
    id: 'ep-search',
    method: 'GET',
    path: '/api/cards/search?q=rem',
    title: 'Search Cards',
    desc: 'Case-insensitive, partial, and typo-tolerant fuzzy search (Fuse.js + Levenshtein). e.g. rem, reem, rme all match "Rem".',
    params: [
      { name: 'q', type: 'string (required)', desc: 'Search query.' },
      { name: 'limit', type: 'number (1-50)', desc: 'Max results. Default 20.' },
    ],
  },
  {
    id: 'ep-list',
    method: 'GET',
    path: '/api/cards?page=1&limit=20',
    title: 'List Cards',
    desc: 'Returns a paginated, filterable, sortable list of cards.',
    params: [
      { name: 'page', type: 'number', desc: 'Page number. Default 1.' },
      { name: 'limit', type: 'number (1-100)', desc: 'Items per page. Default 20.' },
      {
        name: 'sort',
        type: 'string',
        desc: 'One of id, name, anime, element, hp, atk, def, spd. Prefix "-" for descending.',
      },
      { name: 'element', type: 'string', desc: 'Filter by element (Fire, Water, Dark...).' },
      { name: 'anime', type: 'string', desc: 'Filter by anime title (contains).' },
      { name: 'name', type: 'string', desc: 'Filter by card name (contains).' },
    ],
  },
];

export interface SortOption {
  value: string;
  label: string;
}

export const SORTS: SortOption[] = [
  { value: 'id', label: 'ID (asc)' },
  { value: '-id', label: 'ID (desc)' },
  { value: 'name', label: 'Name A-Z' },
  { value: '-name', label: 'Name Z-A' },
  { value: '-atk', label: 'ATK (high)' },
  { value: '-hp', label: 'HP (high)' },
  { value: '-spd', label: 'SPD (high)' },
];
