// public/js/pages/settings/main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializace - načtení dat
    loadSettings();

    // 2. Nastavení event listeneru pro tlačítko uložení
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }
});

/**
 * Načte nastavení z backendu (DB) a z prohlížeče (LocalStorage)
 */
async function loadSettings() {
    try {
        // A) Načtení backendových dat z API
        const response = await fetch('/settings/get');
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                const data = result.data;
                // Předvyplnění inputů
                document.getElementById('setting_mqtt_broker_ip').value = data.mqtt_broker_ip || '';
                document.getElementById('setting_mcu_ping_interval').value = data.mcu_ping_interval || '';
                document.getElementById('setting_server_ping_interval').value = data.server_ping_interval || '';
            }
        }
    } catch (error) {
        console.error('Chyba při načítání nastavení z DB:', error);
        showToast('error', 'Nepodařilo se načíst data ze serveru.');
    }

    // B) Načtení UI dat z LocalStorage
    const savedTheme = localStorage.getItem('ui_theme') || 'light';
    const themeRadio = document.querySelector(`input[name="ui_theme"][value="${savedTheme}"]`);
    if (themeRadio) themeRadio.checked = true;

    const savedTimezone = localStorage.getItem('ui_timezone') || 'auto';
    const tzSelect = document.getElementById('ui_timezone');
    if (tzSelect) tzSelect.value = savedTimezone;
}

/**
 * Uloží nastavení do backendu (DB) a do prohlížeče (LocalStorage)
 */
async function saveSettings() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const originalBtnText = saveBtn.innerHTML;
    
    // Vizuální feedback na tlačítku
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
    saveBtn.disabled = true;

    // 1. Zpracování frontendových (UI) nastavení
    const theme = document.querySelector('input[name="ui_theme"]:checked').value;
    const timezone = document.getElementById('ui_timezone').value;
    
    localStorage.setItem('ui_theme', theme);
    localStorage.setItem('ui_timezone', timezone);

    // 2. Příprava dat pro backend
    const payload = {
        mqtt_broker_ip: document.getElementById('setting_mqtt_broker_ip').value,
        mcu_ping_interval: document.getElementById('setting_mcu_ping_interval').value,
        server_ping_interval: document.getElementById('setting_server_ping_interval').value
    };

    // 3. Odeslání na API
    try {
        const response = await fetch('/settings/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        // Vrácení tlačítka do původního stavu
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    }
}

/**
 * Pomocná funkce pro zobrazení Toatsu (notifikace)
 * (Pokud už máš na toto funkci v js/components/toast.js, můžeš tuto smazat a použít tu svou)
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