const { getCurrentDb } = require('./sessionContext');

function seedDemo() {
  const db = getCurrentDb();
  if (!db) throw new Error('[DEMO] seedDemo called outside session context');

  // admin/admin without must_change_password (smooth review UX)
  db.prepare('UPDATE users SET must_change_password = 0 WHERE username = ?').run('admin');

  const typeId = db.prepare('SELECT id FROM types WHERE type = ?').get('Raspberry Pi Pico W').id;

  const mcuStmt = db.prepare(`
    INSERT INTO mcus (name, type_id, ip_address, mac_address, location, description, api_key, role, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const sensorMcuId = mcuStmt.run(
    'Demo DHT11 Sensor', typeId, '192.168.1.50', 'AA:BB:CC:DD:EE:01',
    'Server room', 'Simulated temperature & humidity sensor', 'demo-sensor-key', 'sensor'
  ).lastInsertRowid;

  const deckMcuId = mcuStmt.run(
    'Demo Control Deck', typeId, '192.168.1.51', 'AA:BB:CC:DD:EE:02',
    'Office', 'Simulated OLED panel with rotary encoder', 'demo-deck-key', 'deck'
  ).lastInsertRowid;

  // Physical sensor + channels (DHT11: temperature + humidity)
  const physId = db.prepare('INSERT INTO physical_sensors (device_id, model) VALUES (?, ?)').run(sensorMcuId, 'DHT11').lastInsertRowid;
  const tempChId = db.prepare('INSERT INTO sensor_channels (physical_sensor_id, type, unit) VALUES (?, ?, ?)').run(physId, 'temperature', '°C').lastInsertRowid;
  const humChId = db.prepare('INSERT INTO sensor_channels (physical_sensor_id, type, unit) VALUES (?, ?, ?)').run(physId, 'humidity', '%').lastInsertRowid;

  // Threshold for temperature (alert > 27°C)
  db.prepare('INSERT INTO channel_thresholds (channel_id, max_value) VALUES (?, ?)').run(tempChId, 27);

  // Backfill 24h of fake readings (1 row per 10 min)
  const readingStmt = db.prepare(`
    INSERT INTO readings (channel_id, avg_value, min_value, max_value, timestamp)
    VALUES (?, ?, ?, ?, datetime('now', ?))
  `);
  let temp = 22, hum = 50;
  for (let i = 144; i >= 1; i--) {
    temp += (Math.random() - 0.5) * 0.4;
    temp = Math.max(20, Math.min(26, temp));
    hum += (Math.random() - 0.5) * 1.5;
    hum = Math.max(40, Math.min(60, hum));
    const offset = `-${i * 10} minutes`;
    readingStmt.run(tempChId, +temp.toFixed(2), +(temp - 0.2).toFixed(2), +(temp + 0.2).toFixed(2), offset);
    readingStmt.run(humChId, +hum.toFixed(2), +(hum - 0.5).toFixed(2), +(hum + 0.5).toFixed(2), offset);
  }

  // Demo server with whitelisted commands
  const serverId = db.prepare(`
    INSERT INTO servers (name, ip, api_key, type, is_online) VALUES (?, ?, ?, 'server', 1)
  `).run('Demo Linux Server', '192.168.1.100', 'demo-server-key').lastInsertRowid;

  const cmdStmt = db.prepare('INSERT INTO commands (server_id, name, type, command, is_favorite) VALUES (?, ?, ?, ?, ?)');
  cmdStmt.run(serverId, 'Restart network', 'shell', 'sudo systemctl restart networking', 1);
  cmdStmt.run(serverId, 'Disk usage', 'shell', 'df -h', 1);
  cmdStmt.run(serverId, 'Uptime', 'shell', 'uptime', 0);
  cmdStmt.run(serverId, 'Safe shutdown', 'shell', 'sudo shutdown -h +1', 0);

  // Deck assignment: deck shows the sensor
  db.prepare('INSERT INTO deck_assignments (deck_id, entity_type, entity_id) VALUES (?, ?, ?)')
    .run(deckMcuId, 'mcu', sensorMcuId);

  // Welcome event
  db.prepare(`INSERT INTO event_logs (mcu_id, type, message, message_key, message_params)
              VALUES (?, 'info', 'Demo session started', 'demoSessionStarted', '{}')`).run(sensorMcuId);

  // Stash demo IDs for ticker
  db.prepare(`INSERT INTO settings (setting_key, setting_value, description) VALUES ('demo_sensor_mcu_id', ?, 'Demo sensor MCU id')
              ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value`).run(String(sensorMcuId));
  db.prepare(`INSERT INTO settings (setting_key, setting_value, description) VALUES ('demo_temp_channel_id', ?, 'Demo temperature channel id')
              ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value`).run(String(tempChId));
  db.prepare(`INSERT INTO settings (setting_key, setting_value, description) VALUES ('demo_hum_channel_id', ?, 'Demo humidity channel id')
              ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value`).run(String(humChId));
}

module.exports = seedDemo;
