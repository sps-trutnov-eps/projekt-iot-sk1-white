/* ============================================================
    8. GLOBÁLNÍ NOTIFIKACE (Zvoneček & Sockety & Historie)
   ============================================================ */

function initNotifications() {
    let unreadCount = 0;
    
    const bellBtn = document.getElementById('notificationBellBtn');
    const badge = document.getElementById('notificationBadge');
    const dropdown = document.getElementById('notificationDropdown');
    const list = document.getElementById('notificationList');
    const emptyState = document.getElementById('emptyNotifications');
    const clearBtn = document.getElementById('clearNotificationsBtn');

    if (!bellBtn || !dropdown) return;

    // 1. Otevírání a zavírání
    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            unreadCount = 0;
            updateBadge();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.classList.contains('hidden') && !e.target.closest('#notificationContainer')) {
            dropdown.classList.add('hidden');
        }
    });

    // 2. Tlačítko pro vymazání
    if (clearBtn) {
        clearBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const res = await fetch('/event/clear', { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    // Odstraníme z HTML vše kromě empty state
                    Array.from(list.children).forEach(child => {
                        if (child.id !== 'emptyNotifications') child.remove();
                    });
                    emptyState.classList.remove('hidden');
                    unreadCount = 0;
                    updateBadge();
                    if (window.openToast) window.openToast("Logy byly trvale smazány.", true);
                } else {
                    if (window.openToast) window.openToast("Chyba při mazání logů.", false);
                }
            } catch (err) {
                console.error("Chyba při volání DELETE:", err);
            }
        });
    }

    // 3. Pomocná funkce pro odznak
    function updateBadge() {
        if (!badge) return;
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.classList.remove('hidden');
            badge.classList.add('animate-bounce');
            setTimeout(() => badge.classList.remove('animate-bounce'), 1000);
        } else {
            badge.classList.add('hidden');
        }
    }

    // 4. Přidání zprávy do HTML
    function addNotification(payload, isNew = true) {
        if (!list) return;
        if (emptyState) emptyState.classList.add('hidden');

        const time = new Date(payload.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // --- NOVÁ LOGIKA PRO BARVY A IKONY ---
        let colorClass, bgClass, iconClass;

        switch (payload.type) {
            case 'alert':
                colorClass = 'text-red-500';
                bgClass = 'bg-red-50';
                iconClass = 'fa-exclamation-circle'; // Červený křížek / vykřičník
                break;
            case 'warning':
                colorClass = 'text-yellow-500';
                bgClass = 'bg-yellow-50';
                iconClass = 'fa-exclamation-triangle'; // Žlutý trojúhelník
                break;
            case 'info':
            default:
                colorClass = 'text-blue-500';
                bgClass = 'bg-blue-50';
                iconClass = 'fa-info-circle'; // Modré íčko
                break;
        }

        const item = document.createElement('div');
        item.className = `p-3 border-b border-ash-grey-100 last:border-0 rounded-lg mb-1 transition-colors ${bgClass} hover:brightness-95 cursor-default`;
        
        item.innerHTML = `
            <div class="flex gap-3 items-start">
                <i class="fas ${iconClass} ${colorClass} mt-0.5 text-sm"></i>
                <div class="flex-1">
                    <p class="text-xs text-midnight-violet-900 font-medium leading-relaxed">${payload.message}</p>
                    <div class="flex justify-between items-center mt-1.5">
                        <span class="text-[10px] text-silver-400 font-medium">${time}</span>
                        ${payload.mcuId ? `<span class="text-[9px] uppercase tracking-wider bg-white px-1.5 py-0.5 rounded text-silver-500 border border-silver-200 shadow-sm">ID: ${payload.mcuId}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // Nové události dáváme nahoru, historii dáváme dolů
        if (isNew) {
            list.insertBefore(item, list.firstChild);
        } else {
            list.appendChild(item);
        }
    }

    // 5. NAČTENÍ HISTORIE PŘI STARTU
    async function loadHistoricalNotifications() {
        try {
            const res = await fetch('/event/recent?limit=20'); // Načteme posledních 20 událostí
            const data = await res.json();
            
            if (!res.ok) {
                console.error("DŮVOD CHYBY 500:", data.message);
                return; // Ukončíme funkci
            }

            if (data.success && data.events && data.events.length > 0) {
                if (emptyState) emptyState.classList.add('hidden');
                
                data.events.forEach(evt => {
                    const payload = {
                        mcuId: evt.mcu_id, 
                        type: evt.type,
                        message: evt.message,
                        timestamp: evt.timestamp
                    };
                    addNotification(payload, false);
                });
            }
        } catch (err) {
            console.error("Chyba při stahování starších logů:", err);
        }
    }

    // 6. ZACHYCENÍ SOCKETŮ Z BACKENDU (Živé události)
    const notifySocket = typeof io !== 'undefined' ? io() : null;

    if (notifySocket) {
        notifySocket.on('global_alert', (payload) => {
            if (dropdown.classList.contains('hidden')) {
                unreadCount++;
                updateBadge();
            }
            addNotification(payload, true); // true = je to nové, vlož nahoru

            // Vylepšený toast podle typu notifikace
            if (window.openToast) {
                let toastPrefix = "";
                let isSuccessToast = true; // info bude mít zelený/úspěšný toast
                
                if (payload.type === 'alert') {
                    toastPrefix = "Kritická chyba: ";
                    isSuccessToast = false; // alert bude mít červený/chybový toast
                } else if (payload.type === 'warning') {
                    toastPrefix = "Upozornění: ";
                    isSuccessToast = false;
                }
                
                window.openToast(`${toastPrefix}${payload.message}`, isSuccessToast);
            }
        });
    }

    // Nakonec ihned zavoláme stažení historie
    loadHistoricalNotifications();
}

// Inicializace po načtení HTML
document.addEventListener('DOMContentLoaded', () => {
    initNotifications();
    initSettingsDropdown();
});