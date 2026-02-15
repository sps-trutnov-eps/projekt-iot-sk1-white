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
        // Repository metodu findByApiKey už máš, jen ji voláme
        return MCURepository.findByApiKey(apiKey);
    }

    /**
     * Aktualizuje čas posledního kontaktu.
     * Volá to MeasurementService, aby svítila zelená tečka.
     */
    static updateLastSeen(id) {
        return MCURepository.updateLastSeen(id);
    }


    // CREATE - vytvořit nové MCU
    static createMCU(data) {
        // 1. Validace (zkontroluj povinná pole)
        if(!data.name || data.name.trim() ===''){
            throw new Error('Name je povinné pole');
        }
        //IP
        const ipAddress = data.ipAddress || data.ip_address;
        
        this.checkIP(ipAddress);
        
        //MAC
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

        return MCURepository.update(id, updateData);

    }

    // DELETE - smazat MCU
    static deleteMCU(id) {
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
}

module.exports = MCUService;