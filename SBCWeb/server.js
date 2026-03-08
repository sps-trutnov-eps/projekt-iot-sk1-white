const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
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
app.use(express.static(path.join(__dirname, './src/public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './src/views'));

const indexRoutes = require('./src/routes/indexRouter');
const MCURoutes = require('./src/routes/MCURouter');
const typeRoutes = require('./src/routes/typeRouter');
const sensorRoutes = require('./src/routes/sensorRouter');
const readingRoutes = require('./src/routes/readingRouter');
const eventRoutes = require('./src/routes/eventRouter');
const serverRoutes = require('./src/routes/serverRouter');
const commandRoutes = require('./src/routes/commandRouter');
const settingRoutes = require('./src/routes/settingsRouter');
const wolRouter = require('./src/routes/wolRouter');

app.use('/', indexRoutes);
app.use('/mcu', MCURoutes)
app.use('/type', typeRoutes);
app.use('/sensor', sensorRoutes);
app.use('/readings', readingRoutes);
app.use('/event', eventRoutes);
app.use('/server', serverRoutes);
app.use('/command', commandRoutes);
app.use('/settings', settingRoutes);
app.use('/wol', wolRouter);

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