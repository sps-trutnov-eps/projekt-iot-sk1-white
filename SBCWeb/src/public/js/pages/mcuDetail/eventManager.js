// pages/mcuDetail/eventManager.js
import { getMcuId } from './utils.js';

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

export async function initEventManager(socket) {
    const mcuId = getMcuId();
    if (!mcuId) return;

    // Zobrazit skeleton
    showEventLoadingState();

    // 1. Načtení historie z API
    await fetchEventHistory(mcuId);

    // 2. Naslouchání na živé eventy
    if (socket) {
        socket.off('new_event'); 
        socket.on('new_event', (payload) => {
            if (payload.mcuId == mcuId) {
                renderEventLog(payload, true);
            }
        });
    }
}

async function fetchEventHistory(mcuId) {
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;
    
    try {
        const response = await fetch(`/event/mcu/${mcuId}`);
        const data = await response.json();

        if (data.success && data.events) {
            feedContainer.innerHTML = ''; 

            if (data.events.length === 0) {
                // Prázdný stav s INBOX ikonou (malá verze)
                feedContainer.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-8 text-center">
                        <i class="fas fa-inbox text-2xl text-ash-grey-300 mb-2"></i>
                        <p class="text-[11px] text-silver-500">Zatím se tu nic neudálo.</p>
                    </div>
                `;
                return;
            }

            data.events.forEach(event => {
                renderEventLog(event, false); 
            });
        }
    } catch (error) {
        console.error("Chyba při načítání historie eventů:", error);
        feedContainer.innerHTML = '<p class="text-[10px] text-red-400 text-center py-4">Chyba při načítání logů.</p>';
    }
}

function renderEventLog(event, isNew = false) {
    // ... [Zbytek této funkce zůstává stejný - nastavování barev, ikon atd.] ...
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;

    // Ošetření: Pokud je feed prázdný (ukazuje inbox), smažeme ho před vložením nového logu
    if (isNew && feedContainer.innerHTML.includes('fa-inbox')) {
        feedContainer.innerHTML = '';
    }

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