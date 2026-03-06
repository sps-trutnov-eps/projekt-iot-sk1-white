// public/js/pages/servers/main.js

// 1. PŘIDÁN IMPORT 'toggleFavoriteCommand'
import { loadServers, loadRecentLogs, toggleFavoriteCommand } from './serverManager.js'; 
import { runCommand } from './commandManager.js';
import { 
    openAddServerModal,
    openAddCommandModal,
    openEditServerModal,
    openEditCommandModal,
    openDeleteModal
} from './modalManager.js';

document.addEventListener('DOMContentLoaded', () => {
    loadServers();
    loadRecentLogs();

    const addServerBtn = document.getElementById('addServerOpen');
    if (addServerBtn) {
        addServerBtn.addEventListener('click', openAddServerModal);
    }
});

// 2. TADY TO MUSÍ BÝT PŘIŘAZENO DO WINDOW
window.loadServers = loadServers;
window.runCommand = runCommand;
window.toggleFavoriteCommand = toggleFavoriteCommand; // <--- TENTO ŘÁDEK JE KLÍČOVÝ

window.openAddCommandModal = openAddCommandModal;
window.openEditServerModal = openEditServerModal;
window.openEditCommandModal = openEditCommandModal;
window.openDeleteModal = openDeleteModal;