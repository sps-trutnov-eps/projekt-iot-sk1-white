import { translateType } from './utils.js';

let mainChart = null;
let chartUpdateInterval = null;

// ZMĚNA 1: Správná deklarace proměnných přes let (bez window.)
let currentChartChannelId = null;
let currentChartRange = '24h';
let currentChartData = [];
let currentMetric = 'avg'; 
let currentChartUnit = '';
let currentSensorName = ''; 
let currentSensorType = '';


export function startChartAutoUpdate() {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }

    chartUpdateInterval = setInterval(() => {
        if (currentChartChannelId) {
            console.log("Získávám nová data pro graf (minutový update)...");
            updateChart(); 
        }
    }, 60000); 
}

export function stopChartAutoUpdate() {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
        chartUpdateInterval = null;
    }
}


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
                x: { 
                    grid: { display: false }, 
                    ticks: { 
                        color: '#9aa092', 
                        font: { size: 10 }, 
                        maxTicksLimit: 12,
                        maxRotation: 45,
                        minRotation: 0
                    } 
                },
                y: { grid: { color: '#f2f3f1' }, ticks: { color: '#9aa092' } }
            },
            interaction: { intersect: false, mode: 'index' }
        }
    });
    startChartAutoUpdate();
}

export function renderChartData(data = null) {
    if (data) currentChartData = data;
    if (!mainChart || !currentChartData || currentChartData.length === 0) return;

    mainChart.options.plugins.tooltip.callbacks = {
        title: function(tooltipItems) {
            return tooltipItems[0].label;
        },
        label: function(context) {
            let label = context.dataset.label || '';
            if (label) label += ': ';
            if (context.parsed.y !== null) label += context.parsed.y + ' ' + (currentChartUnit || '');
            return label;
        }
    };

    const labels = [];
    const processedData = { avg: [], min: [], max: [] };
    let prevDate = null;

    const gapThresholdMs = currentChartRange === '7d' ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;

    currentChartData.forEach(row => {
        let dbTime = row.timestamp;
        
        if (typeof dbTime === 'string') {
            dbTime = dbTime.replace(' ', 'T');
            if (!dbTime.endsWith('Z')) dbTime += 'Z';
        }
        
        const date = new Date(dbTime);
        const timeStr = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });

        let showDate = false;

        if (currentChartRange === '7d') {
            showDate = true; 
        } else {
            if (prevDate === null) {
                showDate = true; 
            } else {
                const gapMs = date.getTime() - prevDate.getTime();
                if (gapMs > gapThresholdMs || date.getDate() !== prevDate.getDate()) {
                    showDate = true; 
                }
            }
        }

        labels.push(showDate ? `${dateStr} ${timeStr}` : timeStr);

        processedData.avg.push(row.avg !== undefined ? row.avg : null);
        processedData.min.push(row.min !== undefined ? row.min : null);
        processedData.max.push(row.max !== undefined ? row.max : null);

        prevDate = date;
    });

    mainChart.data.labels = labels;

    // Vytvoření datasetů při prvním načtení grafu
    if (mainChart.data.datasets.length === 0) {
        mainChart.data.datasets = [
            {
                label: 'Průměr',
                borderColor: '#886c93',
                backgroundColor: 'rgba(136, 108, 147, 0.1)',
                borderWidth: 2, tension: 0.4, pointRadius: 0, fill: true, spanGaps: true, data: []
            },
            {
                label: 'Minimum',
                borderColor: '#3b82f6',
                backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.4, pointRadius: 0, fill: false, spanGaps: true, data: []
            },
            {
                label: 'Maximum',
                borderColor: '#ef4444',
                backgroundColor: 'transparent',
                borderWidth: 2, tension: 0.4, pointRadius: 0, fill: false, spanGaps: true, data: []
            }
        ];
    }

    // ZMĚNA 2: Řešíme spárování hodnot spolehlivě přes pořadí v poli, ne přes nestandardní "id"
    const dataKeys = ['avg', 'min', 'max'];

    mainChart.data.datasets.forEach((dataset, index) => {
        const key = dataKeys[index]; // První je avg, druhý min, třetí max
        
        // Aktualizujeme data
        dataset.data = processedData[key];
        
        // Zobrazení / skrytí datasetu
        if (currentMetric === 'all' || currentMetric === key) {
            dataset.hidden = false;
        } else {
            dataset.hidden = true;
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
        if (radio.checked) { 
            currentMetric = radio.value; 
            break; 
        }
    }
    renderChartData();
}