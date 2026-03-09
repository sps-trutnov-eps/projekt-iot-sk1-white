// pages/mcuDetail/sensorManager.js
import { getMcuId, getSensorStyle, translateType } from './utils.js';
import { calculateAndRenderTrend } from './trendManager.js';

function showSensorsLoadingState(listContainer, cardsContainer) {
    // Levé menu (seznam senzorů)
    listContainer.innerHTML = Array(3).fill(`
        <div class="flex items-center justify-between px-3 py-2.5 border-b border-ash-grey-50 dark:border-midnight-violet-800 animate-pulse">
            <div class="flex items-center gap-2 w-full">
                <div class="w-6 h-6 rounded bg-ash-grey-200 dark:bg-midnight-violet-700 shrink-0"></div>
                <div class="flex flex-col space-y-1 w-full">
                    <div class="h-3 bg-ash-grey-200 dark:bg-midnight-violet-700 rounded w-16"></div>
                    <div class="h-2 bg-ash-grey-100 dark:bg-midnight-violet-800 rounded w-12"></div>
                </div>
            </div>
            <div class="flex gap-1">
                <div class="w-6 h-6 rounded bg-ash-grey-100 dark:bg-midnight-violet-800"></div>
                <div class="w-6 h-6 rounded bg-ash-grey-100 dark:bg-midnight-violet-800"></div>
            </div>
        </div>
    `).join('');

    // Hlavní plocha (karty kanálů)
    cardsContainer.innerHTML = Array(4).fill(`
        <div class="bg-white dark:bg-midnight-violet-900 rounded-xl border border-ash-grey-200 dark:border-midnight-violet-800 p-5 shadow-sm min-h-[140px] animate-pulse">
            <div class="flex justify-between items-start mb-4 mt-1">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-ash-grey-100 dark:bg-midnight-violet-800"></div>
                    <div class="space-y-1">
                        <div class="h-3 bg-ash-grey-200 dark:bg-midnight-violet-700 rounded w-20"></div>
                        <div class="h-2 bg-ash-grey-100 dark:bg-midnight-violet-800 rounded w-12"></div>
                    </div>
                </div>
                <div class="flex gap-2">
                    <div class="w-6 h-6 rounded bg-ash-grey-100 dark:bg-midnight-violet-800"></div>
                    <div class="w-6 h-6 rounded bg-ash-grey-100 dark:bg-midnight-violet-800"></div>
                </div>
            </div>
            <div class="mt-4 flex items-baseline gap-1.5">
                <div class="h-8 bg-ash-grey-200 dark:bg-midnight-violet-700 rounded w-16"></div>
                <div class="h-4 bg-ash-grey-100 dark:bg-midnight-violet-800 rounded w-6"></div>
            </div>
        </div>
    `).join('');
}

