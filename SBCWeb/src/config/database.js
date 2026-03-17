const Database = require('better-sqlite3');
const path = require('path');
const config = require('./config');

const db = new Database(path.join(__dirname, '../..', config.database_path));

module.exports = db;