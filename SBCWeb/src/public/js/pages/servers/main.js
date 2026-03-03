// public/js/pages/servers/main.js
import { loadServers, loadRecentLogs } from './serverManager.js';
import { runCommand } from './commandManager.js';
import { 
    openAddServerModal,
    openAddCommandModal,
    openEditServerModal,
    openEditCommandModal,
    openDeleteModal
} from './modalManager.js';

// Inicializace po načtení DOM
document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    loadRecentLogs();

    // Pokud chceme otevřít modál pro přidání nového serveru z postranního menu
    const addServerBtn = document.getElementById('addServerOpen');
    if (addServerBtn) {
        addServerBtn.addEventListener('click', openAddServerModal);
    }
});

// Zpřístupníme funkce pro inline události v HTML (onclick="...")
window.loadServers = loadServers;
window.runCommand = runCommand;

window.openAddCommandModal = openAddCommandModal;
window.openEditServerModal = openEditServerModal;
window.openEditCommandModal = openEditCommandModal;
window.openDeleteModal = openDeleteModal;
