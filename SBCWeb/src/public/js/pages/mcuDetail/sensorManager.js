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
                    
                    // Seznam vlevo (ponecháno beze změny)
                    const itemHtml = `...`; // (zkráceno pro přehlednost, zůstává stejné)
                    listContainer.insertAdjacentHTML('beforeend', itemHtml);

                    // Vykreslení kartičky s tlačítkem pro limity
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
                                    <button onclick="openThresholdModal('${channel.id}', '${translated}')" title="Nastavit limity" class="text-silver-300 hover:text-yellow-500 transition-colors">
                                        <i class="fas fa-sliders-h"></i>
                                    </button>
                                    
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

            if (!window.currentChartChannelId) {
                const first = data.sensors.find(s => s.channels?.length > 0);
                if (first) updateChart(null, first.channels[0].id, first.channels[0].unit, first.model, translateType(first.channels[0].type));
            }
        } else {
            // ... prázdný stav
        }
    } catch (e) { console.error(e); }
}

// Funkce pro otevření modalu (přidej do window, aby byla dostupná z HTML)
window.openThresholdModal = function(channelId, label) {
    console.log(`Otevírám nastavení limitů pro kanál: ${channelId}`);
    // Tady zavoláš svůj modal manager
    if (window.Modal && window.Modal.get('threshold')) {
        const modal = window.Modal.get('threshold');
        document.getElementById('thresholdChannelId').value = channelId;
        document.getElementById('thresholdLabel').textContent = label;
        modal.open();
    }
};

export async function deleteSensorHandler(sensorId) { /* ... beze změny */ }