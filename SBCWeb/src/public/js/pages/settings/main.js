// public/js/pages/settings/main.js

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();

    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
});

/**
 * Načte nastavení z backendu (DB) a z prohlížeče (LocalStorage)
 */
async function loadSettings() {
    // --- NOVÉ: Generování IANA časových zón do selectu ---
    const tzSelect = document.getElementById('ui_timezone');
    if (tzSelect && typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
        const timezones = Intl.supportedValuesOf('timeZone');
        timezones.forEach(tz => {
            if (tz === 'UTC') return; // UTC už je v HTML
            const option = document.createElement('option');
            option.value = tz;
            option.textContent = tz.replace(/\//g, ' / ').replace(/_/g, ' '); 
            tzSelect.appendChild(option);
        });
    }

    try {
        const response = await fetch('/settings/get');
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                const data = result.data;
                document.getElementById('setting_mqtt_broker_ip').value = data.mqtt_broker_ip || '';
                document.getElementById('setting_mcu_ping_interval').value = data.mcu_ping_interval || '';
                document.getElementById('setting_server_ping_interval').value = data.server_ping_interval || '';
            }
        }
    } catch (error) {
        console.error('Chyba při načítání nastavení z DB:', error);
        showToast('error', 'Nepodařilo se načíst data ze serveru.');
    }

    const savedTheme = localStorage.getItem('ui_theme') || 'light';
    const themeRadio = document.querySelector(`input[name="ui_theme"][value="${savedTheme}"]`);
    if (themeRadio) themeRadio.checked = true;

    // Aplikování uložené zóny
    const savedTimezone = localStorage.getItem('ui_timezone') || 'auto';
    if (tzSelect) tzSelect.value = savedTimezone;
}

/**
 * Uloží nastavení do backendu (DB) a do prohlížeče (LocalStorage)
 */
async function saveSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const originalBtnText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
    saveBtn.disabled = true;

    const theme = document.querySelector('input[name="ui_theme"]:checked').value;
    const timezone = document.getElementById('ui_timezone').value;
    
    localStorage.setItem('ui_theme', theme);
    localStorage.setItem('ui_timezone', timezone);

    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // --- NOVÉ: Spuštění globálního eventu, který zachytí utils.js ---
    window.dispatchEvent(new Event('timezoneChanged'));

    const payload = {
        mqtt_broker_ip: document.getElementById('setting_mqtt_broker_ip').value,
        mcu_ping_interval: document.getElementById('setting_mcu_ping_interval').value,
        server_ping_interval: document.getElementById('setting_server_ping_interval').value
    };

    try {
        const response = await fetch('/settings/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', 'Nastavení bylo úspěšně uloženo.');
        } else {
            showToast('error', result.message || 'Chyba při ukládání nastavení.');
        }
    } catch (error) {
        console.error('Chyba při ukládání nastavení:', error);
        showToast('error', 'Chyba při komunikaci se serverem.');
    } finally {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    }
}

// ... fuknce showToast zůstává stejná ...

/**
 * Pomocná funkce pro zobrazení Toatsu (notifikace)
 */
function showToast(type, message) {
    const toastId = type === 'success' ? 'toast-success' : 'toast-error';
    const msgId = type === 'success' ? 'toast-message-success' : 'toast-message-error';
    
    const toastEl = document.getElementById(toastId);
    const msgEl = document.getElementById(msgId);
    
    if (toastEl && msgEl) {
        msgEl.textContent = message;
        
        // Zobrazit
        toastEl.classList.remove('hidden');
        // Malý timeout pro CSS transition efekt
        setTimeout(() => {
            toastEl.classList.remove('opacity-0', 'translate-y-4');
        }, 10);
        
        // Schovat po 3 vteřinách
        setTimeout(() => {
            toastEl.classList.add('opacity-0', 'translate-y-4');
            setTimeout(() => {
                toastEl.classList.add('hidden');
            }, 700); // Počkat na dokončení animace
        }, 3000);
    }
}