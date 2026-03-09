// public/js/pages/servers/main.js

import { loadServers, toggleFavoriteCommand } from './serverManager.js'; 
import { loadMiniLog,renderMiniLogFilter  } from './commandManager.js';
import { 
    openAddServerModal,
    openAddCommandModal,
    openEditServerModal,
    openEditCommandModal,
    openDeleteModal
} from './modalManager.js';

document.addEventListener('DOMContentLoaded', async () => {
    loadServers();
    loadMiniLog();
    try {
        const res = await fetch('/server/all');
        const json = await res.json();
        const servers = json.result || json.data || [];
        renderMiniLogFilter(servers);
    } catch (err) {
        console.error('Chyba načítání serverů pro filtr:', err);
    }
    const addServerBtn = document.getElementById('addServerOpen');
    if (addServerBtn) {
        addServerBtn.addEventListener('click', openAddServerModal);
    }
});

setInterval(() => {
    loadMiniLog();
}, 3000);

window.loadServers = loadServers;
// window.runCommand není potřeba — commandManager.js to dělá sám
window.toggleFavoriteCommand = toggleFavoriteCommand; 

window.openAddCommandModal = openAddCommandModal;
window.openEditServerModal = openEditServerModal;
window.openEditCommandModal = openEditCommandModal;
window.openDeleteModal = openDeleteModal;