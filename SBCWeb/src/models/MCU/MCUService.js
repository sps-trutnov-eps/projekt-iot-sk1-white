const ping = require('ping');
const SocketService = require('../socketService');
const EventService = require('../Event/EventService');

const MCU = require('./MCU');
const MCURepository = require('./MCURepository');

class MCUService {
    
    /**
     * Ověří zařízení podle API klíče.
     * Volá to MeasurementService při příjmu dat.
     */
    static validateAndGetDevice(apiKey) {
        if (!apiKey) {
            return null;
        }
        return MCURepository.findByApiKey(apiKey);
    }

    /**
     * Aktualizuje čas posledního kontaktu.
     * Volá to MeasurementService při příjmu JAKÝCHKOLIV dat z MCU.
     * Důležité: Tímto se v repozitáři rovnou nastaví i is_online = 1.
     */
    static updateLastSeen(id) {
        // Zjistíme předchozí stav
        const mcuBefore = MCURepository.findById(id);
        
        const result = MCURepository.updateLastSeen(id);
        const mcuAfter = MCURepository.findById(id);

        if (mcuAfter) {
            SocketService.broadcastMcuStatus(mcuAfter.id, mcuAfter.lastSeen, true);
            
            // LOGOVÁNÍ EVENTU: Pokud byl offline a teď je online
            if (mcuBefore && (mcuBefore.is_online === 0 || mcuBefore.is_online === false)) {
                EventService.logEvent(id, 'info', `Zařízení obnovilo spojení se serverem.`);
            }
        }
        return result;
    }

    static startStatusMonitor() {
        // Zkontrolujeme stav každých 5 vteřin
        const checkIntervalMs = 15 * 1000; 
        const timeoutMs = 60 * 1000; 
        
        console.log(`[MCUService] Monitor stavu startuje (interval: ${checkIntervalMs}ms)`);

        const checkStatus = async () => {
            try {
                const now = new Date();
                const allMcus = MCURepository.findAll();

                for (const mcu of allMcus) {
                    // Ošetření času
                    if (!mcu.lastSeen) continue; 
                    let dbTime = mcu.lastSeen;
                    if (typeof dbTime === 'string') dbTime = dbTime.replace(' ', 'T');
                    
                    const lastSeenDate = new Date(dbTime);
                    const diffMs = now.getTime() - lastSeenDate.getTime();

                    // Co si aktuálně myslí databáze?
                    const isOnlineVal = mcu.isOnline !== undefined ? mcu.isOnline : mcu.is_online;
                    const dbThinksIsOnline = (isOnlineVal === 1 || isOnlineVal === true);

                    // Co je skutečná realita fyzické sítě?
                    let physicallyAlive = false;

                    if (mcu.ipAddress) {
                        try {
                            const pingRes = await ping.promise.probe(mcu.ipAddress, { timeout: 2 });
                            physicallyAlive = pingRes.alive;
                        } catch (err) {
                            physicallyAlive = false;
                        }
                    } else {
                        // Pokud nemá IP adresu, spoléháme se jen na čas od poslední MQTT zprávy
                        physicallyAlive = diffMs <= timeoutMs;
                    }

                    // --- ROZHODOVACÍ STROM ---

                    // 1. ZMĚNA NA OFFLINE: Databáze si myslí že žije, ale ono umřelo
                    if (dbThinksIsOnline && !physicallyAlive && diffMs > timeoutMs) {
                        console.log(`[MONITOR] MCU ID ${mcu.id} (${mcu.name}) neodpovídá! Přepínám na OFFLINE.`);
                        
                        MCURepository.updateOnlineStatus(mcu.id, 0);
                        SocketService.broadcastMcuStatus(mcu.id, mcu.lastSeen, false);
                        EventService.logEvent(mcu.id, 'alert', `Zařízení přestalo odpovídat na síti a je offline.`);
                    }
                    
                    // 2. ZMĚNA NA ONLINE: Databáze si myslí že je mrtvé, ale ono žije (Ping prošel)
                    else if (!dbThinksIsOnline && physicallyAlive) {
                        console.log(`[MONITOR] MCU ID ${mcu.id} (${mcu.name}) znovu ožilo! Přepínám na ONLINE.`);
                        
                        // Zápis nového času a stavu 1
                        MCURepository.updateLastSeen(mcu.id);
                        SocketService.broadcastMcuStatus(mcu.id, new Date().toISOString(), true);
                        EventService.logEvent(mcu.id, 'info', `Zařízení začalo odpovídat na síti a je online.`);
                    }
                    
                    // 3. UDRŽOVÁNÍ PŘI ŽIVOTĚ: Žije v DB, žije fyzicky, ale už dlouho neposlalo MQTT data
                    else if (dbThinksIsOnline && physicallyAlive && diffMs > timeoutMs) {
                        // Zařízení nevysílá senzory, ale ping funguje. Jen mu posuneme last_seen, 
                        // abychom zabránili stárnutí času, ale neposíláme zbytečně sockety a eventy.
                        MCURepository.updateLastSeen(mcu.id);
                        SocketService.broadcastMcuStatus(mcu.id, new Date().toISOString(), true);
                    }
                }
            } catch (error) {
                console.error("[MONITOR CHYBA] Závažná chyba ve smyčce:", error);
            } finally {
                // Bezpečné volání dalšího kola
                setTimeout(checkStatus, checkIntervalMs);
            }
        };

        // Odstartování smyčky
        checkStatus();
    }


