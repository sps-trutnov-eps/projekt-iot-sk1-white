class Server {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name;
        this.ipAddress = data.ip || data.ipAddress || data.ip_address;
        this.type = data.type || 'server'; 
        this.isOnline = data.isOnline !== undefined ? data.isOnline : (data.is_online || 0);
        this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
    }

    toDatabase() {
        return {
            name: this.name,
            ip: this.ipAddress,
            type: this.type,
            is_online: this.isOnline,
            created_at: this.createdAt
        };
    }
}

module.exports = Server;