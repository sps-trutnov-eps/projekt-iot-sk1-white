document.addEventListener('DOMContentLoaded', () => {
    
    /*
    MCU formulář
    */
    const mcuModal = Modal.register('MCU');
    
    if(mcuModal){
        const {openModal, submitBtn, closeBtn, cancelBtn, showError, hideError } = mcuModal;
        
        // akce pro zobrazování
        if(mcuModal.openModal){
            mcuModal.openModal.addEventListener('click', () => {
                mcuModal.open();
                hideError();
            });
        }


        if(mcuModal.submitBtn){
            console.log("loaded")
            mcuModal.submitBtn.addEventListener('click', async (e) =>{
              e.preventDefault();
              console.log("aha")

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
                    
                    const response = await fetch('/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Úspěch - zobraz zprávu a zavři modal
                        alert('MCU bylo úspěšně vytvořeno!');
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
                    showError('Něco se pokazilo. Zkuste to znovu.');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add MCU';
                }
            });
        }
    }
    /*
    MCU formulář - konec
    */
});