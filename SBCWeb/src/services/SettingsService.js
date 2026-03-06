const SettingRepository = require('../repositories/SettingsRepository');
const db = require('../config/database.js'); 
const EventEmitter = require('events'); // PŘIDÁNO: Vestavěný modul Node.js

// Vytvoříme globální instanci vysílačky pro nastavení
const settingsEvents = new EventEmitter();

class SettingService {
    
    // Zpřístupníme vysílačku ostatním částem aplikace
    static get events() {
        return settingsEvents;
    }

    static getSettingValue(key, defaultValue = null) {
        const setting = SettingRepository.getByKey(key);
        return setting && setting.value !== undefined ? setting.value : defaultValue;
    }

    static getSettingsAsObject() {
        const settingsList = SettingRepository.getAll();
        const settingsObj = {};
        settingsList.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });
        return settingsObj;
    }

    static updateMultipleSettings(settingsObj) {
        if (!settingsObj || typeof settingsObj !== 'object') {
            throw new Error('Neplatná data pro nastavení.');
        }

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

        const count = updateTransaction(settingsObj);

        // PŘIDÁNO: Pokud se něco uložilo, zařveme do éteru, ať to ostatní vědí!
        if (count > 0) {
            settingsEvents.emit('settingsUpdated', settingsObj);
        }

        return count;
    }
}

module.exports = SettingService;