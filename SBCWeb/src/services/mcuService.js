// services/MCUService.js
const ping = require('ping');
const SocketService = require('../sockets/socketService');
const EventService = require('./EventService'); // Můžeme nechat, je to ve stejné složce
const SettingService = require('./SettingsService'); // Změněno na Service!

const MCU = require('../models/MCU');
const MCURepository = require('../repositories/MCURepository');

class MCUService {
    
    /**
     * Spustí nekonečnou smyčku pro kontrolu stavu MCU (Watchdog)
     */
/**
     * Spustí nekonečnou smyčku pro kontrolu stavu MCU (Watchdog) s dynamickým intervalem
     */
    static startStatusMonitor() {

        // Rekurzivní funkce, která nahrazuje setInterval
        const runMonitor = async () => {
            // 1. Zjistíme aktuální interval z DB (výchozí 30000 ms = 30s)
            const intervalMs = Number(SettingService.getSettingValue('mcu_ping_interval', 30000));

            try {
                const allMcus = MCURepository.findAll();
                const now = Date.now(); 

                for (const mcu of allMcus) {
                    let dbTime = mcu.lastSeen;
                    let lastSeenTime = 0;
                    
                    if (dbTime) {
                        if (typeof dbTime === 'string') {
                            dbTime = dbTime.replace(' ', 'T');
                            if (!dbTime.endsWith('Z')) {
                                dbTime += 'Z'; 
                            }
                        }
                        const parsedDate = new Date(dbTime);
                        if (!isNaN(parsedDate)) {
                            lastSeenTime = parsedDate.getTime();
                        }
                    }

                    const diffMs = now - lastSeenTime;
                    let currentState = mcu.is_online !== undefined ? mcu.is_online : (mcu.isOnline || 0);
                    const targetIp = mcu.ipAddress || mcu.ip_address;
                    let newStatus = currentState;

                    // Timeout práh se nyní dynamicky odvíjí od intervalu
                    const timeoutThreshold = intervalMs < 20000 ? 20000 : intervalMs;

                    if (diffMs > timeoutThreshold) {
                        const cleanIp = targetIp ? String(targetIp).trim() : null;

                        if (!cleanIp) {
                            newStatus = 0; 
                        } else {
                            try {
                                const pingRes = await ping.promise.probe(cleanIp, { timeout: 2 });
                                if (pingRes.alive) {
                                    newStatus = 2; // Passive
                                } else {
                                    newStatus = 0; // Offline
                                }
                            } catch (e) {
                                newStatus = 0;
                            }
                        }
                    } else {
                        newStatus = 1; // Online
                    }

                    // Pokud se stav změnil
                    if (newStatus !== currentState) {
                        MCURepository.updateOnlineStatus(mcu.id, newStatus);
                        
                        if (SocketService.io) {
                            SocketService.broadcastMcuStatus(mcu.id, mcu.lastSeen, newStatus);
                        }

                        // Logování změny stavu do Eventů
                        let statusText = '';
                        let type = 'info';
                        if (newStatus === 1) { statusText = 'Online'; type = 'info'; }
                        else if (newStatus === 2) { statusText = 'Passive'; type = 'warning'; }
                        else { statusText = 'Offline'; type = 'alert'; }

                        EventService.logEvent(mcu.id, type, `Zařízení přešlo do stavu ${statusText}.`);
                    }
                }
            } catch (error) {
                console.error('[MONITOR CHYBA]', error);
            }

            // 2. Naplánujeme další spuštění podle aktuálního DB intervalu!
            setTimeout(runMonitor, intervalMs);
        };

        // Spustíme první iteraci ihned
        runMonitor();
    }

    static validateAndGetDevice(apiKey) {
        if (!apiKey) return null;
        return MCURepository.findByApiKey(apiKey);
    }

    static updateLastSeen(id) {
        const mcuBefore = MCURepository.findById(id);
        MCURepository.updateLastSeen(id); 
        const mcuAfter = MCURepository.findById(id);

        if (mcuAfter) {
            SocketService.broadcastMcuStatus(mcuAfter.id, mcuAfter.lastSeen, 1);
            const previousState = mcuBefore.is_online !== undefined ? mcuBefore.is_online : (mcuBefore.isOnline || 0);
            
            if (previousState === 0) {
                EventService.logEvent(id, 'info', `Zařízení se připojilo k síti a odesílá data.`);
            } 
        }
        return true;
    }

