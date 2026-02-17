// services/SocketService.js

class SocketService {
    constructor() {
        this.io = null;
        // Paměť pro poslední hodnoty: { channelId: value }
        // Toto je oddělené od agregačního bufferu v MeasurementService!
        this.lastReadings = new Map(); 
    }

    // Inicializace (zavoláme v app.js nebo server.js)
    init(io) {
        this.io = io;
        
        this.io.on('connection', (socket) => {
            console.log(`Socket připojen: ${socket.id}`);

            // Když klient "vleze" na detail grafu, chce hned vidět číslo
            socket.on('subscribe_channel', (channelId) => {
                const id = parseInt(channelId);
                socket.join(`channel_${id}`);
                
                // Pokud máme v RAM poslední hodnotu, pošleme ji hned
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

    // Tuto metodu budeme volat z MeasurementService
    broadcastReading(channelId, value) {
        // 1. Uložit do cache pro nové příchozí
        this.lastReadings.set(channelId, value);

        // 2. Poslat všem, kdo poslouchají tento kanál
        if (this.io) {
            this.io.to(`channel_${channelId}`).emit('live_reading', {
                channelId: channelId,
                value: value,
                timestamp: Date.now()
            });
        }
    }
}

// Exportujeme instanci (Singleton), aby byla data sdílená
module.exports = new SocketService();