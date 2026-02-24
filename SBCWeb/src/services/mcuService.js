const ping = require('ping');
const SocketService = require('../sockets/socketService');
const EventService = require('../services/EventService');

const MCU = require('../models/MCU');
const MCURepository = require('../repositories/MCURepository');

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
    // 1. Zjistíme předchozí stav
    const mcuBefore = MCURepository.findById(id);
    
    // 2. Posuneme čas a nastavíme v DB stav na 1 (Online)
    MCURepository.updateLastSeen(id); 
    const mcuAfter = MCURepository.findById(id);

    if (mcuAfter) {
        // 3. Pošleme přes sockety číslo 1 (Místo dřívějšího true!)
        SocketService.broadcastMcuStatus(mcuAfter.id, mcuAfter.lastSeen, 1);
        
        // 4. LOGOVÁNÍ EVENTU: Zkontrolujeme dřívější stav (0 nebo 2)
        const previousState = mcuBefore.is_online !== undefined ? mcuBefore.is_online : (mcuBefore.isOnline || 0);
        
        if (previousState === 0) {
            EventService.logEvent(id, 'info', `Zařízení se připojilo k síti a začalo odesílat data.`);
        } else if (previousState === 2) {
            EventService.logEvent(id, 'info', `Zařízení se "odmrazilo" a znovu odesílá data.`);
        }
    }
    return true;
    }

    static startStatusMonitor() {
    // Zkontrolujeme stav každých 15 vteřin
    const checkIntervalMs = 15 * 1000; 
    const timeoutMs = 60 * 1000; // Po 1 minutě bez dat považujeme za problém
    
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

                // Co si aktuálně myslí databáze? (Teď už to není true/false, ale 0, 1, 2)
                const currentState = mcu.is_online !== undefined ? mcu.is_online : (mcu.isOnline || 0);

                // Co je skutečná realita fyzické sítě? (Odpovídá na Ping?)
                let physicallyAlive = false;

                if (mcu.ipAddress || mcu.ip_address) {
                    const ipToPing = mcu.ipAddress || mcu.ip_address;
                    try {
                        const pingRes = await ping.promise.probe(ipToPing, { timeout: 2 });
                        physicallyAlive = pingRes.alive;
                    } catch (err) {
                        physicallyAlive = false;
                    }
                } else {
                    // Pokud nemá IP adresu, nemůžeme dělat ping.
                    // Tváříme se, že fyzicky nežije, budeme se spoléhat čistě na MQTT.
                    physicallyAlive = false;
                }

                // --- ROZHODOVACÍ STROM PRO 3 STAVY ---

                // STAV 0: Úplně mrtvé (Nechodí MQTT, nefunguje Ping)
                if (diffMs > timeoutMs && !physicallyAlive && currentState !== 0) {
                    console.log(`[MONITOR] MCU ID ${mcu.id} (${mcu.name}) je zcela OFFLINE.`);
                    
                    MCURepository.updateOnlineStatus(mcu.id, 0);
                    SocketService.broadcastMcuStatus(mcu.id, mcu.lastSeen, 0);
                    EventService.logEvent(mcu.id, 'alert', `Zařízení přestalo odpovídat na síti a je offline.`);
                }
                
                // STAV 2: Zamrzlé / Sítově dostupné (Nechodí MQTT, ale funguje Ping)
                else if (diffMs > timeoutMs && physicallyAlive && currentState !== 2) {
                    console.log(`[MONITOR] MCU ID ${mcu.id} (${mcu.name}) je ZAMRZLÉ (Ping ok, MQTT bez dat).`);
                    
                    MCURepository.updateOnlineStatus(mcu.id, 2);
                    SocketService.broadcastMcuStatus(mcu.id, mcu.lastSeen, 2);
                    EventService.logEvent(mcu.id, 'warn', `Zařízení je na síti, ale neposílá žádná data.`);
                }

                // STAV 1: Návrat k životu díky Pingu (Volitelné)
                // Pokud bylo mrtvé (0) a najednou začne odpovídat na ping (ale ještě neposlalo MQTT data),
                // přepneme ho do stavu 2 (Zamrzlé/Čekající). Do stavu 1 (Plně funkční) ho dostane
                // až to, když reálně přijde MQTT zpráva (přes MeasurementService -> updateLastSeen).
                else if (currentState === 0 && physicallyAlive) {
                    console.log(`[MONITOR] MCU ID ${mcu.id} (${mcu.name}) se znovu objevilo na síti (Ping ok). Čekám na data.`);
                    
                    MCURepository.updateOnlineStatus(mcu.id, 2); // Zápis stavu 2
                    SocketService.broadcastMcuStatus(mcu.id, mcu.lastSeen, 2);
                    EventService.logEvent(mcu.id, 'info', `Zařízení je znovu dostupné na síti. Čekám na telemetrická data.`);
                }

                // ŽÁDNÉ UMĚLÉ POSOUVÁNÍ ČASU `lastSeen`!
                // Pokud je v pořádku a posílá data (diffMs < timeoutMs), neděláme nic.
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

        try {
            EventService.logEvent(newId, 'info', `Nové zařízení "${data.name}" bylo zaregistrováno do systému.`);
        } catch (e) {
            console.error("Chyba logování vytvoření MCU:", e);
        }

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
    // DELETE - smazat MCU
    static deleteMCU(id) {
        // 1. NEJDŘÍV si musíme MCU najít, abychom znali jeho jméno a IP pro log!
        const mcu = MCURepository.findById(id);
        
        if (!mcu) {
            throw new Error('MCU s daným ID nebylo nalezeno');
        }

        // 2. Zalogujeme smazání PŘEDTÍM, než ho reálně smažeme z databáze
        try {
        EventService.logEvent(null, 'warning', `Zařízení "${mcu.name}" (IP: ${mcu.ipAddress || mcu.ip_address || 'N/A'}) bylo odstraněno ze systému.`);
        } catch (e) {
            console.error("Chyba logování smazání MCU:", e);
        }

        // 3. Až teď provedeme samotné smazání
        const success = MCURepository.delete(id);
        
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

    static getActiveCount() {
    // Předpokládá, že jsi do MCURepository přidal metodu countActive()
    return MCURepository.countActive();
    }
}

module.exports = MCUService;