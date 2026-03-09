// public/js/common/utils.js

/* ============================================================
    GLOBÁLNÍ FUNKCE PRO ČASOVÉ ZÓNY
   ============================================================ */

/**
 * Zformátuje časové razítko podle uložené zóny v prohlížeči.
 */
window.formatTimeByTimezone = function(timestamp) {
    if (!timestamp) return '';
    
    // --- OPRAVA CHYBĚJÍCÍ ZÓNY (MySQL FIX) ---
    let safeTimestamp = timestamp;
    if (typeof timestamp === 'string') {
        // Pokud přijde "2026-03-09 17:12:05" bez Z, JS by si myslel, že to je tvůj lokální čas.
        // Přepíšeme to na "2026-03-09T17:12:05Z", aby JS věděl, že jde o nultý poledník.
        if (!timestamp.includes('T') && !timestamp.includes('Z')) {
            safeTimestamp = timestamp.replace(' ', 'T') + 'Z';
        } else if (timestamp.includes('T') && !timestamp.endsWith('Z')) {
            safeTimestamp = timestamp + 'Z';
        }
    }
    // ------------------------------------------

    const savedTz = localStorage.getItem('ui_timezone') || 'auto';
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    
    if (savedTz !== 'auto') {
        options.timeZone = savedTz;
    }
    
    try {
        return new Date(safeTimestamp).toLocaleTimeString('cs-CZ', options);
    } catch (e) {
        return new Date(safeTimestamp).toLocaleTimeString('cs-CZ'); // Fallback
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

// Spustit formátování hned po načtení jakékoliv stránky
document.addEventListener('DOMContentLoaded', window.updateAllLocalTimes);

// Naslouchat na změnu zóny (když uživatel uloží nastavení)
window.addEventListener('timezoneChanged', window.updateAllLocalTimes);

// Zde mohou pokračovat tvé případné další globální funkce...