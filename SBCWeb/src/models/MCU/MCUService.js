const MCU = require('./MCU');
const MCURepository = require('./MCURepository');

class MCUService {
    
    // CREATE - vytvořit nové MCU
    static createMCU(data) {
        // 1. Validace (zkontroluj povinná pole)
        if(!data.name || data.name.trim() ===''){
            throw new Error('Name je povinné pole');
        }
        //IP
        const ipAddress = data.ipAddress || data.ip_address;
        if (!ipAddress || ipAddress.trim() === '') {
            throw new Error('IP adresa je povinná');
        }
        
        //MAC
        const macAddress = data.mac_address || data.macAddress;

        if (!macAddress || macAddress.trim() === '') {
            throw new Error('MAC adresa je povinná');
        }

        
        const mcu = new MCU({
            name: data.name.trim(),
            ipAddress: ipAddress.trim(),
            macAddress: macAddress.trim(),
            description: data.description?.trim() || null,
            apiKey: this.generateApiKey()
        });
        
        const dbData = mcu.toDatabase();

        const id = MCURepository.create(dbData);
        
        mcu.id = id;

        return mcu;
        
    }

    // READ - získat jedno MCU
    static getMCU(id) {
        // Repository.findById
        // Zkontroluj zda existuje
    }

    // READ - získat všechna MCU
    static getAllMCUs() {
        // Repository.findAll
    }

    // UPDATE - aktualizovat MCU
    static updateMCU(id, data) {
        // Validace
        // Převod na DB formát
        // Repository.update
    }

    // DELETE - smazat MCU
    static deleteMCU(id) {
        // Repository.delete
    }

    // HELPER - vygenerovat API klíč
    static generateApiKey() {
        return 'api_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

module.exports = MCUService;