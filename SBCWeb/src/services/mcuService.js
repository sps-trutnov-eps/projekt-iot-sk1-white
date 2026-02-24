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
            
            // Logujeme POUZE pokud se zařízení probere z naprostého Offline stavu.
            // (Zrušil jsem logování pro přechod z Passive, aby to zbytečně nespamovalo logy
            // pokaždé, když má MCU jen chvilkové zpoždění).
            if (previousState === 0) {
                EventService.logEvent(id, 'info', `Zařízení se připojilo k síti a odesílá data.`);
            } 
        }
        return true;
    }

    // CREATE - vytvořit nové MCU
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

        try {
            EventService.logEvent(newId, 'info', `Nové zařízení "${data.name}" bylo zaregistrováno do systému.`);
        } catch (e) {
            console.error("Chyba logování vytvoření MCU:", e);
        }

        return mcu;
    }

    // READ - získat jedno MCU
    static findById(id) {
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
        return MCURepository.countActive();
    }
}

module.exports = MCUService;