// public/js/common/utils.js

/**
 * Zformátuje časové razítko (UTC) podle zóny uživatele.
 */
window.formatTimeByTimezone = function(timestamp) {
    if (!timestamp) return '';
    const savedTz = localStorage.getItem('ui_timezone') || 'auto';
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    if (savedTz !== 'auto') {
        options.timeZone = savedTz;
    }
    
    // Fallback, kdyby timestamp nebyl validní
    try {
        return new Date(timestamp).toLocaleTimeString('cs-CZ', options);
    } catch (e) {
        return '';
    }
};

/**
 * Najde v DOMu všechny elementy s třídou 'local-time' a updatne je.
 */
window.updateAllLocalTimes = function() {
    document.querySelectorAll('.local-time').forEach(el => {
        const ts = el.getAttribute('data-timestamp');
        if (ts) {
            el.textContent = window.formatTimeByTimezone(ts);
        }
    });
};

// 1. Spustit formátování hned po načtení jakékoliv stránky
document.addEventListener('DOMContentLoaded', window.updateAllLocalTimes);

// 2. Naslouchat na změnu zóny (když uživatel uloží nastavení)
window.addEventListener('timezoneChanged', window.updateAllLocalTimes);