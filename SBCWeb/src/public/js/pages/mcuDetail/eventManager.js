// public/js/pages/mcuDetail/eventManager.js
import { getMcuId } from './utils.js';

/**
 * Zobrazí načítací animaci (skeleton) než přijdou data ze serveru
 */
function showEventLoadingState() {
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;

    feedContainer.innerHTML = Array(4).fill(`
        <div class="flex gap-3 items-start animate-pulse">
            <div class="w-7 h-7 rounded-full bg-ash-grey-200 shrink-0"></div>
            <div class="space-y-1.5 w-full mt-1">
                <div class="h-3 bg-ash-grey-200 rounded w-full"></div>
                <div class="h-2 bg-ash-grey-100 rounded w-16"></div>
            </div>
        </div>
    `).join('');
}

/**
 * Hlavní inicializační funkce, kterou voláš z main.js
 */
export async function initEventManager(socket) {
    const mcuId = getMcuId();
    if (!mcuId) return;

    // 1. Zobrazit skeleton
    showEventLoadingState();

    // 2. Načtení historie z API
    await fetchEventHistory(mcuId);

    // 3. Naslouchání na živé eventy ze socketů
    if (socket) {
        // Vypneme předchozí listenery, abychom zamezili duplikacím při přepínání
        socket.off('new_event'); 
        socket.on('new_event', (payload) => {
            // Ověříme, že event patří k tomuto konkrétnímu MCU
            if (payload.mcuId == mcuId) {
                renderEventLog(payload, true); // true = je to nový live event, dej ho nahoru
            }
        });
    }
}

/**
 * Stáhne historii logů z databáze
 */
async function fetchEventHistory(mcuId) {
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;
    
    try {
        const response = await fetch(`/event/mcu/${mcuId}`);
        const data = await response.json();

        if (data.success && data.events) {
            // Smažeme načítací skeleton
            feedContainer.innerHTML = ''; 

            if (data.events.length === 0) {
                // Prázdný stav, pokud neexistují žádné logy
                feedContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 text-center" id="empty-events-state">
                        <i class="fas fa-inbox text-2xl text-ash-grey-300 mb-2"></i>
                        <p class="text-[11px] text-silver-500">Zatím se tu nic neudálo.</p>
                    </div>
                `;
                return;
            }

            // Vykreslení historie (backend by je měl vracet seřazené od nejnovějšího)
            data.events.forEach(event => {
                renderEventLog(event, false); // false = historie, skládej je pod sebe
            });
        }
    } catch (error) {
        console.error("Chyba při načítání historie eventů:", error);
        feedContainer.innerHTML = '<p class="text-[10px] text-red-400 text-center py-4">Chyba při načítání logů.</p>';
    }
}

/**
 * Vykreslí jeden konkrétní log do feedu
 */
function renderEventLog(event, isNew = false) {
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;

    // Pokud přišel první live event a feed ukazoval "Prázdnou schránku", schránku smažeme
    const emptyState = document.getElementById('empty-events-state');
    if (isNew && emptyState) {
        emptyState.remove();
    }

    // Výchozí styly (Info)
    let iconClass = 'fa-info';
    let iconColor = 'text-blue-500';
    let bgColor = 'bg-blue-50';

    // Obarvení podle typu eventu
    if (event.type === 'warn' || event.type === 'warning') {
        iconClass = 'fa-exclamation-triangle';
        iconColor = 'text-yellow-500';
        bgColor = 'bg-yellow-50';
    } else if (event.type === 'alert') {
        iconClass = 'fa-plug-circle-xmark';
        iconColor = 'text-red-500';
        bgColor = 'bg-red-50';
    } else if (event.type === 'info') {
        // Tady si můžeš odlišit i připojení vs. ostatní info logy
        if (event.message.includes('Online')) {
            iconClass = 'fa-wifi';
            iconColor = 'text-green-500';
            bgColor = 'bg-green-50';
        } else {
            iconClass = 'fa-info-circle';
        }
    }

    // Bezpečné parsování času (doplnění Z pokud chybí, aby to prohlížeč bral jako UTC z DB)
    const timestampStr = event.timestamp.replace(' ', 'T') + (event.timestamp.includes('Z') ? '' : 'Z');
    const date = new Date(timestampStr);
    const timeStr = !isNaN(date) ? date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--';

    // HTML Šablona pro jeden log
    const logHtml = `
        <div class="flex gap-3 items-start animate-fade-in">
            <div class="w-7 h-7 rounded-full ${bgColor} flex items-center justify-center shrink-0 mt-0.5">
                <i class="fas ${iconClass} text-[10px] ${iconColor}"></i>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-800 leading-relaxed">${event.message}</p>
                <span class="text-[10px] text-silver-400 font-medium">${timeStr}</span>
            </div>
        </div>
    `;

    // Pokud je to nový live event, hodíme ho na úplný začátek (nahoru).
    // Pokud je to načítání historie, skládáme je postupně za sebe (dolů).
    if (isNew) {
        feedContainer.insertAdjacentHTML('afterbegin', logHtml);
    } else {
        feedContainer.insertAdjacentHTML('beforeend', logHtml);
    }
}