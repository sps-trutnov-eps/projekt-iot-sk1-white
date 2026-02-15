import { initChart, updateChart, updateChartMetric } from './chartManager.js';
import { loadSensors, fetchMcuInfo, initModals, removeMetric } from './sensorManager.js';
import { liveData } from './liveDataManager.js';
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

    liveData.start();

    setInterval(() => window.updateView(true), 5000);
});