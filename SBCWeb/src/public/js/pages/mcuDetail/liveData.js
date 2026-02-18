import { updateChartMetric } from './chartManager.js'; 
import { getMcuId } from './utils.js'; // Předpokládám, že zde máš tu funkci

const socket = io(); 
const activeSubscriptions = new Set(); 

export async function initLiveData() {
    console.log("🔌 Inicializace LiveData...");

    // 1. Zjistíme kontext
    const mcuId = getMcuId();
    let apiUrl;
    
    // 2. Rozhodneme, jaká data chceme
    if (mcuId && !isNaN(parseInt(mcuId))) {
        console.log(`🎯 Režim: Detail MCU (ID: ${mcuId}) - Filtruji senzory...`);
        // Pozor na lomítko na začátku!
        apiUrl = `/sensor/device/${mcuId}`; 
    } else {
        console.log(`🌍 Režim: Dashboard - Odebírám vše`);
        // Pokud jsme na dashboardu, chceme asi vidět všechna data
        apiUrl = `/sensor/all_data`; 
    }

    // 3. Stáhneme seznam kanálů k odběru
    try {
        console.log(`📡 Stahuji konfiguraci z: ${apiUrl}`);
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error(`Chyba API: ${response.statusText}`);
        
        const sensors = await response.json();
        
        // Pokud API vrátí prázdné pole, nic se nestane
        if (!sensors || sensors.length === 0) {
            console.warn("⚠️ Žádné senzory k odběru.");
            return;
        }

        // 4. Registrace odběrů (Tady probíhá to filtrování)
        // Projdeme jen ty senzory, které nám vrátil backend pro toto konkrétní MCU
        sensors.forEach(sensor => {
            if (sensor.channels && Array.isArray(sensor.channels)) {
                sensor.channels.forEach(channel => {
                    subscribeToChannel(channel.id);
                });
            }
        });

    } catch (error) {
        console.error("❌ Chyba při načítání senzorů pro LiveData:", error);
    }
}

// --- POMOCNÉ FUNKCE ---

function subscribeToChannel(channelId) {
    if (!activeSubscriptions.has(channelId)) {
        console.log(`✅ Subscribe: Kanál ID ${channelId}`);
        socket.emit('subscribe_channel', channelId);
        activeSubscriptions.add(channelId);
    }
}

// --- NASLOUCHÁNÍ SOCKETŮM (DŮLEŽITÉ!) ---

socket.on('connect', () => {
    console.log(`🟢 Socket připojen (ID: ${socket.id})`);
});

// Tuhle část jsi tam neměl, bez ní data chodí, ale graf se nehne!
socket.on('live_reading', (data) => {
    // console.log(`🔥 Data: Kanál ${data.channelId} -> ${data.value}`);
    
    // Tady se volá aktualizace grafiky jen pro odebírané kanály
    updateChartMetric(data.channelId, data.value);
});

socket.on('disconnect', () => {
    console.warn("🔴 Socket odpojen");
    activeSubscriptions.clear(); 
});