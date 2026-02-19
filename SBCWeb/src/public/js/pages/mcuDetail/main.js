import { initChart, updateChart, updateChartMetric } from './chartManager.js';
import { loadSensors, deleteSensorHandler } from './sensorManager.js';
import { fetchMcuInfo, initApiKeyListeners } from './mcuManager.js';
import { initModals, removeMetric } from './modalManager.js';
import { initLiveData } from './liveData.js';

// 1. GLOBÁLNÍ BRIDGE (Nezbytné pro události onclick v HTML)
window.updateChart = updateChart;
window.updateChartMetric = updateChartMetric;
window.removeMetric = removeMetric;
window.refreshSensors = loadSensors;
window.deleteSensorHandler = deleteSensorHandler;

// Centrální funkce pro překreslení dat (volá se např. po přidání/smazání senzoru)
window.updateView = async function(isBackground = false) {
    await fetchMcuInfo();
    await loadSensors(isBackground);
}

// 2. START APLIKACE
document.addEventListener('DOMContentLoaded', async () => {
    // Toast logika (např. po přesměrování z jiné stránky)
    const msg = sessionStorage.getItem('toastMessage');
    if (msg && window.openToast) {
        window.openToast(msg, sessionStorage.getItem('toastSuccess') === 'true');
        sessionStorage.clear();
    }

    // Inicializace
    initApiKeyListeners(); // Přidáno pro klíč
    initModals();
    initChart();

    await window.updateView(false); // Načtení dat (MCU info + Seznam senzorů)
    
    // WebSockety připojíme jako poslední, aby prvky v HTML už existovaly
    await initLiveData();
});