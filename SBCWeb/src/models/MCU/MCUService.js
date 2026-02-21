const ping = require('ping');

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
        return MCURepository.updateLastSeen(id);
    }

    // NOVÉ: Monitor stavu MCU (Ping/Timeout)
    // NOVÉ: Monitor stavu MCU (Ping/Timeout)
    static startStatusMonitor(socketService = null) {
        // Zkontrolujeme stav každých 4 vteřiny
        const checkIntervalMs = 4000; 
        
        // Považujeme MCU za podezřelé, pokud se neozvalo déle než 8 vteřin
        const timeoutMs = 8000; 
        
        console.log(`[MCUService] Monitor stavu startuje (interval: ${checkIntervalMs}ms, limit výpadku: ${timeoutMs}ms)`);

        const checkStatus = async () => {
            try {
                const now = new Date();
                const allMcus = MCURepository.findAll();
                

                for (const mcu of allMcus) {
                    // OPRAVA: Používáme camelCase vlastnosti z MCU objektu
                    if (!mcu.lastSeen) {
                        console.log(`[DEBUG] Přeskakuji MCU ${mcu.name}, protože nemá lastSeen.`);
                        continue; 
                    }

                    let dbTime = mcu.lastSeen;
                    if (typeof dbTime === 'string') {
                        dbTime = dbTime.replace(' ', 'T');
                    }

                    const lastSeenDate = new Date(dbTime);
                    const now = new Date();
                    const diffMs = now.getTime() - lastSeenDate.getTime();

                    // Ošetření toho, jak se to přesně uložilo do objektu MCU
                    const isOnlineVal = mcu.isOnline !== undefined ? mcu.isOnline : mcu.is_online;
                    const isCurrentlyOnline = (isOnlineVal === 1 || isOnlineVal === true);


                    if (diffMs > timeoutMs && isCurrentlyOnline) {
                        
                        let isReallyOffline = true;

                        // OPRAVA: Používáme ipAddress z objektu
                        const targetIp = mcu.ipAddress; 

                        if (targetIp) {
                            try {
                                const pingRes = await ping.promise.probe(targetIp, {
                                    timeout: 2, 
                                });

                                if (pingRes.alive) {
                                    isReallyOffline = false; 
                                    MCURepository.updateLastSeen(mcu.id);
                                } 
                            } catch (err) {
                                console.error(`[MONITOR] Chyba pingu na ${targetIp}:`, err.message);
                            }
                        } 

                        if (isReallyOffline) {                            
                            const dbResult = MCURepository.updateOnlineStatus(mcu.id, 0);

                            if (socketService) {
                                socketService.broadcastMcuStatus(mcu.id, mcu.lastSeen, false); 
                            }
                        }
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