/*systém pro registraci modalů pro jednoduchou správu*/

const Modal = {


    register(name){
        const modal = document.getElementById(`${name}Modal`)
        const form = document.getElementById(`${name}Form`)
        const closeBtn = document.getElementById(`${name}Close`)
        const cancelBtn = document.getElementById(`${name}Cancel`)
        const submitBtn = document.getElementById(`${name}Submit`)
        const errorDiv = document.getElementById(`${name}Error`);
        const errorText = errorDiv?.querySelector('p');
        const openModal = document.getElementById(`${name}Open`)

        if (!modal) {
            console.warn(`Modal #${name}Modal nenalezen`);
            return;
        };

        // otevření formuláře
        const open = () => {
            modal.classList.remove('hidden')
        }               
        
        // zavření formuláře a jeho reset
        const close = () => {
            modal.classList.add('hidden');
            if(form){
                form.reset();
            } else {
                const inputs = modal.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    input.value = '';
                });
            }
        };


        // zavření formuláře a jeho reset
        const cancel = () => {
            modal.classList.add('hidden');
            if(form){
                form.reset();
            } else {
                const inputs = modal.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    input.value = '';
                });
            }
        };

        const clear = () =>{
            if(form){
                form.reset();
                hideError();
            } else {
                const inputs = modal.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    input.value = '';
                });
                hideError();
            }
        }

        const showError = (message) => {
            if(errorText){
                errorText.textContent = message;
                errorDiv.classList.remove('hidden');
            }
        
        };

        const hideError = () =>{
            if(errorDiv){
                errorText.textContent = '';
                errorDiv.classList.add('hidden');
            }

        }


        // registrace uživatelského vstupu
        if(closeBtn){
            closeBtn.addEventListener("click", close);
        }

        if(cancelBtn){
            cancelBtn.addEventListener("click", close);
        }

        if(openModal){
            openModal.addEventListener("click", open);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                close();
            }
        });

        

        return { open,clear, close, modal, form, submitBtn, cancelBtn, openModal, closeBtn, showError, hideError};
    }
}

window.Modal = Modal;