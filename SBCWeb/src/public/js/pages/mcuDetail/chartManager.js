import { translateType } from './utils.js';

let mainChart = null;

window.currentChartChannelId = null;
window.currentChartRange = '24h';
window.currentChartData = [];
window.currentMetric = 'avg'; 
window.currentChartUnit = '';
let currentSensorName = ''; 
let currentSensorType = '';

export function initChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(136, 108, 147, 0.4)');
    gradient.addColorStop(1, 'rgba(136, 108, 147, 0.0)');

    mainChart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            layout: { padding: { top: 10, right: 20, bottom: 10, left: 10 } },
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: true } 
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9aa092', font: { size: 10 }, maxTicksLimit: 8 } },
                y: { grid: { color: '#f2f3f1' }, ticks: { color: '#9aa092' } }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
}

export function renderChartData(data = null) {
    if (data) currentChartData = data;
    if (!mainChart || !currentChartData || currentChartData.length === 0) return;

    // Tooltip fix s jednotkou
    mainChart.options.plugins.tooltip.callbacks = {
        label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += context.parsed.y + ' ' + (currentChartUnit || '');
            return label;
        }
    };

    const labels = currentChartData.map(row => {
        const date = new Date(row.timestamp);
        return currentChartRange === '7d' 
            ? date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' }) + ' ' + date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    });

    mainChart.data.labels = labels;
    mainChart.data.datasets = [];

    const datasetsConfigs = {
        avg: { label: 'Průměr', color: '#886c93', dataKey: 'avg', fill: true },
        min: { label: 'Minimum', color: '#3b82f6', dataKey: 'min', fill: false },
        max: { label: 'Maximum', color: '#ef4444', dataKey: 'max', fill: false }
    };

    Object.keys(datasetsConfigs).forEach(key => {
        if (currentMetric === key || currentMetric === 'all') {
            const config = datasetsConfigs[key];
            mainChart.data.datasets.push({
                label: config.label,
                data: currentChartData.map(row => row[config.dataKey]),
                borderColor: config.color,
                backgroundColor: config.fill ? 'rgba(136, 108, 147, 0.1)' : 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: config.fill
            });
        }
    });

    mainChart.update();
}

export async function updateChart(range = null, channelId = null, unit = null, sensorModel = null, sensorType = null) {
    if (range) currentChartRange = range;
    if (channelId) currentChartChannelId = channelId;
    if (unit) currentChartUnit = unit;
    if (sensorModel) currentSensorName = sensorModel;
    if (sensorType) currentSensorType = sensorType;

    const titleEl = document.getElementById('chartTitle');
    if (titleEl && currentSensorName && currentSensorType) {
        titleEl.textContent = `${currentSensorName} - ${currentSensorType}`;
    }

    if (!currentChartChannelId) return;

    try {
        const response = await fetch('/readings/history', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId: currentChartChannelId, range: currentChartRange })
        });
        const result = await response.json();
        if (result.success) renderChartData(result.data);
    } catch (error) {
        console.error("Chyba při stahování grafu:", error);
    }
}

export function updateChartMetric() {
    const radios = document.getElementsByName('chartMetric');
    for (const radio of radios) {
        if (radio.checked) { currentMetric = radio.value; break; }
    }
    renderChartData();
}