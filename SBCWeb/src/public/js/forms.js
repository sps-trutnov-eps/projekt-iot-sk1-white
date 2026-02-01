document.addEventListener('DOMContentLoaded', () => {
    const addMCUBtn = document.getElementById('addMCU');
    const addMCUModal = document.getElementById('addMCUModal');
    const closeModal = document.getElementById('closeModal');
    const cancelBtn = document.getElementById('cancelBtn');

    if (addMCUBtn && addMCUModal) {
        addMCUBtn.addEventListener('click', () => {
            addMCUModal.classList.remove('hidden');
            console.log("opening MCUmodal");
        });
    }

});