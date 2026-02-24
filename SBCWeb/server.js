
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();
const PORT = 3000;
const MqttHandler = require('./src/sockets/mqttHandler');

const db = require('./src/config/database');
const initDB = require('./src/config/initDatabase');
const seedDB = require('./src/config/seedDatabase');

const server = http.createServer(app);

const io = socketIo(server, { cors: { origin: "*" } });

const SocketService = require('./src/sockets/socketService');
const McuService = require('./src/services/mcuService')
const DashboardService = require('./src/services/dashboardService');
const MeasurementService = require('./src/services/MeasurementService');

initDB();
seedDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, './src/public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, './src/views'));

// Routes
const indexRoutes = require('./src/routes/indexRouter');
const MCURoutes = require('./src/routes/MCURouter');
const typeRoutes = require('./src/routes/typeRouter');
const sensorRoutes = require('./src/routes/sensorRouter');
const readingRoutes = require('./src/routes/readingRouter');
const eventRoutes = require('./src/routes/eventRouter');

app.use('/', indexRoutes);
app.use('/mcu', MCURoutes)
app.use('/type', typeRoutes);
app.use('/sensor', sensorRoutes);
app.use('/readings', readingRoutes);
app.use('/event', eventRoutes);


SocketService.init(io); 
McuService.startStatusMonitor();
DashboardService.initSockets(SocketService);

MeasurementService.startAggregationWorker();

MqttHandler.init();

// Error handling
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Stránka nenalezena' });
});




// Musíte spustit ten HTTP server, který jste vytvořili ručně a do kterého jste vložili 'io'
server.listen(PORT, () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
