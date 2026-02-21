import { getMcuId } from './utils.js';

export function initEventManager(socket) {
    const mcuId = getMcuId();
    if (!mcuId || !socket) return;

    // Naslouchání na nové živé eventy z backendu
    socket.on('new_event', (payload) => {
        if (payload.mcuId == mcuId) {
            renderEventLog(payload);
        }
    });
}

export function renderEventLog(event) {
    const feedContainer = document.getElementById('event-feed');
    if (!feedContainer) return;

    const date = new Date(event.timestamp);
    const timeStr = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Výchozí styly (info)
    let iconClass = 'fa-info';
    let iconColor = 'text-blue-500';
    let bgColor = 'bg-blue-50';

    // Přizpůsobení podle typu zprávy z backendu
    if (event.type === 'warn') {
        iconClass = 'fa-exclamation-triangle';
        iconColor = 'text-yellow-500';
        bgColor = 'bg-yellow-50';
    } else if (event.type === 'alert') {
        iconClass = 'fa-plug-circle-xmark'; // Ikonka pro odpojení / chybu
        iconColor = 'text-red-500';
        bgColor = 'bg-red-50';
    } else if (event.type === 'info') {
        iconClass = 'fa-wifi'; // Připojeno / Info
        iconColor = 'text-green-500';
        bgColor = 'bg-green-50';
    }

    const logEl = document.createElement('div');
    logEl.className = 'flex gap-3 items-start'; // Tvůj design
    logEl.innerHTML = `
        <div class="w-7 h-7 rounded-full ${bgColor} flex items-center justify-center shrink-0 mt-0.5">
            <i class="fas ${iconClass} text-[10px] ${iconColor}"></i>
        </div>
        <div>
            <p class="text-xs font-medium text-gray-800">${event.message}</p>
            <span class="text-[10px] text-silver-400">${timeStr}</span>
        </div>
    `;

    // Přidáme na začátek seznamu (od nejnovějších dolů)
    feedContainer.prepend(logEl);
}