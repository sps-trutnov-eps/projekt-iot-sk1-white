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
            hideError();
            console.log("opening MCUmodal");
        });
        }
        
        if(closeModal){
            closeModal.addEventListener('click', () => {
            addMCUModal.classList.add('hidden');
            document.getElementById('addMCUForm').reset();
            console.log("opening MCUmodal");
        });
        } 

        if(cancelBtn){
            cancelBtn.addEventListener('click', () => {
            addMCUModal.classList.add('hidden');
            document.getElementById('addMCUForm').reset();
            console.log("opening MCUmodal");
        });
        } 
        // error message
        function showError(message){
            const errorDiv = document.getElementById('errorMessage');
            const errorText = errorDiv.querySelector('p');
        
            errorText.textContent = message;
            errorDiv.classList.remove('hidden');
        }

        function hideError(){
            const errorDiv = document.getElementById('errorMessage');
            errorDiv.classList.add('hidden');
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
                location: document.getElementById('mcuLocation').value,
                description: document.getElementById('mcuDescription').value
            };
            
        console.log('📦 Sending data:', formData); // Debug


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
                    alert('MCU bylo úspěšně vytvořeno!');
                    addMCUModal.classList.add('hidden');
                    document.getElementById('addMCUForm').reset();
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add MCU';
                } else {
                    // Chyba - zobraz chybovou hlášku
                    showError(data.message);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add MCU';
                }
                
            } catch (error) {
                showError(data.message);
            }
        });
    }

    }
});