// public/js/pages/servers/modalManager.js
import { currentServersData, loadServers } from './serverManager.js';

// 1. REGISTRACE MODÁLŮ PŘES TVŮJ SYSTÉM
export const serverModal = window.Modal.register('addServer');
export const commandModal = window.Modal.register('addCommand');
export const editServerModal = window.Modal.register('editServer');
export const editCommandModal = window.Modal.register('editCommand');
export const deleteModalObj = window.Modal.register('delete');


// ==========================================
// 2. FUNKCE PRO OTEVÍRÁNÍ MODÁLŮ (EXPORTY)
// ==========================================

export function openAddServerModal() {
    if (serverModal) {
        serverModal.clear();
        serverModal.open();
    }
}

export function closeAddServerModal() {
    if (serverModal) serverModal.close();
}

export function openAddCommandModal(serverId) {
    if (commandModal) {
        commandModal.clear(); 
        
        const serverInput = document.getElementById('commandServerId');
        if (serverInput) serverInput.value = serverId;
        
        const commandTypeSelect = document.getElementById('commandType');
        if (commandTypeSelect) {
            commandTypeSelect.value = 'shell';
            commandTypeSelect.dispatchEvent(new Event('change')); 
        }

        commandModal.open();
    }
}

export function closeAddCommandModal() {
    if (commandModal) commandModal.close();
}

export function openEditServerModal(serverId) {
    const server = currentServersData.find(s => s.id === serverId);
    if (server && editServerModal) {
        editServerModal.clear();
        document.getElementById('editServerId').value = server.id;
        document.getElementById('editServerName').value = server.name;
        document.getElementById('editServerIp').value = server.ip;
        document.getElementById('editServerApiKey').value = server.apiKey || '';
        editServerModal.open();
    }
}

export function openEditCommandModal(serverId, commandId) {
    const server = currentServersData.find(s => s.id === serverId);
    if (!server) return;
    const cmd = server.commands.find(c => c.id === commandId);
    
    if (cmd && editCommandModal) {
        editCommandModal.clear();
        document.getElementById('editCommandId').value = cmd.id;
        document.getElementById('editCommandName').value = cmd.name;

        const serverIdInput = document.getElementById('editCommandServerId');
        if (serverIdInput) {
            serverIdInput.value = serverId;
        } else {
            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.name = 'server_id';
            hiddenInput.id = 'editCommandServerId';
            hiddenInput.value = serverId;
            editCommandModal.form.appendChild(hiddenInput);
        }
        
        const typeSelect = document.getElementById('editCommandType');
        typeSelect.value = cmd.type;
        
        if (cmd.type === 'wol') {
            document.getElementById('editCommandMac').value = cmd.value;
            document.getElementById('editCommandValue').value = '';
        } else {
            document.getElementById('editCommandValue').value = cmd.value;
            document.getElementById('editCommandMac').value = '';
        }
        
        typeSelect.dispatchEvent(new Event('change'));
        editCommandModal.open();
    }
}

export function openDeleteModal(targetId, type, name) {
    if (deleteModalObj) {
        deleteModalObj.clear();
        document.getElementById('deleteTargetId').value = targetId;
        document.getElementById('deleteTargetType').value = type;
        document.getElementById('deleteTargetName').innerText = name;
        deleteModalObj.open();
    }
}


// ==========================================
// 3. LOGIKA PŘEPÍNÁNÍ (SHELL vs WOL)
// ==========================================

const addTypeSelect = document.getElementById('commandType');
if (addTypeSelect) {
    addTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        const shellWrap = document.getElementById('shellInputWrapper');
        const wolWrap = document.getElementById('wolInputWrapper');
        
        if (type === 'shell') {
            shellWrap.classList.remove('hidden'); shellWrap.querySelector('textarea').required = true;
            wolWrap.classList.add('hidden'); wolWrap.querySelector('input').required = false;
        } else {
            wolWrap.classList.remove('hidden'); wolWrap.querySelector('input').required = true;
            shellWrap.classList.add('hidden'); shellWrap.querySelector('textarea').required = false;
        }
    });
}

const editTypeSelect = document.getElementById('editCommandType');
if (editTypeSelect) {
    editTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        const shellWrap = document.getElementById('editShellInputWrapper');
        const wolWrap = document.getElementById('editWolInputWrapper');
        
        if (type === 'shell') {
            shellWrap.classList.remove('hidden'); shellWrap.querySelector('textarea').required = true;
            wolWrap.classList.add('hidden'); wolWrap.querySelector('input').required = false;
        } else {
            wolWrap.classList.remove('hidden'); wolWrap.querySelector('input').required = true;
            shellWrap.classList.add('hidden'); shellWrap.querySelector('textarea').required = false;
        }
    });
}


