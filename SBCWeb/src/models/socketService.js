class SocketService {
    constructor() {
        this.io = null; // Na začátku je to prázdné!
        this.lastReadings = new Map(); 
    }

    // Tuto metodu volá app.js a předá jí skutečný socket server
    init(io) {
        this.io = io;
        //console.log("✅ SocketService byl inicializován."); // Log pro kontrolu

        this.io.on('connection', (socket) => {
            //console.log(`Socket připojen: ${socket.id}`);

            socket.on('subscribe_channel', (channelId) => {
                const id = parseInt(channelId);
                socket.join(`channel_${id}`);
                
                if (this.lastReadings.has(id)) {
                    socket.emit('live_reading', {
                        channelId: id,
                        value: this.lastReadings.get(id),
                        timestamp: Date.now()
                    });
                }
            });
            
             socket.on('unsubscribe_channel', (channelId) => {
                socket.leave(`channel_${channelId}`);
            });
        });
    }

    broadcastReading(channelId, value) {
        // 1. Uložit do cache
        this.lastReadings.set(channelId, value);

        // 2. BEZPEČNOSTNÍ KONTROLA: Existuje už io?
        if (!this.io) {
            console.warn("Pozor: SocketService ještě není inicializován, ale data už chodí! (Data budou jen v DB)");
            return; // Ukončíme funkci, aby to nespadlo
        }

        // 3. ODESLÁNÍ
        //console.log(`SOCKET ODESÍLÁ: Kanál ${channelId}, Hodnota ${value}`);


        this.io.emit('live_reading', {  
            channelId: channelId,
            value: value,
            timestamp: Date.now()
        });
    }
}

module.exports = new SocketService();