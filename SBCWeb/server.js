const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 3000;

const db = require('./src/config/database');
const initDB = require('./src/config/initDatabase');
const seedDB = require('./src/config/seedDatabase');

// --- Importy služeb a handlerů ---
const MCUService = require('./src/services/mcuService');
const MeasurementService = require('./src/services/MeasurementService');
const MqttHandler = require('./src/sockets/mqttHandler');
const WebSocketHandler = require('./src/sockets/webSocketHandler');
const ServerChecker = require('./src/services/ServerChecker');
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

initDB();
seedDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'iot-sk1-white-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 } // 8 hodin
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

server.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});