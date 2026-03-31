// controllers/flashController.js
const TemplateService = require('../services/templateService');
const MCURepository = require('../repositories/MCURepository');
const SettingService = require('../services/SettingsService');
const multer = require('multer');

// Multer konfigurace pro upload šablon (do paměti)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 512 * 1024 }, // Max 512 KB
    fileFilter: (req, file, cb) => {
        if (file.originalname.endsWith('.py')) {
            cb(null, true);
        } else {
            cb(new Error('Pouze .py soubory jsou povoleny.'));
        }
    }
});

const flashController = {
    /**
     * POST /mcu/:id/render-template
     * Vyrenderuje šablonu s konfigurací MCU a vrátí hotový .py kód
     * Body: { templateFilename, wifiSsid, wifiPassword, extraConfig }
     */
    renderTemplate(req, res) {
        try {
            const mcuId = parseInt(req.params.id);
            const { templateFilename, wifiSsid, wifiPassword, extraConfig = {} } = req.body;

            if (!templateFilename) return res.status(400).json({ success: false, message: 'Šablona je povinná.' });
            if (!wifiSsid || !wifiPassword) return res.status(400).json({ success: false, message: 'WiFi SSID a heslo jsou povinné.' });

            const mcu = MCURepository.findById(mcuId);
            if (!mcu) return res.status(404).json({ success: false, message: `MCU s ID ${mcuId} nenalezeno.` });

            const templateContent = TemplateService.getTemplate(templateFilename);
            const mqttBroker = SettingService.getSettingValue('mqtt_broker_ip', '127.0.0.1');

            const config = {
                WIFI_SSID: wifiSsid,
                WIFI_PASS: wifiPassword,
                MQTT_BROKER: mqttBroker,
                MQTT_PORT: '1883',
                API_KEY: mcu.apiKey || mcu.api_key || '',
                STATIC_IP: extraConfig.staticIp || '',
                SUBNET: extraConfig.subnet || '255.255.255.0',
                GATEWAY: extraConfig.gateway || '',
                DNS: extraConfig.dns || '',
                DEVICE_NAME: mcu.name || '',
                MAC_ADDRESS: mcu.macAddress || mcu.mac_address || '',
                PUBLISH_INTERVAL: extraConfig.publishInterval || '5',
                ...extraConfig
            };

            const code = TemplateService.render(templateContent, config);

            res.json({ success: true, code });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * GET /mcu/templates
     * Vrátí seznam šablon
     */
    getTemplates(req, res) {
        try {
            const templates = TemplateService.listTemplates();
            res.json({ success: true, templates });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * POST /mcu/templates/upload
     * Upload nové šablony
     */
    uploadTemplate: [
        upload.single('template'),
        (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ success: false, message: 'Nebyl nahrán žádný soubor.' });
                }

                const content = req.file.buffer.toString('utf-8');
                const filename = TemplateService.saveTemplate(req.file.originalname, content);
                const placeholders = TemplateService.getPlaceholders(content);

                res.json({
                    success: true,
                    message: `Šablona "${filename}" byla nahrána.`,
                    filename,
                    placeholders
                });
            } catch (error) {
                res.status(500).json({ success: false, message: error.message });
            }
        }
    ],

    /**
     * GET /mcu/templates/:filename
     * Vrátí obsah šablony (pro preview)
     */
    getTemplateContent(req, res) {
        try {
            const content = TemplateService.getTemplate(req.params.filename);
            const placeholders = TemplateService.getPlaceholders(content);
            res.json({ success: true, content, placeholders });
        } catch (error) {
            res.status(404).json({ success: false, message: error.message });
        }
    },

    /**
     * DELETE /mcu/templates/:filename
     * Smaže šablonu
     */
    deleteTemplate(req, res) {
        try {
            const deleted = TemplateService.deleteTemplate(req.params.filename);
            if (!deleted) return res.status(404).json({ success: false, message: 'Šablona nenalezena.' });
            res.json({ success: true, message: 'Šablona smazána.' });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = flashController;
