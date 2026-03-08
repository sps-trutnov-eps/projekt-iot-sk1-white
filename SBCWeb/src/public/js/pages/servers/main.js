// public/js/pages/servers/main.js

import { loadServers, toggleFavoriteCommand } from './serverManager.js'; 
import { runCommand, loadMiniLog } from './commandManager.js';
import { 
    openAddServerModal,
    openAddCommandModal,
    openEditServerModal,
    openEditCommandModal,
    openDeleteModal
} from './modalManager.js';

document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    loadMiniLog();
    const addServerBtn = document.getElementById('addServerOpen');
    if (addServerBtn) {
        addServerBtn.addEventListener('click', openAddServerModal);
    }
});

setInterval(() => {
    // Tady můžeš předat ID serveru, pokud uživatel zrovna filtruje konkrétní server
    // např. loadMiniLog(currentSelectedServerId);
    loadMiniLog();
}, 3000);


// TADY TO MUSÍ BÝT PŘIŘAZENO DO WINDOW
window.loadServers = loadServers;
window.runCommand = runCommand;
window.toggleFavoriteCommand = toggleFavoriteCommand; 

window.openAddCommandModal = openAddCommandModal;
window.openEditServerModal = openEditServerModal;
window.openEditCommandModal = openEditCommandModal;
window.openDeleteModal = openDeleteModal;