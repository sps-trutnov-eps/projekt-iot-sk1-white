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
        window.renderMiniLogFilter = renderMiniLogFilter;
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

// Server API key modal
import { openServerApiKeyModal, initServerApiKeyModal } from './modalManager.js';
window.openServerApiKeyModal = openServerApiKeyModal;
document.addEventListener('DOMContentLoaded', () => { initServerApiKeyModal(); });

window.toggleServerApiKeyVis = (btn) => {
    const pill = btn.closest('div').querySelector('.server-api-key-text');
    const isBlurred = pill.classList.contains('blur-[4px]');
    if (isBlurred) {
        pill.classList.remove('blur-[4px]');
        pill.style.webkitTextSecurity = 'none';
        btn.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        pill.classList.add('blur-[4px]');
        pill.style.webkitTextSecurity = 'disc';
        btn.classList.replace('fa-eye-slash', 'fa-eye');
    }
};

window.copyServerApiKey = async (btn) => {
    const text = btn.closest('div').querySelector('.server-api-key-text').textContent.trim();
    await navigator.clipboard.writeText(text);
    btn.classList.replace('fa-copy', 'fa-check');
    btn.classList.add('text-green-500');
    setTimeout(() => {
        btn.classList.replace('fa-check', 'fa-copy');
        btn.classList.remove('text-green-500');
    }, 2000);
};

window.openDeleteModal = openDeleteModal;