    // CREATE - vytvořit nové MCU
    static createMCU(data) {
        // ... (Tvůj stávající kód)
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

        return mcu;
    }

    // READ - získat jedno MCU
    static findById(id) {
        // ... (Tvůj stávající kód)
        if(!id){
            throw new Error('Id je povinné k vyhledání.');
        }      
        
        const mcu = MCURepository.findById(id);
        
        if(!mcu){
            throw new Error('MCU s daným ID nebylo nalezeno');
        }
        return mcu;
    }

    // READ - získat všechna MCU
    static getAllMCUs() {
        return MCURepository.findAll();
    }

    // UPDATE - aktualizovat MCU
    static updateMCU(id, data) {
        // ... (Tvůj stávající kód)
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

        try {
            EventService.logEvent(id, 'info', `Nastavení zařízení bylo upraveno.`);
        } catch (e) {
            console.error("Chyba logování editace MCU:", e);
        }

        return MCURepository.update(id, updateData);
    }

    // DELETE - smazat MCU
    static deleteMCU(id) {
        // ... (Tvůj stávající kód)
        const success = MCURepository.delete(id);
        if (!success) {
            throw new Error('MCU s daným ID nebylo nalezeno');
        }
        return success;
    }

    // HELPER - vygenerovat API klíč
    static generateApiKey() {
        return 'api_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // HELPER - IP, MAC check
    static checkMAC(mac){
        // ... (Tvůj stávající kód)
        if(!mac || mac.trim() ==="" || typeof mac !== "string"){
            throw new Error('Neplatná hodnota zadané MAC adresy');
        }
        const normalized = mac.trim().replace(/[-.]/g, ':');
        const parts = normalized.split(":");
        if (parts.length !== 6){
            throw new Error('Neplatná hodnota zadané MAC adresy');
        } 
        if (!parts.every(part => part.length === 2 && /^[0-9A-Fa-f]{2}$/.test(part))) {
        throw new Error('Neplatná MAC adresa – bloky musí být 2 hex číslice');
        }
        return true;
    }

    static checkIP(ip){
        // ... (Tvůj stávající kód)
        if(!ip || ip.trim() ==="" || typeof ip!=="string"){
            throw new Error('Neplatná hodnota zadané IP adresy');
        }
        const normalized = ip.trim();
        const parts = normalized.split(".");
        if (parts.length !== 4){
            throw new Error('Neplatná hodnota zadané IP adresy');
        }
        if (!parts.every(part => {
        const n = Number(part);
        return part === n.toString() && n >= 0 && n <= 255;
        })) {
            throw new Error('Neplatná IP adresa – bloky musí být čísla od 0 do 255.');
        }
        return true;
    }
}

module.exports = MCUService;