// liveData.js

// Tvoje metoda pro získání ID z URL (např. /mcu/detail/5 -> vrátí "5")
export function getMcuId() {
    return window.location.pathname.split('/').pop();
}

export async function initLiveData() {
    const socket = io(); 

    socket.on('connect', () => {
        console.log("%c🔌 WebSocket připojen!", "color: green; font-weight: bold;");
        
        // 1. Získáme ID konkrétního MCU
        const currentMcuId = getMcuId();
        
        // 2. Pošleme serveru žádost o připojení do místnosti pro toto konkrétní MCU
        socket.emit('subscribe_mcu', currentMcuId); 
        console.log(`🚪 Přihlašuji se k odběru dat pro MCU ID: ${currentMcuId}`);
    });

    // 3. Nasloucháme na nová naměřená data
    socket.on('live_reading', (payload) => {
        console.log("📡 Nová LIVE data pro toto MCU:");
        console.log(`Kanál: ${payload.channelId} | Hodnota: ${payload.value}`);
        
        // Tady pak můžeš zavolat např. updateChart(payload.channelId, payload.value)
    });

    // 4. (Bonus) Můžeš rovnou poslouchat i na status, který jsi přidal do SocketService
    socket.on('mcu_status', (payload) => {
        console.log(`⏱️ Status MCU aktualizován. Naposledy viděno:`, payload.lastSeen);
    });

    socket.on('disconnect', () => {
        console.log("%c❌ WebSocket odpojen", "color: red;");
    });
}