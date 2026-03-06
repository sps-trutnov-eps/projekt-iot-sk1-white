// models/Command.js
class Command {
    constructor(data) {
        this.id = data.id || null;
        this.serverId = data.serverId || data.server_id;
        this.name = data.name;
        this.type = data.type || 'shell';
        this.command = data.command;
        // PŘIDÁNO: Ošetření booleovské hodnoty z DB (0/1)
        this.isFavorite = data.isFavorite || data.is_favorite ? 1 : 0; 
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    }

    toDatabase() {
        return {
            server_id: this.serverId,
            name: this.name,
            type: this.type,
            command: this.command,
            is_favorite: this.isFavorite, // PŘIDÁNO
            created_at: this.createdAt
        };
    }
}
module.exports = Command;