/**
 * Centralizovaná konfigurace aplikace
 * Přiority: Environment variables → Hardcoded defaults
 */

const config = {


    // Server
    server_port: process.env.PORT || process.env.SERVER_PORT || 3000,
    server_host: process.env.SERVER_HOST || '0.0.0.0',
    session_secret: process.env.SESSION_SECRET || 'iot-sk1-white-secret-key-change-in-production',


    // Database
    database_path: process.env.DATABASE_PATH || './data/telemetry.db',

    // MQTT Broker
    mqtt_broker_port: process.env.MQTT_BROKER_PORT || 1883,
    mqtt_push_delay: process.env.MQTT_PUSH_DELAY || 500,

    // Wake-on-LAN
    wol_udp_port: process.env.WOL_UDP_PORT || 9,

    // Intervals
    measurement_aggregation_interval: process.env.MEASUREMENT_AGGREGATION_INTERVAL || 60000,
};

// Log konfigurace při startu
console.log('[CONFIG] Načtena konfigurace:');
console.log(`  - Server: ${config.server_host}:${config.server_port}`);
console.log(`  - Database: ${config.database_path}`);
console.log(`  - MQTT Broker port: ${config.mqtt_broker_port}`);
console.log(`  - Timeouty a intervaly: načítáno z DB (SettingsService)`);

module.exports = config;
