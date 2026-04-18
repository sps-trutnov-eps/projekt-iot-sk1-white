const SocketService = require('./socketService');
const DashboardService = require('../services/dashboardService');

const DEMO_MODE = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

class WebSocketHandler {

    static init(io, sessionMiddleware) {
        SocketService.init(io);

        // V DEMO_MODE napojíme express-session na Socket.io engine, abychom měli req.session.id
        if (DEMO_MODE && sessionMiddleware) {
            io.engine.use(sessionMiddleware);
        }

        io.on('connection', (socket) => {

            // V demo módu: socket joinne svoji session room a každý event handler
            // se obalí do ALS contextu (per-session DB).
            let demoSessionId = null;
            let demoEntry = null;
            if (DEMO_MODE) {
                const req = socket.request;
                demoSessionId = req && req.session && req.session.id;
                if (demoSessionId) {
                    socket.join(`s:${demoSessionId}`);
                    const sessionStore = require('../demo/sessionStore');
                    demoEntry = sessionStore.get(demoSessionId);
                }
            }

            const wrap = (fn) => {
                if (!DEMO_MODE || !demoSessionId) return fn;
                const { run } = require('../demo/sessionContext');
                return (...args) => {
                    const sessionStore = require('../demo/sessionStore');
                    const entry = sessionStore.get(demoSessionId) || demoEntry;
                    if (!entry) return;
                    run({ db: entry.db, sessionId: demoSessionId }, () => fn(...args));
                };
            };

            // === ROUTA 1: Správa místností (Rooms) ===
            socket.on('subscribe_mcu', wrap((mcuId) => {
                const roomName = `mcu_${mcuId}`;
                socket.join(roomName);
            }));

            socket.on('subscribe_all', wrap(() => {
                socket.join('all_data');
            }));

            socket.on('unsubscribe_mcu', wrap((mcuId) => {
                socket.leave(`mcu_${mcuId}`);
            }));

            socket.on('unsubscribe_all', wrap(() => {
                socket.leave('all_data');
            }));

            // === ROUTA 2: Žádosti o data (Dashboard) ===
            socket.on('request_dashboard_stats', wrap(() => {
                try {
                    const stats = DashboardService.getDashboardStats();
                    socket.emit('dashboard_stats_update', stats);
                } catch (error) {
                    console.error('[Dashboard ERROR] Výpočet statistik selhal:', error);
                }
            }));

            socket.on('disconnect', () => {});
        });
    }
}

module.exports = WebSocketHandler;
