const db = require('../config/database.js'); // Přidáno pro rychlé dohledání vazeb
const SensorRepository = require('../repositories/SensorRepository');
const EventService = require('../services/EventService');

class SensorService {

    /**
     * Vytvoří nový fyzický senzor i s jeho kanály.
     */
    static createSensor(data) {
        if (!data.deviceId) {
            throw new Error('Nelze vytvořit senzor: Chybí ID zařízení (deviceId).');
        }
        if (!data.model || typeof data.model !== 'string' || data.model.trim() === '') {
            throw new Error('Nelze vytvořit senzor: Chybí název modelu (např. DHT11).');
        }

        let cleanChannels = [];
        if (data.channels) {
            if (!Array.isArray(data.channels)) {
                throw new Error('Data error: Channels musí být pole (array).');
            }

            cleanChannels = data.channels.map((channel, index) => {
                if (!channel.type || !channel.unit) {
                    throw new Error(`Data error: Kanál na pozici ${index} nemá vyplněný 'type' nebo 'unit'.`);
                }
                return {
                    type: channel.type.trim(),
                    unit: channel.unit.trim()
                };
            });
        }

        try {
            const newSensorId = SensorRepository.create(data.deviceId, data.model, cleanChannels);
            
            // LOGOVÁNÍ: Vytvoření senzoru
            EventService.logEvent(
                data.deviceId, 
                'info', 
                `K zařízení byl přidán nový senzor: ${data.model}`
            );

            return this.getSensorById(newSensorId);
        } catch (error) {
            throw new Error(`Chyba při ukládání senzoru: ${error.message}`);
        }
    }

    static getSensorById(id) {
        if (!id) throw new Error('Chybí ID senzoru.');
        const sensor = SensorRepository.findById(id);
        if (!sensor) throw new Error(`Senzor s ID ${id} nebyl nalezen.`);
        return sensor;
    }

    static getSensorsByDevice(deviceId) {
        if (!deviceId) throw new Error('Chybí ID zařízení.');
        return SensorRepository.findAllByDeviceId(deviceId);
    }

    /**
     * Přidá další měřenou veličinu (kanál) k existujícímu senzoru.
     */
    static addChannel(sensorId, channelData) {
        if (!sensorId) throw new Error('Chybí ID senzoru.');
        if (!channelData.type || !channelData.unit) {
            throw new Error('Kanál musí mít typ (např. Tlak) a jednotku (např. hPa).');
        }

        const sensor = SensorRepository.findById(sensorId);
        if (!sensor) {
            throw new Error(`Senzor s ID ${sensorId} neexistuje, nelze přidat kanál.`);
        }

        const newChannelId = SensorRepository.addChannel(
            sensorId, 
            channelData.type.trim(), 
            channelData.unit.trim()
        );

        // LOGOVÁNÍ: Přidání kanálu (z repository víme device_id ze sensoru)
        EventService.logEvent(
            sensor.device_id, 
            'info', 
            `K senzoru ${sensor.model} bylo přidáno měření: ${channelData.type.trim()}`
        );

        return newChannelId;
    }

    /**
     * Smaže senzor.
     */
    static deleteSensor(id) {
        if (!id) throw new Error('Chybí ID senzoru.');   
        
        // Získáme si info o senzoru PŘED smazáním
        const sensor = SensorRepository.findById(id);
        
        const success = SensorRepository.delete(id);

        // LOGOVÁNÍ: Smazání senzoru
        if (success && sensor) {
            EventService.logEvent(
                sensor.device_id, 
                'warning', 
                `Senzor typu ${sensor.model} byl kompletně odebrán.`
            );
        }

        return success;
    }

    /**
     * Smaže kanál.
     */    
    static deleteChannel(id) {
        if (!id) throw new Error('Chybí ID kanálu.');
        
        // Musíme najít, komu kanál patřil, abychom to mohli zalogovat ke správnému MCU
        const channelInfo = db.prepare(`
            SELECT sc.type, ps.device_id, ps.model 
            FROM sensor_channels sc 
            JOIN physical_sensors ps ON sc.physical_sensor_id = ps.id 
            WHERE sc.id = ?
        `).get(id);

        const success = SensorRepository.deleteChannel(id);

        // LOGOVÁNÍ: Smazání kanálu
        if (success && channelInfo) {
            EventService.logEvent(
                channelInfo.device_id, 
                'warning', 
                `Měření "${channelInfo.type}" bylo odebráno ze senzoru ${channelInfo.model}.`
            );
        }

        return success;
    }

    /**
     * Nastaví limity (thresholdy) pro konkrétní kanál.
     */
    static setThreshold(data) {
        const { channelId, min_value, max_value } = data;
        
        if (!channelId) {
            throw new Error('Chybí ID kanálu pro uložení limitů.');
        }

        // Zjistíme vazbu na MCU pro zápis do logu
        const channelInfo = db.prepare(`
            SELECT sc.type, sc.unit, ps.device_id 
            FROM sensor_channels sc 
            JOIN physical_sensors ps ON sc.physical_sensor_id = ps.id 
            WHERE sc.id = ?
        `).get(channelId);

        const result = SensorRepository.setThreshold(channelId, min_value, max_value);

        // LOGOVÁNÍ: Úprava limitů
        if (channelInfo) {
            const minStr = min_value !== null ? min_value : 'vypnuto';
            const maxStr = max_value !== null ? max_value : 'vypnuto';
            
            EventService.logEvent(
                channelInfo.device_id, 
                'info', 
                `Byly upraveny varovné limity pro ${channelInfo.type} (Min: ${minStr}, Max: ${maxStr}).`
            );
        }

        return result;
    }

    static getTotalCount() {
        return SensorRepository.countAll();
    }
}

module.exports = SensorService;