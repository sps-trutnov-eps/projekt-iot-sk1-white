import { initChart, updateChart, updateChartMetric } from './chartManager.js';
import { loadSensors, fetchMcuInfo, initModals, removeMetric } from './sensorManager.js';
import { initLiveData } from './liveData.js';


// 1. GLOBÁLNÍ BRIDGE (Nezbytné pro onclick v HTML)
window.updateChart = updateChart;
window.updateChartMetric = updateChartMetric;
window.removeMetric = removeMetric;
window.refreshSensors = loadSensors;



window.updateView = async function(isBackground = false) {
    await fetchMcuInfo();
    await loadSensors(isBackground);
}

// main.js
const socket = io(); 

socket.on('connect', () => {
    console.log("✅ Socket připojen k serveru.");
    
    // Řekneme si o kanál 1
    console.log("📡 Odesílám žádost o kanál 1...");
    socket.emit('subscribe_channel', 1);
});

// TOTO JE TO NEJDŮLEŽITĚJŠÍ - "UŠI"
socket.on('live_reading', (data) => {
    console.log("🔥 PŘIŠLA DATA:", data);
    console.log("Hodnota:", data.value);
});


// 2. START
document.addEventListener('DOMContentLoaded', async () => {
    // Toast logika
    const msg = sessionStorage.getItem('toastMessage');
    if (msg && window.openToast) {
        window.openToast(msg, sessionStorage.getItem('toastSuccess') === 'true');
        sessionStorage.clear();
    }

    await initLiveData();

    initChart();
    initModals();
    await window.updateView(false);

});


