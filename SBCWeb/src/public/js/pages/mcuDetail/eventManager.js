import { getMcuId } from './utils.js';

/**
 * Inicializace event manageru - spustí sockety a načte historii
 */
export async function initEventManager(socket) {
    const mcuId = getMcuId();
    const feedContainer = document.getElementById('event-feed');
    
    if (!mcuId || !feedContainer) return;

    // 1. Načtení historie z API
    await fetchEventHistory(mcuId);

    // 2. Naslouchání na živé eventy (WebSockety)
    if (socket) {
        socket.off('new_event'); // Prevence duplicitního naslouchání
        socket.on('new_event', (payload) => {
            if (payload.mcuId == mcuId) {
                renderEventLog(payload, true); // true = přidat nahoru (prepend)
            }
        });
    }
}

/**
 * Načte historii z databáze přes Controller
 */
async function fetchEventHistory(mcuId) {
    const feedContainer = document.getElementById('event-feed');
    
    try {
        const response = await fetch(`/event/mcu/${mcuId}`);
        const data = await response.json();

        if (data.success && data.events) {
            // Vymažeme statický "Systém inicializován"
            feedContainer.innerHTML = ''; 

            if (data.events.length === 0) {
                feedContainer.innerHTML = '<p class="text-[10px] text-silver-400 text-center py-4">Žádné události v historii.</p>';
                return;
            }

            // Vykreslíme historii (starší záznamy dolů)
            data.events.forEach(event => {
                renderEventLog(event, false); 
            });
        }
    } catch (error) {
        console.error("Chyba při načítání historie eventů:", error);
    }
}

/**
 * Vykreslí jeden řádek logu do HTML
 * @param {Object} event - data eventu
 * @param {Boolean} isNew - zda jde o live zprávu (půjde nahoru)
 */
function renderEventLog(event, isNew = false) {
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;

    // Nastavení ikon a barev podle tvého designu
    let iconClass = 'fa-info';
    let iconColor = 'text-blue-500';
    let bgColor = 'bg-blue-50';

    if (event.type === 'warn') {
        iconClass = 'fa-exclamation-triangle';
        iconColor = 'text-yellow-500';
        bgColor = 'bg-yellow-50';
    } else if (event.type === 'alert') {
        iconClass = 'fa-plug-circle-xmark';
        iconColor = 'text-red-500';
        bgColor = 'bg-red-50';
    } else if (event.type === 'info') {
        iconClass = 'fa-wifi';
        iconColor = 'text-green-500';
        bgColor = 'bg-green-50';
    }

    // Formátování času
    const date = new Date(event.timestamp.replace(' ', 'T') + (event.timestamp.includes('Z') ? '' : 'Z'));
    const timeStr = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const logHtml = `
        <div class="flex gap-3 items-start animate-fade-in">
            <div class="w-7 h-7 rounded-full ${bgColor} flex items-center justify-center shrink-0 mt-0.5">
                <i class="fas ${iconClass} text-[10px] ${iconColor}"></i>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-800">${event.message}</p>
                <span class="text-[10px] text-silver-400">${timeStr}</span>
            </div>
        </div>
    `;

    if (isNew) {
        feedContainer.insertAdjacentHTML('afterbegin', logHtml);
    } else {
        feedContainer.insertAdjacentHTML('beforeend', logHtml);
    }
}