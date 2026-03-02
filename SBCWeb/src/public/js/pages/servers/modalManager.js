// public/js/pages/servers/modalManager.js

// Registrace modálů pomocí tvého systému
export const serverModal = window.Modal.register('addServer');
export const commandModal = window.Modal.register('addCommand');

/**
 * Obsluha odeslání nového serveru
 */
if (serverModal && serverModal.submitBtn) {
    serverModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        serverModal.hideError();

        const formData = new FormData(serverModal.form);
        const data = Object.fromEntries(formData.entries());

        if (!data.name || !data.ip) {
            serverModal.showError('Název a IP adresa jsou povinné!');
            return;
        }

        try {
            // Změň za reálnou API cestu pro tvůj backend
            const response = await fetch('/server/add', {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                serverModal.close(); // tvůj systém automaticky resetne formulář
                window.loadServers(); // znovunačtení gridu
            } else {
                serverModal.showError(result.message || 'Chyba při ukládání serveru.');
            }
        } catch (err) {
            serverModal.showError('Nepodařilo se připojit k API.');
        }
    });
}

/**
 * Obsluha odeslání nového příkazu
 */
if (commandModal && commandModal.submitBtn) {
    commandModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        commandModal.hideError();

        const formData = new FormData(commandModal.form);
        const data = Object.fromEntries(formData.entries());

        if (!data.name || (!data.command && !data.macAddress)) {
            commandModal.showError('Vyplňte prosím všechny potřebné údaje.');
            return;
        }

        try {
            const response = await fetch('/command/add', {
            method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                commandModal.close();
                window.loadServers(); // znovunačtení gridu, aby se příkaz zobrazil
            } else {
                commandModal.showError(result.message || 'Chyba při ukládání příkazu.');
            }
        } catch (err) {
            commandModal.showError('Nepodařilo se připojit k API.');
        }
    });
}

/**
 * Speciální funkce pro otevření modálu příkazu.
 * Protože tlačítek "Nová akce" je více (v každém serveru jedno), 
 * nemůžeme spoléhat na jedno statické ID `addCommandOpen`. 
 * Voláme to tedy přes onclick z HTML a sem předáme ID serveru.
 */
export function openAddCommandModal(serverId) {
    if (commandModal) {
        commandModal.clear(); // Vyčistí inputy a staré errory
        
        // Nastavíme skrytému inputu ID serveru
        const serverInput = document.getElementById('commandServerId');
        if (serverInput) {
            serverInput.value = serverId;
        }
        
        commandModal.open();
    }
}