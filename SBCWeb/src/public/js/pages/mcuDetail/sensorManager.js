import { getMcuId, getSensorStyle, translateType } from './utils.js';
// import { updateChart } from './chartManager.js';

export async function loadSensors(isBackground = false) {
    const listContainer = document.getElementById('sensorListContainer');
    const cardsContainer = document.getElementById('sensorCardsContainer');

    if (!listContainer || !cardsContainer) return;

    if (!isBackground) {
        listContainer.innerHTML = '<div class="p-4 text-center text-xs text-gray-400"><i class="fas fa-spinner fa-spin"></i></div>';
    }

    try {
        const mcuId = getMcuId();
        const response = await fetch(`/sensor/device/${mcuId}`);
        const data = await response.json();

        if (data.success && data.sensors && data.sensors.length > 0) {
            listContainer.innerHTML = '';
            cardsContainer.innerHTML = '';

            data.sensors.forEach(sensor => {
                const sensorHtml = `
                    <div class="group flex items-center justify-between px-3 py-2.5 hover:bg-ash-grey-50 border-b border-ash-grey-50 last:border-0 transition-colors">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-white flex items-center justify-center border shadow-sm text-[10px] text-midnight-violet-500">
                                <i class="fas fa-microchip"></i>
                            </div>
                            <div class="flex flex-col">
                                <p class="text-[11px] font-bold text-midnight-violet-900 leading-tight uppercase">${sensor.model}</p>
                                <p class="text-[9px] text-silver-400 font-medium">Počet kanálů: ${sensor.channels ? sensor.channels.length : 0}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="window.openAddChannelModal('${sensor.id}', '${sensor.model}')" title="Přidat kanál" class="w-7 h-7 flex items-center justify-center rounded-lg text-silver-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all">
                                <i class="fas fa-plus text-[10px]"></i>
                            </button>
                            <button onclick="window.openDeleteSensorModal('${sensor.id}')" title="Smazat senzor" class="w-7 h-7 flex items-center justify-center rounded-lg text-silver-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                <i class="fas fa-trash-alt text-[10px]"></i>
                            </button>
                        </div>
                    </div>`;
                
                listContainer.insertAdjacentHTML('beforeend', sensorHtml);

                if (sensor.channels && Array.isArray(sensor.channels)) {
                    sensor.channels.forEach(channel => {
                        const style = getSensorStyle(channel.type);
                        const translated = translateType(channel.type);
                        
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
                                    <div class="flex gap-2">
                                        <button onclick="window.openThresholdModal('${channel.id}', '${translated}')" title="Nastavit limity" class="w-7 h-7 flex items-center justify-center rounded-lg text-silver-300 hover:text-yellow-500 hover:bg-yellow-50 transition-all">
                                            <i class="fas fa-sliders-h text-xs"></i>
                                        </button>
                                        <button onclick="window.updateChart(null, '${channel.id}', '${channel.unit}', '${sensor.model}', '${translated}')" title="Zobrazit graf" class="w-7 h-7 flex items-center justify-center rounded-lg text-silver-300 hover:text-midnight-violet-500 hover:bg-midnight-violet-50 transition-all">
                                            <i class="fas fa-chart-line text-xs"></i>
                                        </button>
                                        <button onclick="window.openDeleteChannelModal('${channel.id}')" title="Smazat kanál" class="w-7 h-7 flex items-center justify-center rounded-lg text-silver-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                            <i class="fas fa-trash-alt text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="mt-2 flex items-baseline gap-1.5">
                                    <span id="card-value-${channel.id}" class="text-3xl font-black text-gray-800 tracking-tight">${displayValue}</span>
                                    <span class="text-sm font-bold text-silver-400">${channel.unit}</span>
                                </div>
                            </div>`;
                        cardsContainer.insertAdjacentHTML('beforeend', cardHtml);
                    });
                }
            });

        } else {
            listContainer.innerHTML = '<div class="p-8 text-center text-[10px] text-silver-400 italic">Žádné senzory</div>';
            cardsContainer.innerHTML = '<div class="col-span-2 py-10 text-center text-silver-400">Zatím nebyl přidán žádný senzor.</div>';
        }
    } catch (e) { 
        console.error("Chyba loadSensors:", e);
        listContainer.innerHTML = '<div class="p-4 text-red-500 text-[10px]">Chyba načítání</div>';
    }
}