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
    
    // NOVÉ: Mapování statusu z databáze (výchozí je 0 / offline)
    this.is_online = data.is_online !== undefined ? data.is_online : (data.isOnline !== undefined ? data.isOnline : 0);
  }

  // Převod pro DB (camelCase → snake_case)
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
      is_online: this.is_online // Pro jistotu přidáno i sem
    };
  }

  // Převod pro frontend (snake_case → camelCase)
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
      isOnline: !!this.is_online // Převede 1 na true a 0 na false pro čistší práci ve frontendu
    };
  }
}

module.exports = MCU;