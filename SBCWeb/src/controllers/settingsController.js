const SettingService = require('../services/SettingsService');

class SettingController {
    // Vykreslí HTML stránku
    static renderSettings(req, res) {
        res.render('settings', { path: '/settings' }); 
    }

    // API: Načte nastavení pro JS
    static async getSettings(req, res) {
        try {
            const data = SettingService.getSettingsAsObject();
            res.status(200).json({ success: true, data: data });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Chyba při načítání nastavení.' });
        }
    }

    // API: Uloží nastavení z JS
    static async saveSettings(req, res) {
        try {
            // Očekáváme body např.: { mqtt_broker_ip: '192.168.1.5', server_ping_interval: '60000' }
            const count = SettingService.updateMultipleSettings(req.body);
            res.status(200).json({ success: true, message: `Úspěšně uloženo.` });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = SettingController;