// services/flashService.js
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');
const TemplateService = require('./templateService');
const MCURepository = require('../repositories/MCURepository');
const SettingService = require('./SettingsService');
const SocketService = require('../sockets/socketService');

const execFileAsync = promisify(execFile);

class FlashService {
    /**
     * Vrátí seznam dostupných sériových portů (filtruje na relevantní USB zařízení)
     */
    static async listPorts() {
        try {
            const { SerialPort } = require('serialport');
            const ports = await SerialPort.list();

            return ports
                .filter(p => p.vendorId || p.manufacturer) // Pouze skutečná USB zařízení
                .map(p => ({
                    path: p.path,
                    manufacturer: p.manufacturer || 'Neznámý',
                    serialNumber: p.serialNumber || null,
                    vendorId: p.vendorId || null,
                    productId: p.productId || null,
                    isPico: p.vendorId === '2E8A' // Raspberry Pi vendor ID
                }));
        } catch (e) {
            console.error('[FlashService] Chyba při detekci portů:', e);
            return [];
        }
    }

    /**
     * Ověří dostupnost mpremote
     */
    static async checkMpremote() {
        try {
            const { stdout } = await execFileAsync('mpremote', ['version'], { timeout: 5000 });
            return { available: true, version: stdout.trim() };
        } catch (e) {
            // Zkusíme python -m mpremote
            try {
                const { stdout } = await execFileAsync('python', ['-m', 'mpremote', 'version'], { timeout: 5000 });
                return { available: true, version: stdout.trim(), usePython: true };
            } catch (e2) {
                return { available: false, error: 'mpremote není nainstalován. Spusťte: pip install mpremote' };
            }
        }
    }

    /**
     * Spustí mpremote příkaz
     */
    static async runMpremote(args, portPath, usePython = false) {
        const fullArgs = usePython
            ? ['-m', 'mpremote', 'connect', portPath, ...args]
            : ['connect', portPath, ...args];
        const cmd = usePython ? 'python' : 'mpremote';

        return execFileAsync(cmd, fullArgs, { timeout: 30000 });
    }

    /**
     * Hlavní flash operace
     * @param {number} mcuId - ID MCU z databáze
     * @param {string} portPath - Cesta k sériovému portu (COM3, /dev/ttyUSB0...)
     * @param {string} templateFilename - Název souboru šablony
     * @param {object} wifiConfig - { ssid, password }
     * @param {object} extraConfig - Další konfigurace od uživatele (volitelné přepsání placeholderů)
     */
    static async flash(mcuId, portPath, templateFilename, wifiConfig, extraConfig = {}) {
        const progress = (step, total, message, status = 'running') => {
            console.log(`[Flash ${step}/${total}] ${message}`);
            if (SocketService.io) {
                SocketService.io.to(`mcu_${mcuId}`).emit('flash_progress', { step, total, message, status });
                // Globální emise pro případ, že uživatel není v detailu MCU
                SocketService.io.emit('flash_progress', { mcuId, step, total, message, status });
            }
        };

        const TOTAL_STEPS = 5;

        try {
            // === KROK 1: Validace ===
            progress(1, TOTAL_STEPS, 'Ověřuji konfiguraci...');

            const mcu = MCURepository.findById(mcuId);
            if (!mcu) throw new Error(`MCU s ID ${mcuId} nenalezeno.`);

            if (!wifiConfig.ssid || !wifiConfig.password) {
                throw new Error('WiFi SSID a heslo jsou povinné.');
            }

            const mpremoteCheck = await this.checkMpremote();
            if (!mpremoteCheck.available) {
                throw new Error(mpremoteCheck.error);
            }

            // === KROK 2: Generování kódu ===
            progress(2, TOTAL_STEPS, 'Generuji kód ze šablony...');

            const templateContent = TemplateService.getTemplate(templateFilename);

            const mqttBroker = SettingService.getSettingValue('mqtt_broker_ip', '127.0.0.1');

            // Sestavení konfigurace pro placeholdery
            const config = {
                WIFI_SSID: wifiConfig.ssid,
                WIFI_PASS: wifiConfig.password,
                MQTT_BROKER: mqttBroker,
                MQTT_PORT: '1883',
                API_KEY: mcu.apiKey || mcu.api_key || '',
                STATIC_IP: mcu.ipAddress || mcu.ip_address || '',
                SUBNET: extraConfig.subnet || '255.255.255.0',
                GATEWAY: extraConfig.gateway || '192.168.1.1',
                DNS: extraConfig.dns || '192.168.1.1',
                DEVICE_NAME: mcu.name || '',
                MAC_ADDRESS: mcu.macAddress || mcu.mac_address || '',
                PUBLISH_INTERVAL: extraConfig.publishInterval || '5',
                ...extraConfig // Uživatelské přepsání
            };

            const renderedCode = TemplateService.render(templateContent, config);

            // === KROK 3: Zápis do temp souboru ===
            progress(3, TOTAL_STEPS, 'Připojuji se k zařízení...');

            const tmpDir = os.tmpdir();
            const tmpFile = path.join(tmpDir, `mcu_flash_${mcuId}_main.py`);
            fs.writeFileSync(tmpFile, renderedCode, 'utf-8');

            const usePython = mpremoteCheck.usePython || false;

            // === KROK 4: Nahrání souboru na MCU ===
            progress(4, TOTAL_STEPS, 'Nahrávám main.py na zařízení...');

            try {
                await this.runMpremote(['cp', tmpFile, ':main.py'], portPath, usePython);
            } catch (uploadError) {
                throw new Error(`Nahrání souboru selhalo: ${uploadError.stderr || uploadError.message}`);
            }

            // === KROK 5: Reset zařízení ===
            progress(5, TOTAL_STEPS, 'Restartuji zařízení...');

            try {
                await this.runMpremote(['reset'], portPath, usePython);
            } catch (resetError) {
                // Reset může "selhat" kvůli odpojení — to je normální
                console.log('[Flash] Reset output:', resetError.message);
            }

            // Cleanup
            try { fs.unlinkSync(tmpFile); } catch (_) {}

            progress(TOTAL_STEPS, TOTAL_STEPS, 'Flash dokončen!', 'success');
            return { success: true, message: 'Kód byl úspěšně nahrán na zařízení.' };

        } catch (error) {
            progress(0, TOTAL_STEPS, `Chyba: ${error.message}`, 'error');
            return { success: false, message: error.message };
        }
    }
}

module.exports = FlashService;
