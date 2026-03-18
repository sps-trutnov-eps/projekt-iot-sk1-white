import { initChart, updateChart, updateChartMetric } from './chartManager.js';
import { loadSensors } from './sensorManager.js';
import { fetchMcuInfo, initApiKeyListeners } from './mcuManager.js';
import { initModals, removeMetric } from './modalManager.js';
import { initLiveData } from './liveData.js';
import { initDeckConfig } from './deckManager.js';
import { getMcuId } from './utils.js';

// 1. GLOBÁLNÍ BRIDGE (Nezbytné pro události onclick v HTML)
window.updateChart = updateChart;
window.updateChartMetric = updateChartMetric;
window.removeMetric = removeMetric;
window.refreshSensors = loadSensors;

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

    await window.updateView(false);

    // Zjistíme roli MCU a podle ní zobrazíme správné sekce
    const mcuId = getMcuId();
    try {
        const res = await fetch('/mcu/get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: mcuId })
        });
        const data = await res.json();

        if (data.success && data.mcu && data.mcu.role === 'deck') {
            // Deck: skryj senzory/graf, zobraz deck config
            document.getElementById('sensorContent')?.classList.add('hidden');
            document.getElementById('sensorSidebar')?.classList.add('hidden');
            document.getElementById('deckConfigSection')?.classList.remove('hidden');
            await initDeckConfig();
        } else {
            // Sensor: normální zobrazení
            initChart();
            await initLiveData();
        }
    } catch (e) {
        // Fallback: sensor mode
        initChart();
        await initLiveData();
    }
});