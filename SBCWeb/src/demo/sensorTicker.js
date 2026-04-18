const { run } = require('./sessionContext');
const sessionStore = require('./sessionStore');

const TICK_MS = 10 * 1000;

function ensureTicker(sessionId) {
  const entry = sessionStore.get(sessionId);
  if (!entry || entry.ticker) return;

  const state = { temp: 22 + Math.random() * 2, hum: 45 + Math.random() * 10 };

  entry.ticker = setInterval(() => {
    const cur = sessionStore.get(sessionId);
    if (!cur) return;
    run({ db: cur.db, sessionId }, () => {
      try {
        tick(state);
      } catch (e) {
        console.error('[DEMO] Ticker error:', e.message);
      }
    });
  }, TICK_MS);
}

function tick(state) {
  const { getCurrentDb } = require('./sessionContext');
  const ReadingRepository = require('../repositories/ReadingRepository');
  const SocketService = require('../sockets/socketService');
  const EventService = require('../services/EventService');

  const db = getCurrentDb();

  state.temp += (Math.random() - 0.5) * 0.3;
  state.temp = Math.max(20, Math.min(29, state.temp));
  state.hum += (Math.random() - 0.5) * 1.0;
  state.hum = Math.max(35, Math.min(65, state.hum));

  const sensorMcuId = parseInt(db.prepare("SELECT setting_value FROM settings WHERE setting_key = 'demo_sensor_mcu_id'").get().setting_value);
  const tempChId = parseInt(db.prepare("SELECT setting_value FROM settings WHERE setting_key = 'demo_temp_channel_id'").get().setting_value);
  const humChId = parseInt(db.prepare("SELECT setting_value FROM settings WHERE setting_key = 'demo_hum_channel_id'").get().setting_value);

  db.prepare("UPDATE mcus SET last_seen = datetime('now'), is_online = 1 WHERE device_id = ?").run(sensorMcuId);

  ReadingRepository.save({
    channelId: tempChId,
    avg: state.temp.toFixed(2),
    min: state.temp.toFixed(2),
    max: state.temp.toFixed(2),
  });
  ReadingRepository.save({
    channelId: humChId,
    avg: state.hum.toFixed(2),
    min: state.hum.toFixed(2),
    max: state.hum.toFixed(2),
  });

  SocketService.broadcastReading(sensorMcuId, tempChId, +state.temp.toFixed(2));
  SocketService.broadcastReading(sensorMcuId, humChId, +state.hum.toFixed(2));

  // Threshold alert at >27°C (one-shot per crossing)
  if (!state.alerted && state.temp > 27) {
    state.alerted = true;
    EventService.logEvent(sensorMcuId, 'alert', 'criticalValueMax', {
      sensorType: 'temperature', value: +state.temp.toFixed(2), unit: '°C', limit: 27,
    });
  } else if (state.alerted && state.temp < 26.5) {
    state.alerted = false;
    EventService.logEvent(sensorMcuId, 'info', 'valueNormal', {
      sensorType: 'temperature', value: +state.temp.toFixed(2), unit: '°C',
    });
  }
}

module.exports = { ensureTicker };
