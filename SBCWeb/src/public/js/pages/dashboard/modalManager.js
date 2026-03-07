/**
 * MODAL MANAGER - Logika odesílání formulářů
 */
export const DashboardModals = {
    init() {
        this.setupEditSubmit();
        this.setupDeleteSubmit();
    },

    setupEditSubmit() {
        if (!window.editModal || !window.editModal.form) return;
        window.editModal.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            window.editModal.hideError();

            const formData = new FormData(window.editModal.form);
            const data = Object.fromEntries(formData.entries());
            const finalCommand = data.type === 'wol' ? data.macAddress : data.command;

            if (!data.name || !finalCommand) {
                return window.editModal.showError('Vyplňte prosím všechny údaje.');
            }

            try {
                const submitBtn = window.editModal.submitBtn;
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ukládám...';
                submitBtn.disabled = true;

                const res = await fetch(`/command/edit/${data.id}`, {
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                        name: data.name, 
                        type: data.type, 
                        command: finalCommand,
                        server_id: data.serverId
                    })
                });
                
                const result = await res.json();
                if (result.success) { 
                    window.editModal.close(); 
                    window.DashboardManager.loadData(); 
                } else {
                    window.editModal.showError(result.message || 'Chyba při úpravě.');
                }
                
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            } catch (err) { 
                window.editModal.showError('Chyba komunikace s API.'); 
            }
        });
    },

    setupDeleteSubmit() {
        if (!window.deleteModal || !window.deleteModal.submitBtn) return;
        window.deleteModal.submitBtn.addEventListener('click', async () => {
            window.deleteModal.hideError();
            const id = document.getElementById('deleteTargetId').value;
            const type = document.getElementById('deleteTargetType').value;
            if (!id) return;

            const endpoint = type === 'server' ? `/server/${id}` : `/command/${id}`;

            try {
                const submitBtn = window.deleteModal.submitBtn;
                submitBtn.disabled = true;

                const res = await fetch(endpoint, { method: 'DELETE' });
                const result = await res.json();
                
                if (result.success) { 
                    window.deleteModal.close(); 
                    window.DashboardManager.loadData();
                } else {
                    window.deleteModal.showError(result.message || 'Nelze smazat.');
                }
                submitBtn.disabled = false;
            } catch (err) { 
                window.deleteModal.showError('Smazání selhalo.'); 
            }
        });
    }
};

window.DashboardModals = DashboardModals;