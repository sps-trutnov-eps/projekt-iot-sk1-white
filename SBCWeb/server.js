require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const Backend = require('i18next-fs-backend');
const app = express();
const config = require('./src/config/config');
const { server_port, server_host, session_secret } = config;

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

const db = require('./src/config/database');
const initDB = require('./src/config/initDatabase');
const seedDB = require('./src/config/seedDatabase');

// --- Importy služeb a handlerů ---
const MCUService = require('./src/services/mcuService');
const MeasurementService = require('./src/services/MeasurementService');
const MqttHandler = require('./src/sockets/mqttHandler');
const WebSocketHandler = require('./src/sockets/webSocketHandler');
const ServerChecker = require('./src/services/ServerChecker');

// --- HTTPS (self-signed cert pro Web Serial API na LAN, mimo demo) ---
const CERT_DIR = path.join(__dirname, 'data');
const CERT_PATH = path.join(CERT_DIR, 'cert.pem');
const KEY_PATH = path.join(CERT_DIR, 'key.pem');
const HTTPS_PORT = parseInt(server_port) + 443; // default: 3443

function ensureSslCert() {
    if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) return true;
    try {
        if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
        execSync(
            `openssl req -x509 -newkey rsa:2048 -keyout "${KEY_PATH}" -out "${CERT_PATH}" -days 365 -nodes -subj "/CN=iot-server"`,
            { stdio: 'pipe' }
        );
        console.log('[SSL] Self-signed certifikát vygenerován.');
        return true;
    } catch (e) {
        console.warn('[SSL] Nelze vygenerovat certifikát (openssl není dostupný?):', e.message);
        return false;
    }
}

// --- i18n ---
i18next
  .use(Backend)
  .use(i18nextMiddleware.LanguageDetector)
  .init({
    backend: { loadPath: path.join(__dirname, './src/locales/{{lng}}/{{ns}}.json') },
    detection: { order: ['cookie', 'querystring', 'header'], caches: ['cookie'], cookieName: 'i18next' },
    fallbackLng: 'en',
    preload: ['en', 'cs'],
    ns: ['translation'],
    defaultNS: 'translation'
  });

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// V non-demo módu seedujeme sdílenou DB. V demo módu seedu provádí
// per-session middleware při prvním requestu nové session.
if (!DEMO_MODE) {
    initDB();
    seedDB();
}

app.use(i18nextMiddleware.handle(i18next));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: session_secret,
  resave: false,
  saveUninitialized: DEMO_MODE, // v demo potřebujeme session.id i pro nepřihlášené (seed/ticker/socket)
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hodin
  proxy: true
});
app.use(sessionMiddleware);

// V DEMO_MODE: per-session in-memory SQLite + sensor ticker (musí běžet PŘED route handlery)
if (DEMO_MODE) {
    const demoSession = require('./src/middleware/demoSession');
    app.use(demoSession);
}

app.use(express.static(path.join(__dirname, './src/public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './src/views'));

// --- Middleware pro předání přihlášeného uživatele a t() do všech views ---
app.use((req, res, next) => {
  res.locals.currentUser = req.session.username || null;
  res.locals.t = req.t;
  res.locals.lng = req.language;
  res.locals.demoMode = DEMO_MODE;
  next();
});

// --- Language switch ---
app.get('/lang/:lng', (req, res) => {
  const { lng } = req.params;
  if (['en', 'cs'].includes(lng)) {
    res.cookie('i18next', lng, { maxAge: 365 * 24 * 60 * 60 * 1000 });
  }
  const referer = req.get('Referer');
  if (referer && !referer.includes('/lang/')) {
    res.redirect(referer);
  } else {
    res.redirect('/dashboard');
  }
});

// V DEMO_MODE servíruje veřejnou landing page na "/" (před auth routami)
if (DEMO_MODE) {
  app.get('/', (req, res) => {
    res.render('demoLanding', {
      ytEmbed: process.env.YT_DEMO_URL || '',
      ghRepo: process.env.GITHUB_REPO_URL || 'https://github.com/sps-trutnov-eps/projekt-iot-server_deck',
    });
  });
}

const authRoutes = require('./src/routes/authRouter');
app.use('/', authRoutes);

const { requireAuth } = require('./src/middleware/authMiddleware');

const indexRoutes = require('./src/routes/indexRouter');
const MCURoutes = require('./src/routes/MCURouter');
const typeRoutes = require('./src/routes/typeRouter');
const sensorRoutes = require('./src/routes/sensorRouter');
const readingRoutes = require('./src/routes/readingRouter');
const eventRoutes = require('./src/routes/eventRouter');
const serverRoutes = require('./src/routes/serverRouter');
const commandRoutes = require('./src/routes/commandRouter');
const settingRoutes = require('./src/routes/settingsRouter');

app.use('/', requireAuth, indexRoutes);
app.use('/mcu', requireAuth, MCURoutes)
app.use('/type', requireAuth, typeRoutes);
app.use('/sensor', requireAuth, sensorRoutes);
app.use('/readings', requireAuth, readingRoutes);
app.use('/event', requireAuth, eventRoutes);
app.use('/server', requireAuth, serverRoutes);
app.use('/command', requireAuth, commandRoutes);
app.use('/settings', requireAuth, settingRoutes);

WebSocketHandler.init(io, sessionMiddleware);

if (DEMO_MODE) {
    // Per-session ticker generuje data, žádné globální backgroundery nepotřebujeme.
    // MQTT mock se nastaví uvnitř MqttHandler.init().
    MqttHandler.init();
    console.log('[DEMO] Globální agregace, MCU monitor a ServerChecker jsou vypnuté (per-session ticker zajišťuje data).');
} else {
    MeasurementService.startAggregationWorker();
    MqttHandler.init();
    MCUService.startStatusMonitor();
    ServerChecker.start(30000);
}

app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Stránka nenalezena' });
});

server.listen(server_port, server_host, () => {
    console.log(`[HTTP] Server běží na http://localhost:${server_port}${DEMO_MODE ? ' (DEMO_MODE)' : ''}`);
});

// --- HTTPS server (pro Web Serial API na LAN, vypnuté v demo) ---
if (!DEMO_MODE && ensureSslCert()) {
    try {
        const sslOptions = {
            key: fs.readFileSync(KEY_PATH),
            cert: fs.readFileSync(CERT_PATH)
        };
        const httpsServer = https.createServer(sslOptions, app);
        const ioHttps = socketIo(httpsServer, { cors: { origin: "*" } });
        WebSocketHandler.init(ioHttps, sessionMiddleware);

        httpsServer.listen(HTTPS_PORT, server_host, () => {
            console.log(`[HTTPS] Server běží na https://localhost:${HTTPS_PORT}`);
            console.log(`[HTTPS] Pro Web Serial API na LAN použijte https://<ip>:${HTTPS_PORT}`);
        });
    } catch (e) {
        console.warn('[HTTPS] Nelze spustit HTTPS server:', e.message);
    }
}
