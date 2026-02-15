import { getMcuId } from './utils.js';

export class LiveDataManager {
    constructor(updateInterval = 5000) {
        this.interval = null;
        this.updateInterval = updateInterval;
        this.container = document.getElementById('sensor-cards-container');
        
        // Mapování stylů podle typu senzoru
        this.styles = {
            'temperature': { icon: 'fa-thermometer-half', color: 'vintage-grape', border: 'hover:border-vintage-grape-300', bg: 'bg-vintage-grape-50' },
            'humidity':    { icon: 'fa-tint',             color: 'blue',         border: 'hover:border-blue-300',         bg: 'bg-blue-50' },
            'pressure':    { icon: 'fa-tachometer-alt',   color: 'emerald',      border: 'hover:border-emerald-300',      bg: 'bg-emerald-50' },
            'default':     { icon: 'fa-microchip',        color: 'silver',       border: 'hover:border-silver-300',       bg: 'bg-silver-50' }
        };
    }

    start() {
        if (this.interval) return;
        this.refreshData();
        this.interval = setInterval(() => this.refreshData(), this.updateInterval);
    }

    async refreshData() {
        try {
            const mcuId = getMcuId();
            const res = await fetch(`/readings/latest-all`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mcuId })
            });
            const data = await res.json();
            if (data.success) {
                this.renderOrUpdate(data.readings);
            }
        } catch (err) { console.error("Live Update Error:", err); }
    }

    renderOrUpdate(readings) {
        readings.forEach(reading => {
            let card = document.getElementById(`card-sensor-${reading.sensor_id}`);
            
            if (!card) {
                // Pokud kartička neexistuje, vytvoříme ji
                this.createCard(reading);
            } else {
                // Pokud existuje, jen updatujeme hodnoty
                this.updateCardValues(reading);
            }
        });
    }

    createCard(reading) {
        const style = this.styles[reading.type] || this.styles.default;
        const cardHtml = `
            <div id="card-sensor-${reading.sensor_id}" class="bg-white p-4 rounded-xl border border-ash-grey-200 shadow-sm flex flex-col justify-between relative overflow-hidden group ${style.border} transition-all">
                <div class="flex justify-between items-start z-10">
                    <span class="text-[10px] font-bold text-silver-500 uppercase tracking-widest">${reading.name}</span>
                    <i class="fas ${style.icon} text-${style.color}-200 text-xl group-hover:text-${style.color}-500 transition-colors"></i>
                </div>
                <div class="flex items-baseline gap-1 mt-1 z-10">
                    <span id="live-avg-${reading.sensor_id}" class="text-3xl font-bold text-midnight-violet-900">${reading.avg.toFixed(1)}</span>
                    <span class="text-sm text-silver-600">${reading.unit}</span>
                </div>
                <div class="flex gap-3 mt-2 z-10">
                    <div class="text-[9px] text-silver-400 uppercase font-bold">Min: <span id="live-min-${reading.sensor_id}" class="text-gray-600">${reading.min.toFixed(1)}</span></div>
                    <div class="text-[9px] text-silver-400 uppercase font-bold">Max: <span id="live-max-${reading.sensor_id}" class="text-gray-600">${reading.max.toFixed(1)}</span></div>
                </div>
                <i class="fas ${style.icon} absolute -bottom-4 -right-2 text-6xl text-${style.color}-50 opacity-50 z-0"></i>
            </div>
        `;
        this.container.insertAdjacentHTML('beforeend', cardHtml);
    }

    updateCardValues(reading) {
        const avgEl = document.getElementById(`live-avg-${reading.sensor_id}`);
        const minEl = document.getElementById(`live-min-${reading.sensor_id}`);
        const maxEl = document.getElementById(`live-max-${reading.sensor_id}`);

        if (avgEl) {
            const oldVal = parseFloat(avgEl.textContent);
            avgEl.textContent = reading.avg.toFixed(1);
            
            // Efekt při změně hodnoty
            if (oldVal !== parseFloat(reading.avg.toFixed(1))) {
                avgEl.classList.add('scale-110', 'text-vintage-grape-600');
                setTimeout(() => avgEl.classList.remove('scale-110', 'text-vintage-grape-600'), 400);
            }
        }
        if (minEl) minEl.textContent = reading.min.toFixed(1);
        if (maxEl) maxEl.textContent = reading.max.toFixed(1);
    }
}

export const liveData = new LiveDataManager();