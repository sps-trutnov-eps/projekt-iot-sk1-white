import { translateType } from './utils.js';

let mainChart = null;

window.currentChartChannelId = null;
window.currentChartRange = '24h';
window.currentChartData = [];
window.currentMetric = 'avg'; 
window.currentChartUnit = '';
let currentSensorName = ''; 
let currentSensorType = '';

let chartUpdateInterval = null;

export function startChartAutoUpdate() {
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
    }

    chartUpdateInterval = setInterval(() => {
        if (window.currentChartChannelId) {
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
                        maxTicksLimit: 12, // Můžeme nechat trochu víc popisků
                        maxRotation: 45, // Delší texty (s datem) se lehce natočí
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

    // V tooltipu vždy ukážeme celý popisek (aby bylo jasno, z jakého je to dne)
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

    // Definice toho, co je "výpadek", po kterém chceme napsat datum (zde 2 hodiny v milisekundách)
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

        // Logika pro zobrazení data v popisku osy X
        if (currentChartRange === '7d') {
            showDate = true; // U 7 dní ukazujeme datum pro jistotu pořád
        } else {
            if (prevDate === null) {
                showDate = true; // Úplně první bod v grafu dostane datum
            } else {
                const gapMs = date.getTime() - prevDate.getTime();
                // Pokud je v datech velká mezera NEBO se přehoupla půlnoc na další den
                if (gapMs > gapThresholdMs || date.getDate() !== prevDate.getDate()) {
                    showDate = true; 
                }
            }
        }

        // Pokud 'showDate' je true, přidáme do pole popisků datum i čas. Jinak jen čas.
        labels.push(showDate ? `${dateStr} ${timeStr}` : timeStr);

        processedData.avg.push(row.avg !== undefined ? row.avg : null);
        processedData.min.push(row.min !== undefined ? row.min : null);
        processedData.max.push(row.max !== undefined ? row.max : null);

        prevDate = date;
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
                data: processedData[config.dataKey],
                borderColor: config.color,
                backgroundColor: config.fill ? 'rgba(136, 108, 147, 0.1)' : 'transparent',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: config.fill,
                spanGaps: true // Toto zajistí, že čára prostě ignoruje chybějící data a naváže
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