document.addEventListener('DOMContentLoaded', () => {
 
 // MCU formulář
    const addMCUBtn = document.getElementById('addMCU');
    const addMCUModal = document.getElementById('addMCUModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitBtn');
    if (addMCUModal) {

        // akce pro zobrazování
        if(addMCUBtn){
            addMCUBtn.addEventListener('click', () => {
            addMCUModal.classList.remove('hidden');
            console.log("opening MCUmodal");
        });
        }
        
        if(closeModal){
            closeModal.addEventListener('click', () => {
            addMCUModal.classList.add('hidden');
            console.log("opening MCUmodal");
        });
        } 

        if(cancelBtn){
            cancelBtn.addEventListener('click', () => {
            addMCUModal.classList.add('hidden');
            console.log("opening MCUmodal");
        });
        } 

        //odeslání formuláře
        if(submitBtn){
        submitBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const formData = {
                name: document.getElementById('mcuName').value,
                type: document.getElementById('mcuType').value,
                ipAddress: document.getElementById('mcuIP').value,
                macAddress: document.getElementById('mcuMAC').value,
                mcuLocation: document.getElementById('mcuLocation').value,
                description: document.getElementById('mcuDescription').value
            };
            
            try {
                const response = await fetch('/mcu/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Úspěch - zobraz zprávu a zavři modal
                    alert('MCU bylo úspěšně vytvořeno!');
                    addMCUModal.classList.add('hidden');
                } else {
                    // Chyba - zobraz chybovou hlášku
                    alert('Chyba: ' + data.message);
                }
                
            } catch (error) {
                alert('Chyba při odesílání: ' + error.message);
            }
        });
    }

    }
});