export async function loadSensors(isBackground = false) {
    const listContainer = document.getElementById('sensorListContainer');
    const cardsContainer = document.getElementById('sensorCardsContainer');

    if (!listContainer || !cardsContainer) return;

    if (!isBackground) {
        showSensorsLoadingState(listContainer, cardsContainer);
    }

    try {
        const mcuId = getMcuId();
        const response = await fetch(`/sensor/device/${mcuId}`);
        const data = await response.json();

        if (data.success && data.sensors && data.sensors.length > 0) {
            listContainer.innerHTML = '';
            cardsContainer.innerHTML = '';

            let hasAnyChannels = false;

            data.sensors.forEach(sensor => {
                const sensorHtml = `
                    <div class="group flex items-center justify-between px-3 py-2.5 hover:bg-ash-grey-50 dark:hover:bg-midnight-violet-800 border-b border-ash-grey-50 dark:border-midnight-violet-800 last:border-0 transition-colors">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded bg-white dark:bg-midnight-violet-700 flex items-center justify-center border dark:border-midnight-violet-600 shadow-sm text-[10px] text-midnight-violet-500 dark:text-silver-300">
                                <i class="fas fa-microchip"></i>
                            </div>
                            <div class="flex flex-col">
                                <p class="text-[11px] font-bold text-midnight-violet-900 dark:text-silver-100 leading-tight uppercase">${sensor.model}</p>
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

                if (sensor.channels && Array.isArray(sensor.channels) && sensor.channels.length > 0) {
                    hasAnyChannels = true;
                    sensor.channels.forEach(channel => {
                        const style = getSensorStyle(channel.type);
                        const translated = translateType(channel.type);
                        
                        const displayValue = (channel.current_value !== null && channel.current_value !== undefined) 
                                             ? channel.current_value : '---';

                        const cardHtml = `
                            <div class="bg-white dark:bg-midnight-violet-900 rounded-xl border border-ash-grey-200 dark:border-midnight-violet-800 p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                                <div class="absolute top-0 left-0 w-full h-1 ${style.color.replace('text-', 'bg-')} opacity-75"></div>
                                
                                <div class="flex justify-between items-start mb-4 mt-1">
                                    <div class="flex items-center gap-3">
                                        <div class="w-10 h-10 rounded-full bg-ash-grey-50 dark:bg-midnight-violet-800 flex items-center justify-center border border-ash-grey-100 dark:border-midnight-violet-700 shadow-inner text-lg">
                                            <i class="fas ${style.icon} ${style.color}"></i>
                                        </div>
                                        <div>
                                            <h3 class="text-sm font-bold text-midnight-violet-900 dark:text-silver-100">${translated}</h3>
                                            <p class="text-[10px] text-silver-500 dark:text-silver-400 font-medium tracking-wide uppercase">${sensor.model}</p>
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
                                    <span id="card-value-${channel.id}" class="text-3xl font-black text-gray-800 dark:text-silver-100 tracking-tight">${displayValue}</span>
                                    <span class="text-sm font-bold text-silver-400">${channel.unit}</span>
                                </div>

                                <div id="card-trend-text-${channel.id}" class="absolute bottom-3 right-4 flex items-center gap-1.5 text-silver-300"></div>
                            </div>`;
                        cardsContainer.insertAdjacentHTML('beforeend', cardHtml);
                        calculateAndRenderTrend(channel.id);
                    });
                }
            });

            // Co když senzory existují, ale nemají vůbec žádné kanály?
            if (!hasAnyChannels) {
                cardsContainer.innerHTML = `
                    <div class="col-span-full flex items-center justify-center p-6 border-2 border-dashed border-ash-grey-200 dark:border-midnight-violet-800 rounded-xl text-ash-grey-400 dark:text-silver-500 bg-white/50 dark:bg-midnight-violet-900/30 min-h-[160px]">
                        <span class="text-xs font-semibold">U senzorů zatím nebyly vytvořeny žádné kanály.</span>
                    </div>`;
            }

        } else {
            // Prázdný stav
            listContainer.innerHTML = `
                <div class="p-8 flex flex-col items-center justify-center text-silver-400">
                    <i class="fas fa-microchip mb-2 text-xl opacity-50"></i>
                    <p class="text-[10px] italic">Zatím bez senzorů</p>
                </div>`;
            
            cardsContainer.innerHTML = `
                <div class="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <div class="w-16 h-16 bg-ash-grey-100 dark:bg-midnight-violet-800 rounded-full flex items-center justify-center mb-4 text-ash-grey-300 dark:text-silver-500">
                        <i class="fas fa-inbox text-2xl"></i>
                    </div>
                    <p class="text-sm font-bold text-ash-grey-500 dark:text-silver-400">Senzory nenalezeny</p>
                    <p class="text-xs text-ash-grey-400 dark:text-silver-500 mt-1">Zaregistrujte do tohoto zařízení první senzor.</p>
                </div>`;
        }
    } catch (e) { 
        console.error("Chyba loadSensors:", e);
        listContainer.innerHTML = '<div class="p-4 text-center text-red-500 text-[10px] font-medium">Chyba načítání</div>';
        cardsContainer.innerHTML = `
            <div class="col-span-full py-10 text-center">
                <p class="text-red-400 text-sm font-medium"><i class="fas fa-exclamation-triangle mr-2"></i>Chyba při stahování dat senzorů</p>
            </div>`;
    }
}