// ==========================================
// 4. ODESÍLÁNÍ FORMULÁŘŮ (SUBMIT)
// ==========================================

// ULOŽIT NOVÝ SERVER
if (serverModal && serverModal.submitBtn) {
    serverModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        serverModal.hideError();
        const data = Object.fromEntries(new FormData(serverModal.form).entries());

        if (!data.name || !data.ip) return serverModal.showError('Název a IP adresa jsou povinné!');

        try {
            const response = await fetch('/server/add', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                serverModal.close(); loadServers(); 
            } else {
                serverModal.showError(result.message || 'Chyba při ukládání serveru.');
            }
        } catch (err) { serverModal.showError('Nepodařilo se připojit k API.'); }
    });
}

// UPRAVIT SERVER
if (editServerModal && editServerModal.submitBtn) {
    editServerModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        editServerModal.hideError();
        const data = Object.fromEntries(new FormData(editServerModal.form).entries());

        if (!data.name || !data.ip) return editServerModal.showError('Název a IP adresa jsou povinné!');

        try {
            const res = await fetch(`/server/edit/${data.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) { 
                editServerModal.close(); loadServers(); 
            } else {
                editServerModal.showError(result.message || 'Chyba při úpravě serveru.');
            }
        } catch (err) { editServerModal.showError('Chyba komunikace s API.'); }
    });
}

// ULOŽIT NOVÝ PŘÍKAZ
if (commandModal && commandModal.submitBtn) {
    commandModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        commandModal.hideError();
        const data = Object.fromEntries(new FormData(commandModal.form).entries());

        if (!data.name || (!data.command && !data.macAddress)) return commandModal.showError('Vyplňte prosím všechny potřebné údaje.');

        try {
            const response = await fetch('/command/add', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
            });
            const result = await response.json();

            if (result.success) {
                commandModal.close(); loadServers(); 
            } else {
                commandModal.showError(result.message || 'Chyba při ukládání příkazu.');
            }
        } catch (err) { commandModal.showError('Nepodařilo se připojit k API.'); }
    });
}

// UPRAVIT PŘÍKAZ
if (editCommandModal && editCommandModal.submitBtn) {
    editCommandModal.submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        editCommandModal.hideError();
        const data = Object.fromEntries(new FormData(editCommandModal.form).entries());
        const finalCommand = data.type === 'wol' ? data.macAddress : data.command;
        
        if (!data.name || !finalCommand) return editCommandModal.showError('Vyplňte prosím všechny údaje.');
        if (!data.server_id) return editCommandModal.showError('Chybí ID serveru, zkuste modal zavřít a otevřít znovu.');

        try {
            const res = await fetch(`/command/edit/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                    name: data.name,
                    type: data.type,
                    command: finalCommand,
                    server_id: data.server_id
                })
            });
            const result = await res.json();
            if (result.success) { 
                editCommandModal.close(); loadServers(); 
            } else {
                editCommandModal.showError(result.message || 'Chyba při úpravě příkazu.');
            }
        } catch (err) { editCommandModal.showError('Chyba komunikace s API.'); }
    });
}

// SMAZAT (Server, Příkaz nebo celá Historie) — jediný handler
if (deleteModalObj && deleteModalObj.submitBtn) {
    deleteModalObj.submitBtn.addEventListener('click', async () => {
        deleteModalObj.hideError();
        const id = document.getElementById('deleteTargetId').value;
        const type = document.getElementById('deleteTargetType').value;

        let endpoint;
        if (type === 'command_history_all') {
            endpoint = '/command/history/all';
        } else if (type === 'server') {
            endpoint = `/server/${id}`;
        } else {
            endpoint = `/command/${id}`;
        }

        try {
            const res = await fetch(endpoint, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) { 
                deleteModalObj.close();
                if (type === 'command_history_all') {
                    window.loadMiniLog?.();
                } else {
                    loadServers();
                }
            } else {
                deleteModalObj.showError(result.message || 'Nelze smazat.');
            }
        } catch (err) { deleteModalObj.showError('Smazání selhalo.'); }
    });
}

// Globální funkce pro smazání celé historie přes delete modal
window.deleteAllCommandLogs = () => {
    if (!window.openDeleteModal) return;
    window.openDeleteModal('all', 'command_history_all', 'celá historie příkazů');
};
