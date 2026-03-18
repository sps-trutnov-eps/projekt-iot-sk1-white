require('dotenv').config();
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const app = express();
const config = require('./src/config/config');
const { server_port, server_host, session_secret } = config;

const db = require('./src/config/database');
const initDB = require('./src/config/initDatabase');
const seedDB = require('./src/config/seedDatabase');

// --- Importy služeb a handlerů ---
const MCUService = require('./src/services/mcuService');
const MeasurementService = require('./src/services/MeasurementService');
const MqttHandler = require('./src/sockets/mqttHandler');
const WebSocketHandler = require('./src/sockets/webSocketHandler');
const ServerChecker = require('./src/services/ServerChecker');

// --- HTTPS (self-signed cert pro Web Serial API na LAN) ---
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

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

initDB();
seedDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: session_secret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 }, // 8 hodin
  proxy: true
}));
app.use(express.static(path.join(__dirname, './src/public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './src/views'));

// --- Middleware pro předání přihlášeného uživatele do všech views ---
app.use((req, res, next) => {
  res.locals.currentUser = req.session.username || null;
  next();
});

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

WebSocketHandler.init(io); 


MeasurementService.startAggregationWorker();

MqttHandler.init();

MCUService.startStatusMonitor();

ServerChecker.start(30000);

app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Stránka nenalezena' });
});

server.listen(server_port, server_host, () => {
    console.log(`[HTTP] Server běží na http://localhost:${server_port}`);
});

// --- HTTPS server (pro Web Serial API na LAN) ---
if (ensureSslCert()) {
    try {
        const sslOptions = {
            key: fs.readFileSync(KEY_PATH),
            cert: fs.readFileSync(CERT_PATH)
        };
        const httpsServer = https.createServer(sslOptions, app);
        const ioHttps = socketIo(httpsServer, { cors: { origin: "*" } });
        WebSocketHandler.init(ioHttps);

        httpsServer.listen(HTTPS_PORT, server_host, () => {
            console.log(`[HTTPS] Server běží na https://localhost:${HTTPS_PORT}`);
            console.log(`[HTTPS] Pro Web Serial API na LAN použijte https://<ip>:${HTTPS_PORT}`);
        });
    } catch (e) {
        console.warn('[HTTPS] Nelze spustit HTTPS server:', e.message);
    }
}