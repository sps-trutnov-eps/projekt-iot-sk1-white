/*
    Type formulář
    */
    const typeModal = Modal.register('Type');
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toast-message");

    
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