    // CREATE
    static createMCU(data) {
        if(!data.name || data.name.trim() ===''){
            throw new Error('Name je povinné pole');
        }
        const ipAddress = data.ipAddress || data.ip_address;
        this.checkIP(ipAddress);
        const macAddress = data.mac_address || data.macAddress;
        this.checkMAC(macAddress);

        if(!MCURepository.uniqueMac(macAddress)){
            throw new Error('MAC adresa musí být unikátní.');
        }

        const mcu = new MCU({
            name: data.name,
            type: data.type,
            ipAddress: data.ipAddress || data.ip_address,
            macAddress: data.macAddress || data.mac_address,
            location: data.location || data.mcuLocation,
            description: data.description,
            apiKey: this.generateApiKey()
        });
        
        const dbData = mcu.toDatabase();
        const result = MCURepository.create(dbData);
        const newId = result.lastID || result.id || result;
        mcu.id = newId;

        // SPRÁVNĚ ZAPOJENO
        EventService.logEvent(newId, 'info', `Nové zařízení "${data.name}" bylo zaregistrováno do systému.`);

        return mcu;
    }

    // READ
    static findById(id) {
        if(!id) throw new Error('Id je povinné k vyhledání.');
        const mcu = MCURepository.findById(id);
        if(!mcu) throw new Error('MCU s daným ID nebylo nalezeno');
        return mcu;
    }

    static getAllMCUs() {
        return MCURepository.findAll();
    }

    // UPDATE
    static updateMCU(id, data) {
        const mcu = MCURepository.findById(id);
        this.checkIP(data.ipAddress);
        this.checkMAC(data.macAddress);
        
        const updateData = {
            name: data.name ?? mcu.name,
            type: data.type ?? mcu.type,
            ip_address: data.ipAddress ?? mcu.ipAddress,
            mac_address: data.macAddress ?? mcu.macAddress,
            location: data.location ?? mcu.location,
            description: data.description ?? mcu.description
        }

        // SPRÁVNĚ ZAPOJENO
        EventService.logEvent(id, 'info', `Nastavení zařízení bylo upraveno.`);

        return MCURepository.update(id, updateData);
    }

    // DELETE
    static deleteMCU(id) {
        const mcu = MCURepository.findById(id);
        if (!mcu) throw new Error('MCU s daným ID nebylo nalezeno');

        // PŘEDĚLÁNO: Protože MCU bude smazáno a ID z tabulky event_logs zmizí (cascade set null), 
        // použijeme globální systémový log, aby informace o smazání v historii zůstala.
        EventService.logSystemEvent('warning', `Zařízení "${mcu.name}" (IP: ${mcu.ipAddress || mcu.ip_address || 'N/A'}) bylo odstraněno ze systému.`);

        return MCURepository.delete(id);
    }

    // HELPERY
    static generateApiKey() {
        return 'api_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    static checkMAC(mac){
        // ... stávající validace ...
        if(!mac || mac.trim() ==="" || typeof mac !== "string") throw new Error('Neplatná hodnota zadané MAC adresy');
        const normalized = mac.trim().replace(/[-.]/g, ':');
        const parts = normalized.split(":");
        if (parts.length !== 6) throw new Error('Neplatná hodnota zadané MAC adresy');
        if (!parts.every(part => part.length === 2 && /^[0-9A-Fa-f]{2}$/.test(part))) throw new Error('Neplatná MAC adresa');
        return true;
    }

    static checkIP(ip){
        // ... stávající validace ...
        if(!ip || ip.trim() ==="" || typeof ip!=="string") throw new Error('Neplatná hodnota IP adresy');
        const parts = ip.trim().split(".");
        if (parts.length !== 4) throw new Error('Neplatná hodnota IP adresy');
        if (!parts.every(p => { const n = Number(p); return p === n.toString() && n >= 0 && n <= 255; })) throw new Error('Neplatná IP adresa');
        return true;
    }

    static getActiveCount() {
        return MCURepository.countActive();
    }
}

module.exports = MCUService;