// public/js/pages/servers/main.js

import { loadServers } from './serverManager.js';
import { runCommand } from './commandManager.js';
import { openAddCommandModal } from './modalManager.js';


// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    // Načtení dat do UI
    loadServers();

});

// Vystavení potřebných funkcí do globálního window objektu pro inline HTML onclick eventy
window.loadServers = loadServers;
window.runCommand = runCommand;
window.openAddCommandModal = openAddCommandModal;