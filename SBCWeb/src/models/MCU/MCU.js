class MCU {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.ipAddress = data.ip_address || data.ipAddress;
    this.location = data.location || null;
    this.apiKey = data.api_key || data.apiKey || null;
  }

  // Převod pro DB (camelCase → snake_case)
  toDatabase() {
    return {
      name: this.name,
      ip_address: this.ipAddress,
      location: this.location,
      api_key: this.apiKey
    };
  }

  // Převod pro frontend (snake_case → camelCase)
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      ipAddress: this.ipAddress,
      location: this.location,
      apiKey: this.apiKey
    };
  }

  
}

module.exports = MCU;

