// public/js/pages/servers/modalManager.js

export function openAddCommandModal(serverId) {
    console.log("Otevírám modal pro přidání příkazu na server ID:", serverId);
    const modal = document.getElementById('addCommandModal');
    if(modal) {
        // Tady si pak můžeš naplnit např. hidden input s ID serveru
        // document.getElementById('commandServerId').value = serverId;
        modal.classList.remove('hidden');
    }
}

export function closeAddCommandModal() {
    const modal = document.getElementById('addCommandModal');
    if(modal) {
        modal.classList.add('hidden');
    }
}

export function openAddServerModal() {
    const modal = document.getElementById('addServerModal');
    if(modal) modal.classList.remove('hidden');
}

export function closeAddServerModal() {
    const modal = document.getElementById('addServerModal');
    if(modal) modal.classList.add('hidden');
}