/* ============================================================
    1. SMAZÁNÍ MCU (deletemcu)
   ============================================================ */
const deleteMcuModal = Modal.register('deletemcu');

if (deleteMcuModal) {
    let mcuIdToDelete = null;

    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-mcu-btn');
        if (!btn) return;

        mcuIdToDelete = btn.dataset.id;

        if (!mcuIdToDelete) {
            window.openToastError && window.openToastError('Chybí ID MCU.');
            return;
        }

        console.log("Připraveno ke smazání ID:", mcuIdToDelete);
        deleteMcuModal.open(); 
        deleteMcuModal.hideError(); // Volání přímo přes objekt
    });

    if (deleteMcuModal.submitBtn) {
        deleteMcuModal.submitBtn.addEventListener('click', async () => {
            if (!mcuIdToDelete) return;

            try {
                deleteMcuModal.submitBtn.disabled = true;
                
                const response = await fetch('/mcu/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: mcuIdToDelete }) 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshMCUs();
                    deleteMcuModal.close(); // Volání přímo přes objekt
                } else {
                    deleteMcuModal.showError(data.message || 'Chyba při mazání.');
                }
            } catch (error) {
                deleteMcuModal.showError('Server neodpovídá.');
                console.error(error);
            } finally {
                deleteMcuModal.submitBtn.disabled = false;
            }
        });
    }
}

/* ============================================================
    2. SMAZÁNÍ TYPU (deletetype)
   ============================================================ */
const deleteTypeModal = Modal.register('deletetype');
let typeIdToDelete = null; // Definováno vně, aby k tomu měl přístup i submitBtn

if (deleteTypeModal) {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.delete-type-btn');
        if (!btn) return;

        typeIdToDelete = btn.dataset.id;

        if (!typeIdToDelete) {
            window.openToastError && window.openToastError('Chybí ID Typu.');
            return;
        }

        console.log("Připraveno ke smazání ID Typu:", typeIdToDelete);
        deleteTypeModal.open(); 
        deleteTypeModal.hideError(); 
    });

    if (deleteTypeModal.submitBtn) {
        deleteTypeModal.submitBtn.addEventListener('click', async () => {
            if (!typeIdToDelete) return;

            try {
                deleteTypeModal.submitBtn.disabled = true;
                
                const response = await fetch('/type/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: typeIdToDelete }) 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshTypes();
                    deleteTypeModal.close();
                    typeModal.close();
                    if (toast && toastMsg) {
                    openToast(data.message);
                    }
                } else {
                    deleteTypeModal.showError(data.message || 'Chyba při mazání.');
                }
            } catch (error) {
                deleteTypeModal.showError('Server neodpovídá.');
                console.error(error);
            } finally {
                deleteTypeModal.submitBtn.disabled = false;
            }
        });
    }
}

/* ============================================================
    3. SPRÁVA TYPŮ (Přidávání)
   ============================================================ */
const typeModal = Modal.register('Type');

if (typeModal) {
    console.log('1');
    if (typeModal.openModal) {
        console.log('2');
        typeModal.openModal.addEventListener('click', () => {
            typeModal.open();
            typeModal.hideError();
        });
    }

    if (typeModal.submitBtn) {
        typeModal.submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const formData = {
                type: document.getElementById('typeName').value,
            };

            try {
                typeModal.submitBtn.disabled = true;
                typeModal.submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Přidávám...';
                
                const response = await fetch('/type/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshTypes();
                    if (toast && toastMsg) {
                        openToast(data.message);
                    } else {
                        typeModal.showError("nebylo možné zobrazit alert");
                    }
                    typeModal.close();
                    
                    const result = await fetchData('/type/types');
                    if (result) {
                        populateSelector(result);
                    }
                } else {
                    typeModal.showError(data.message);
                }
            } catch (error) {
                console.error(error);
                typeModal.showError("Chyba při komunikaci se serverem.");
            } finally {
                typeModal.submitBtn.disabled = false;
                typeModal.submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Type';
            }
        });
    }
}