"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const compression_1 = __importDefault(require("compression"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = require("./config");
const elements_1 = require("./lib/elements");
const icons_1 = require("./lib/icons");
const api_routes_1 = require("./routes/api.routes");
const web_routes_1 = require("./routes/web.routes");
const cache_service_1 = require("./services/cache.service");
const cards_service_1 = require("./services/cards.service");
const swagger_1 = require("./swagger");
const ROOT = path_1.default.resolve(__dirname, '..');
async function bootstrap() {
    const cards = new cards_service_1.CardsService();
    const cache = new cache_service_1.CacheService(config_1.config.redisUrl);
    await cards.init();
    const app = (0, express_1.default)();
    app.set('trust proxy', true);
    app.disable('x-powered-by');
    app.set('view engine', 'ejs');
    app.set('views', path_1.default.join(ROOT, 'views'));
    app.locals.icon = icons_1.icon;
    app.locals.elementColor = elements_1.elementColor;
    app.locals.elementColors = elements_1.ELEMENT_COLORS;
    app.locals.siteUrl = config_1.config.siteUrl;
    app.use((0, compression_1.default)());
    app.use(express_1.default.static(path_1.default.join(ROOT, 'public')));
    // Public JSON API: permissive CORS + rate limiting.
    app.use('/api', (req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
        if (req.method === 'OPTIONS')
            return res.sendStatus(204);
        next();
    });
    app.use('/api', (0, express_rate_limit_1.default)({
        windowMs: config_1.config.rateLimit.windowMs,
        max: config_1.config.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: 'Too Many Requests' },
    }));
    (0, swagger_1.mountSwagger)(app, config_1.config.siteUrl);
    app.use('/api', (0, api_routes_1.createApiRouter)(cards, cache));
    app.use('/', (0, web_routes_1.createWebRouter)(cards));
    // Not found
    app.use((req, res) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ success: false, error: 'Not found' });
        }
        res.status(404).render('404', {
            page: '',
            title: 'Not found - Dangodeck',
            description: 'The requested page could not be found.',
        });
    });
    // Error handler
    app.use((err, req, res, _next) => {
        console.error('[error]', err);
        if (req.path.startsWith('/api')) {
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
        res.status(500).render('404', {
            page: '',
            title: 'Error - Dangodeck',
            description: 'Something went wrong.',
        });
    });
    app.listen(config_1.config.port, '0.0.0.0', () => {
        console.log(`Dangodeck running on ${config_1.config.siteUrl} (API docs: /docs/api)`);
    });
    const shutdown = () => {
        cache.disconnect();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
void bootstrap();
//# sourceMappingURL=server.js.map