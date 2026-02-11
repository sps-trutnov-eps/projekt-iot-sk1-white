/*
    Type formulář
    */
const typeModal = Modal.register('Type');
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toast-message");

// Registrace delete modalu
const deleteModal = Modal.register('delete');

if (deleteModal) {
    const { open, close, hideError, showError, submitBtn } = deleteModal;
    
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
        open(); 
        hideError(); 
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            if (!mcuIdToDelete) return;

            try {
                submitBtn.disabled = true;
                
                const response = await fetch('/mcu/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: mcuIdToDelete }) 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    await window.refreshMCUs();
                    close();
                } else {
                    showError(data.message || 'Chyba při mazání.');
                }
            } catch (error) {
                showError('Server neodpovídá.');
                console.error(error);
            } finally {
                submitBtn.disabled = false;
            }
        });
    }
}



    if(typeModal){
        const {openModal, submitBtn, showError, hideError } = typeModal;
        
        // akce pro zobrazování
        if(typeModal.openModal){
            typeModal.openModal.addEventListener('click', () => {
                typeModal.open();
                hideError();
            });
        }


        if(typeModal.submitBtn){
           typeModal.submitBtn.addEventListener('click', async (e) =>{
              e.preventDefault();

                const formData = {
                    type: document.getElementById('typeName').value,
                };

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Přidávám...';
                    
                    const response = await fetch('/type/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Úspěch - zobraz zprávu a zavři modal
                        if(toast && toastMsg){
                            openToast(data.message);
                        }
                        else{
                            showError("nebylo možné zobrazit alert");
                        }
                        typeModal.close();
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Type';
                        const result = await fetchData('/type/types');
                        if (result) {
                            populateSelector(result);
                        } else {
                            console.warn('Žádná data nebyla načtena.');
                        }                        
                    } else {
                        // Chyba - zobraz chybovou hlášku
                        showError(data.message);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Type';
                    }
                    
                } catch (error) {
                    console.log(error)
                    typeModal.showError(error);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Type';
                }
            });
        }
    }
    /*
    Type formulář - konec
    */
