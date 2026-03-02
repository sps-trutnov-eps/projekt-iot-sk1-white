// public/js/pages/servers/main.js

import { loadServers } from './serverManager.js';
import { runCommand } from './commandManager.js';
import { 
    openAddCommandModal, 
    closeAddCommandModal, 
    openAddServerModal, 
    closeAddServerModal 
} from './modalManager.js';

// Inicializace při načtení stránky
document.addEventListener('DOMContentLoaded', () => {
    // Načtení dat do UI
    loadServers();

    // Event listenery pro tlačítka "Přidat server" a křížky v modálech
    // Tyhle věci máme staticky v HTML, tak je můžeme chytit tady
    document.getElementById('addServerOpen')?.addEventListener('click', openAddServerModal);
    document.getElementById('addServerClose')?.addEventListener('click', closeAddServerModal);
    document.getElementById('addServerCancel')?.addEventListener('click', closeAddServerModal);

    document.getElementById('addCommandClose')?.addEventListener('click', closeAddCommandModal);
    document.getElementById('addCommandCancel')?.addEventListener('click', closeAddCommandModal);
});

// Vystavení potřebných funkcí do globálního window objektu pro inline HTML onclick eventy
window.openAddCommandModal = openAddCommandModal;
window.runCommand = runCommand;

// Volitelné: Můžeš vystavit i loadServers, kdybys ho chtěl volat třeba po úspěšném odeslání modálu
window.loadServers = loadServers;