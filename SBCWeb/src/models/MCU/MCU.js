class MCU {
  constructor(data) {
    this.id = data.id || data.device_id || null;
    this.type = data.type
    this.name = data.name;
    this.ipAddress = data.ip_address || data.ipAddress;
    this.macAddress = data.mac_address || data.macAddress;
    this.description = data.description;
    this.location = data.location || null;
    this.apiKey = data.api_key || data.apiKey || null;
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
      api_key: this.apiKey
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
      apiKey: this.apiKey
    };
  }

  
}

module.exports = MCU;

