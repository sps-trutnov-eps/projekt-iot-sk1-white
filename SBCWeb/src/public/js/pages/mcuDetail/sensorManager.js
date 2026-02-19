import { getMcuId, getSensorStyle, translateType } from './utils.js';
import { updateChart } from './chartManager.js';

export async function loadSensors(isBackground = false) {
    const listContainer = document.getElementById('sensorListContainer');
    const cardsContainer = document.getElementById('sensorCardsContainer');

    if (!listContainer || !cardsContainer) return;

    if (!isBackground) {
        listContainer.innerHTML = '<div class="p-4 text-center text-xs text-gray-400"><i class="fas fa-spinner fa-spin"></i> Načítám...</div>';
        cardsContainer.innerHTML = '<div class="col-span-1 md:col-span-2 text-center text-gray-400 py-4 text-xs"><i class="fas fa-spinner fa-spin mr-2"></i> Načítám karty...</div>';
    }

    try {
        const response = await fetch(`/sensor/device/${getMcuId()}`);
        const data = await response.json();

        if (data.success && data.sensors.length > 0) {
            listContainer.innerHTML = '';
            cardsContainer.innerHTML = '';

            data.sensors.forEach(sensor => {
                sensor.channels.forEach(channel => {
                    const style = getSensorStyle(channel.type);
                    const translated = translateType(channel.type);
                    
                    // Vykreslení do seznamu vlevo
                    const itemHtml = `
                        <div onclick="updateChart(null, '${channel.id}', '${channel.unit}', '${sensor.model}', '${translated}')" class="group flex items-center justify-between px-3 py-2.5 hover:bg-ash-grey-50 cursor-pointer border-b border-ash-grey-50 last:border-0">
                            <div class="flex items-center gap-2">
                                <div class="w-6 h-6 rounded bg-white flex items-center justify-center border shadow-sm text-xs">
                                    <i class="fas ${style.icon} ${style.color}"></i>
                                </div>
                                <p class="text-xs font-medium text-gray-700">${translated} <span class="text-[9px] text-gray-400">(${sensor.model})</span></p>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] text-silver-500">unit:</span>    
                                <span class="text-xs font-bold text-gray-800">${channel.unit} </span>
                            </div>
                        </div>`;
                    listContainer.insertAdjacentHTML('beforeend', itemHtml);

                    // Vykreslení kartičky
                    const displayValue = (channel.current_value !== null && channel.current_value !== undefined) 
                                         ? channel.current_value : '---';

                    const cardHtml = `
                        <div class="bg-white rounded-xl border border-ash-grey-200 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                            <div class="absolute top-0 left-0 w-full h-1 ${style.color.replace('text-', 'bg-')} opacity-75"></div>
                            
                            <div class="flex justify-between items-start mb-4 mt-1">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-ash-grey-50 flex items-center justify-center border border-ash-grey-100 shadow-inner text-lg">
                                        <i class="fas ${style.icon} ${style.color}"></i>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-bold text-midnight-violet-900">${translated}</h3>
                                        <p class="text-[10px] text-silver-500 font-medium tracking-wide uppercase">${sensor.model}</p>
                                    </div>
                                </div>
                                <div class="flex gap-3">
                                    <button onclick="updateChart(null, '${channel.id}', '${channel.unit}', '${sensor.model}', '${translated}')" title="Zobrazit graf" class="text-silver-300 hover:text-midnight-violet-500 transition-colors">
                                        <i class="fas fa-chart-line"></i>
                                    </button>
                                    <button onclick="deleteSensorHandler('${sensor.id}')" title="Smazat senzor" class="text-silver-300 hover:text-red-500 transition-colors">
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="mt-2 flex items-baseline gap-1.5">
                                <span id="card-value-${channel.id}" class="text-3xl font-black text-gray-800 tracking-tight transition-colors duration-300">${displayValue}</span>
                                <span class="text-sm font-bold text-silver-400">${channel.unit}</span>
                            </div>
                        </div>`;
                    cardsContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
            });

            // Auto-select prvního
            if (!window.currentChartChannelId) {
                const first = data.sensors.find(s => s.channels?.length > 0);
                if (first) updateChart(null, first.channels[0].id, first.channels[0].unit, first.model, translateType(first.channels[0].type));
            }
        } else {
            const emptyHtml = `
                <div class="flex flex-col items-center justify-center h-full py-10 bg-white text-silver-400">
                    <div class="w-12 h-12 bg-ash-grey-50 rounded-full flex items-center justify-center mb-3">
                        <i class="fas fa-inbox text-xl text-silver-300"></i>
                    </div>
                    <span class="text-xs font-medium">Seznam je prázdný</span>
                    <span class="text-[10px] text-silver-300 mt-1">Zatím žádná data</span>
                </div>`;
            listContainer.innerHTML = emptyHtml;
            cardsContainer.innerHTML = `<div class="col-span-1 md:col-span-2">${emptyHtml}</div>`;
        }
    } catch (e) { console.error(e); }
}

export async function deleteSensorHandler(sensorId) {
    if (!confirm('Opravdu chcete smazat tento senzor? Přijdete o veškerá naměřená data.')) return;
    try {
        const response = await fetch(`/sensor/${sensorId}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            if (window.openToast) window.openToast("Senzor smazán", true);
            if (window.updateView) window.updateView(); 
        } else {
            if (window.openToast) window.openToast(data.message, false);
        }
    } catch (error) {
        console.error(error);
    }
}