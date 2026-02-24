class MCU {
  constructor(data) {
    this.id = data.id || data.device_id || null;
    this.type = data.type;
    this.name = data.name;
    this.ipAddress = data.ip_address || data.ipAddress;
    this.macAddress = data.mac_address || data.macAddress;
    this.description = data.description;
    this.location = data.location || null;
    this.lastSeen = data.last_seen || data.lastSeen;
    this.apiKey = data.api_key || data.apiKey || null;
    
    // Uložíme jako číslo (0, 1, 2)
    this.is_online = data.is_online !== undefined ? Number(data.is_online) : 0;   
  }

  // Převod pro DB (zůstává stejné)
  toDatabase() {
    return {
      type: this.type,
      name: this.name,
      ip_address: this.ipAddress,
      mac_address: this.macAddress,
      location: this.location,
      description: this.description,
      api_key: this.apiKey,
      last_seen: this.lastSeen,
      is_online: this.is_online 
    };
  }

  // Převod pro frontend - TADY JE OPRAVA
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      name: this.name,
      ipAddress: this.ipAddress,
      macAddress: this.macAddress,
      location: this.location,
      description: this.description,
      apiKey: this.apiKey,
      lastSeen: this.lastSeen,
      // POSÍLÁME ČÍSLO, NE BOOLEAN
      isOnline: Number(this.is_online) 
    };
  }
}

module.exports = MCU;