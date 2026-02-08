/*
    MCU formulář
    */
    const mcuModal = Modal.register('MCU');
    
    if(mcuModal){
        const {openModal, submitBtn, showError, hideError } = mcuModal;
        
        // akce pro zobrazování
        if(mcuModal.openModal){
            mcuModal.openModal.addEventListener('click', () => {
                mcuModal.open();
                hideError();
            });
        }


        if(mcuModal.submitBtn){
            mcuModal.submitBtn.addEventListener('click', async (e) =>{
              e.preventDefault();

                const formData = {
                    name: document.getElementById('mcuName').value,
                    type: document.getElementById('mcuType').value,
                    ipAddress: document.getElementById('mcuIP').value,
                    macAddress: document.getElementById('mcuMAC').value,
                    location: document.getElementById('mcuLocation').value,
                    description: document.getElementById('mcuDescription').value
                };

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Přidávám...';
                    
                    const response = await fetch('/mcu/add', {
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
                        mcuModal.close();
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add MCU';
                    } else {
                        // Chyba - zobraz chybovou hlášku
                        showError(data.message);
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add MCU';
                    }
                    
                } catch (error) {
                    console.log(error)
                    mcuModal.showError(error);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add MCU';
                }
            });
        }
    }
    /*
    MCU formulář - konec
    */