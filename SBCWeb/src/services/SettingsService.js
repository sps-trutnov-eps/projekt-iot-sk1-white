const SettingRepository = require('../repositories/SettingsRepository');
const db = require('../config/database.js'); 

class SettingService {
    
    // Vrátí nastavení jako jednoduchý objekt: { "mqtt_broker_ip": "192...", "mcu_ping": "3000" }
    static getSettingsAsObject() {
        const settingsList = SettingRepository.getAll();
        const settingsObj = {};
        
        settingsList.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });
        
        return settingsObj;
    }

    // Provede hromadný update z objektu
    static updateMultipleSettings(settingsObj) {
        if (!settingsObj || typeof settingsObj !== 'object') {
            throw new Error('Neplatná data pro nastavení.');
        }

        // Použijeme DB transakci pro bezpečný zápis všech klíčů najednou
        const updateTransaction = db.transaction((settings) => {
            let updatedCount = 0;
            for (const [key, value] of Object.entries(settings)) {
                if (value !== undefined && value !== null) {
                    SettingRepository.update(key, value);
                    updatedCount++;
                }
            }
            return updatedCount;
        });

        return updateTransaction(settingsObj);
    }
}

module.exports = SettingService;