// controllers/flashController.js
const FlashService = require('../services/flashService');
const TemplateService = require('../services/templateService');
const multer = require('multer');
const path = require('path');

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
     * GET /mcu/serial-ports
     * Vrátí seznam dostupných sériových portů + stav mpremote
     */
    async getSerialPorts(req, res) {
        try {
            const [ports, mpremote] = await Promise.all([
                FlashService.listPorts(),
                FlashService.checkMpremote()
            ]);
            res.json({ success: true, ports, mpremote });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * POST /mcu/:id/flash
     * Spustí flash proces pro dané MCU
     * Body: { portPath, templateFilename, wifiSsid, wifiPassword, extraConfig }
     */
    async flashDevice(req, res) {
        try {
            const mcuId = parseInt(req.params.id);
            const { portPath, templateFilename, wifiSsid, wifiPassword, extraConfig } = req.body;

            if (!portPath) return res.status(400).json({ success: false, message: 'Port je povinný.' });
            if (!templateFilename) return res.status(400).json({ success: false, message: 'Šablona je povinná.' });
            if (!wifiSsid || !wifiPassword) return res.status(400).json({ success: false, message: 'WiFi SSID a heslo jsou povinné.' });

            // Odpovíme okamžitě, flash běží na pozadí
            res.json({ success: true, message: 'Flash zahájen.' });

            // Spuštění flash procesu asynchronně
            FlashService.flash(mcuId, portPath, templateFilename, {
                ssid: wifiSsid,
                password: wifiPassword
            }, extraConfig || {});

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
