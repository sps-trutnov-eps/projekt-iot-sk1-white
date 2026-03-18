import { initChart, updateChart, updateChartMetric } from './chartManager.js';
import { loadSensors } from './sensorManager.js';
import { fetchMcuInfo, initApiKeyListeners } from './mcuManager.js';
import { initModals, removeMetric } from './modalManager.js';
import { initLiveData } from './liveData.js';
import { initFlashModal, openFlashModal } from './flashManager.js';
import { initDeckManager, loadDeckConfig } from './deckManager.js';

// 1. GLOBÁLNÍ BRIDGE (Nezbytné pro události onclick v HTML)
window.updateChart = updateChart;
window.updateChartMetric = updateChartMetric;
window.removeMetric = removeMetric;
window.refreshSensors = loadSensors;
window.openFlashModal = openFlashModal;
window.loadDeckConfig = loadDeckConfig;

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
    initApiKeyListeners();
    initModals();
    initFlashModal();
    initDeckManager();
    initChart();

    await window.updateView(false);

    // WebSockety připojíme jako poslední, aby prvky v HTML už existovaly
    await initLiveData();
});
