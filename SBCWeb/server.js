
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;
const MqttHandler = require('./src/controllers/mqttHandler');

const db = require('./src/models/database');
const initDB = require('./src/models/initDatabase');
const seedDB = require('./src/models/seedDatabase');
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
const MCURoutes = require('./src/routes/MCURouter')
const typeRoutes = require('./src/routes/typeRouter')

app.use('/', indexRoutes);
app.use('/mcu', MCURoutes)
app.use('/type', typeRoutes);


initDB();

MqttHandler.init();

// Error handling
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Stránka nenalezena' });
});

app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});

