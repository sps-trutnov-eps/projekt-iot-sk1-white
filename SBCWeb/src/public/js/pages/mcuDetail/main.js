import { initChart, updateChart, updateChartMetric } from './chartManager.js';
import { loadSensors, fetchMcuInfo, initModals, removeMetric } from './sensorManager.js';

// 1. GLOBÁLNÍ BRIDGE (Nezbytné pro onclick v HTML)
window.updateChart = updateChart;
window.updateChartMetric = updateChartMetric;
window.removeMetric = removeMetric;
window.refreshSensors = loadSensors;

window.updateView = async function(isBackground = false) {
    await fetchMcuInfo();
    await loadSensors(isBackground);
}

// 2. START
document.addEventListener('DOMContentLoaded', async () => {
    // Toast logika
    const msg = sessionStorage.getItem('toastMessage');
    if (msg && window.openToast) {
        window.openToast(msg, sessionStorage.getItem('toastSuccess') === 'true');
        sessionStorage.clear();
    }

    initChart();
    initModals();
    await window.updateView(false);

    setInterval(() => window.updateView(true), 5000);
});


// Připojení
const socket = io('http://localhost:3000'); // Upravte port, pokud je jiný

// 1. Ověření připojení
socket.on('connect', () => {
    console.log("✅ WebSocket připojen! ID:", socket.id);
    
    // DŮLEŽITÉ: Musíte si říct o data, jinak server mlčí!
    // Zkuste si říct o kanál ID 1 (nebo jiné ID, které máte v DB)
    console.log("📡 Odesílám žádost o kanál 1...");
    socket.emit('subscribe_channel', 1);
});

// 2. Chytání chyb
socket.on('connect_error', (err) => {
    console.error("❌ Chyba připojení:", err.message);
});

// 3. Příjem dat
socket.on('live_reading', (data) => {
    console.log("🔥 PŘIŠLA DATA:", data);
    console.log("Hodnota:", data.value);
});