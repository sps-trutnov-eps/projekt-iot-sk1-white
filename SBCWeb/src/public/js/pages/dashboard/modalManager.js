/**
 * MODAL MANAGER - Logika odesílání formulářů
 */
export const DashboardModals = {
    init() {
        this.setupAddSubmit(); 
        this.setupEditSubmit();
        this.setupDeleteSubmit();
    },

    setupAddSubmit() {
        if (!window.addCommandModal || !window.addCommandModal.form) return;

        // Logika pro přepínání Shell/WoL inputů přímo v Add modalu
        const addTypeSelect = document.getElementById('addCommandType');
        if (addTypeSelect) {
            addTypeSelect.addEventListener('change', (e) => {
                const isWol = e.target.value === 'wol';
                document.getElementById('addShellInputWrapper').classList.toggle('hidden', isWol);
                document.getElementById('addWolInputWrapper').classList.toggle('hidden', !isWol);
            });
        }

window.addCommandModal.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    window.addCommandModal.hideError();

    const formData = new FormData(window.addCommandModal.form);
    const data = Object.fromEntries(formData.entries());
    
    const finalCommand = data.type === 'wol' ? data.macAddress : data.command;

    // ZMĚNA: Používáme data.server (kvůli name="server" v HTML)
    if (!data.name || !finalCommand || !data.server) {
        return window.addCommandModal.showError('Vyplňte prosím všechny údaje (jméno, server, příkaz/MAC).');
    }

    try {
        const submitBtn = window.addCommandModal.submitBtn;
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Vytvářím...';
        submitBtn.disabled = true;

        // PAYLOAD
        const payload = {
            name: data.name,
            type: data.type,
            command: finalCommand,
            server_id: data.server, // TADY POUŽIJEME data.server
            is_favorite: 1 
        };

        console.log("Odesílám payload na backend:", payload);

        const res = await fetch('/command/add', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload)
        });
        

        const result = await res.json();
        
                console.log("Odpověď ze serveru:", result);


        if (result.success) { 
            window.addCommandModal.close(); 
            window.DashboardManager.loadData(); 
        } else {
            window.addCommandModal.showError(result.message || 'Chyba při vytváření příkazu.');
        }
        
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    } catch (err) { 
        console.error("Add Command Error:", err);
        window.addCommandModal.showError('Chyba komunikace s API.'); 
    }
});
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