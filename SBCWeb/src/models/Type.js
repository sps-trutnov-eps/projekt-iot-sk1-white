class Type {
  constructor(data) {
    this.id = data.id || data.type_id || null;
    this.type = data.type
  }

  // Převod pro DB (camelCase → snake_case)
  toDatabase() {
    return {
      type: this.type,
    };
  }

  // Převod pro frontend (snake_case → camelCase)
  toJSON() {
    return {
      id: this.id,
      type: this.type,
    };
  }

  
}

module.exports = Type;

