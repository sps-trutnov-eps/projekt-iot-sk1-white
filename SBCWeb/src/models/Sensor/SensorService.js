const SensorRepository = require('./SensorRepository');
// Volitelně můžeš natáhnout i MCURepository, abys ověřil, zda zařízení existuje
// const MCURepository = require('./MCURepository'); 

class SensorService {

    /**
     * Vytvoří nový fyzický senzor i s jeho kanály.
     * Očekává objekt data: { deviceId, model, channels: [{type, unit}, ...] }
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
            return this.getSensorById(newSensorId);
        } catch (error) {
            throw new Error(`Chyba při ukládání senzoru: ${error.message}`);
        }
    }

    /**
     * Najde senzor podle ID.
     */
    static getSensorById(id) {
        if (!id) {
            throw new Error('Chybí ID senzoru.');
        }

        const sensor = SensorRepository.findById(id);
        
        if (!sensor) {
            throw new Error(`Senzor s ID ${id} nebyl nalezen.`);
        }

        return sensor;
    }

    /**
     * Najde všechny senzory pro dané MCU (Device).
     */
    static getSensorsByDevice(deviceId) {
        if (!deviceId) {
            throw new Error('Chybí ID zařízení.');
        }
                
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

        return newChannelId;
    }

    /**
     * Smaže senzor.
     */
    static deleteSensor(id) {
        if (!id) throw new Error('Chybí ID senzoru.');   
        return SensorRepository.delete(id);
    }
}

module.exports = SensorService;