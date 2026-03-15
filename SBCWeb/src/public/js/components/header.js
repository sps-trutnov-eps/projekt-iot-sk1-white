/* ============================================================
    8. GLOBÁLNÍ NOTIFIKACE (Zvoneček & Sockety & Historie)
   ============================================================ */

window.removeSingleNotification = async (event, eventId, btnElement) => {
    event.stopPropagation();

    const notificationItem = btnElement.closest('.border-b');
    if (notificationItem) notificationItem.remove();

    const list = document.getElementById('notificationList');
    const emptyState = document.getElementById('emptyNotifications');
    if (list && list.children.length <= 1) {
        if (emptyState) emptyState.classList.remove('hidden');
    }

    if (eventId) {
        try {
            const res = await fetch(`/event/delete/${eventId}`, { method: 'DELETE' });
            if (!res.ok) {
                console.error("Chyba při mazání notifikace na backendu.");
            }
            updateNotificationBadge();
        } catch (error) {
            console.error('Chyba při komunikaci se serverem:', error);
        }
    }
};

// PŘIDÁNO: Funkce na update badge s počtem nepřečtených
async function updateNotificationBadge() {
    try {
        const res = await fetch('/event/unread-count');
        const data = await res.json();
        const badge = document.getElementById('notificationBadge');
        
        if (badge && data.success) {
            const count = data.unreadCount;
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('Chyba při aktualizaci badge:', error);
    }
}

function initNotifications() {
    const bellBtn = document.getElementById('notificationBellBtn');
    const badge = document.getElementById('notificationBadge');
    const dropdown = document.getElementById('notificationDropdown');
    const list = document.getElementById('notificationList');
    const emptyState = document.getElementById('emptyNotifications');
    const clearBtn = document.getElementById('clearNotificationsBtn');

    if (!bellBtn || !dropdown) return;

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasHidden = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden');
        
        // PŘIDÁNO: Při otevření označit všechny jako přečtené
        if (wasHidden && !dropdown.classList.contains('hidden')) {
            markAllNotificationsAsRead();
        }
    });

    document.addEventListener('click', (e) => {
        if (!dropdown.classList.contains('hidden') && !e.target.closest('#notificationContainer')) {
            dropdown.classList.add('hidden');
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                const res = await fetch('/event/clear', { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    Array.from(list.children).forEach(child => {
                        if (child.id !== 'emptyNotifications') child.remove();
                    });
                    emptyState.classList.remove('hidden');
                    updateNotificationBadge();
                    if (window.openToast) window.openToast("Logy byly trvale smazány.", true);
                } else {
                    if (window.openToast) window.openToast("Chyba při mazání logů.", false);
                }
            } catch (err) {
                console.error("Chyba při volání DELETE (clearAll):", err);
            }
        });
    }

    // PŘIDÁNO: Funkce na označení všech jako přečtených
    async function markAllNotificationsAsRead() {
        try {
            const res = await fetch('/event/mark-all-as-read', { method: 'PUT' });
            if (!res.ok) {
                console.error("Chyba při označování notifikací jako přečtené.");
                return;
            }
            updateNotificationBadge();
        } catch (error) {
            console.error('Chyba při komunikaci se serverem:', error);
        }
    }

    function addNotification(payload, isNew = true) {
        if (!list) return;
        if (emptyState) emptyState.classList.add('hidden');

        // Zavoláme naši čistou globální funkci
        const time = window.formatTimeByTimezone(payload.timestamp);
        
        let colorClass, bgClass, iconClass;
        switch (payload.type) {
            case 'alert':
                colorClass = 'text-red-400'; 
                bgClass = 'bg-red-50 dark:bg-red-900/10 dark:border dark:border-red-900/30'; 
                iconClass = 'fa-exclamation-circle'; 
                break;
            case 'warning':
                colorClass = 'text-yellow-400'; 
                bgClass = 'bg-yellow-50 dark:bg-yellow-900/10 dark:border dark:border-yellow-900/30'; 
                iconClass = 'fa-exclamation-triangle'; 
                break;
            case 'info':
            default:
                colorClass = 'text-vintage-grape-400'; 
                bgClass = 'bg-ash-grey-50 dark:bg-midnight-violet-800 dark:border dark:border-midnight-violet-700'; 
                iconClass = 'fa-info-circle'; 
                break;
        }

        const item = document.createElement('div');
        item.className = `p-3 border-b border-ash-grey-100 dark:border-midnight-violet-700 last:border-0 rounded-lg mb-1 transition-colors ${bgClass} hover:brightness-95 cursor-default relative pr-6`;
        
        item.innerHTML = `
            <div class="flex gap-3 items-start">
                <i class="fas ${iconClass} ${colorClass} mt-0.5 text-sm shrink-0"></i>
                <div class="flex-1 min-w-0">
                    <p class="text-xs text-midnight-violet-900 dark:text-silver-100 font-medium leading-relaxed">${payload.message}</p>
                    <div class="flex justify-between items-center mt-1.5">
                        <span class="local-time text-[10px] text-silver-400 font-medium" data-timestamp="${payload.timestamp}">${time}</span>
                        ${payload.mcuId ? `<span class="text-[9px] uppercase tracking-wider bg-white dark:bg-midnight-violet-800 px-1.5 py-0.5 rounded text-silver-500 dark:text-silver-400 border border-silver-200 dark:border-midnight-violet-700 shadow-sm">ID: ${payload.mcuId}</span>` : ''}
                    </div>
                </div>
            </div>
            <button onclick="window.removeSingleNotification(event, ${payload.id ? payload.id : 'null'}, this)" 
                    class="absolute right-2 top-2 text-silver-400 hover:text-red-500 transition-colors p-1 flex items-center justify-center" 
                    title="Smazat">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;
        
        if (isNew) {
            list.insertBefore(item, list.firstChild);
        } else {
            list.appendChild(item);
        }
    }

    async function loadHistoricalNotifications() {
        try {
            const res = await fetch('/event/recent?limit=20');
            const data = await res.json();
            
            if (!res.ok) {
                console.error("DŮVOD CHYBY 500:", data.message);
                return;
            }

            if (data.success && data.events && data.events.length > 0) {
                if (emptyState) emptyState.classList.add('hidden');
                
                data.events.forEach(evt => {
                    const payload = {
                        id: evt.id,
                        mcuId: evt.mcu_id, 
                        type: evt.type,
                        message: evt.message,
                        timestamp: evt.timestamp
                    };
                    addNotification(payload, false);
                });
            }
            // PŘIDÁNO: Aktualizovat badge po načtení starých notifikací
            updateNotificationBadge();
        } catch (err) {
            console.error("Chyba při stahování starších logů:", err);
        }
    }

    const notifySocket = typeof io !== 'undefined' ? io() : null;

    if (notifySocket) {
        notifySocket.on('global_alert', (payload) => {
            addNotification(payload, true);
            updateNotificationBadge();

            if (window.openToast) {
                let toastPrefix = "";
                let isSuccessToast = true;
                
                if (payload.type === 'alert') {
                    toastPrefix = "Kritická chyba: ";
                    isSuccessToast = false;
                } else if (payload.type === 'warning') {
                    toastPrefix = "Upozornění: ";
                    isSuccessToast = false;
                }
                
                window.openToast(`${toastPrefix}${payload.message}`, isSuccessToast);
            }
        });

        notifySocket.on('alerts_changed', () => {
            // Vyčisti list a načti znovu z DB
            if (list) {
                Array.from(list.children).forEach(child => {
                    if (child.id !== 'emptyNotifications') child.remove();
                });
            }
            loadHistoricalNotifications();
        });
    }

    loadHistoricalNotifications();
}

document.addEventListener('DOMContentLoaded', () => {
    initNotifications();
});