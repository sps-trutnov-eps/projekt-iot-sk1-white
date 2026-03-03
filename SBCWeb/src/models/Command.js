// models/Command.js
class Command {
    constructor(data) {
        this.id = data.id || null;
        this.serverId = data.serverId || data.server_id;
        this.name = data.name;
        this.type = data.type || 'shell';
        this.command = data.command; // Pro WOL sem uložíme MAC adresu
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    }

    toDatabase() {
        return {
            server_id: this.serverId,
            name: this.name,
            type: this.type,
            command: this.command,
            created_at: this.createdAt
        };
    }
}
module.exports = Command;