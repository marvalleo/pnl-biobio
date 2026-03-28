document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            // Usar la función global de setButtonLoading si existe (de ui.js expuesto en shared.js)
            if (window.setButtonLoading) {
                window.setButtonLoading(submitBtn, true);
            } else {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Enviando...';
            }
            
            const formData = {
                name: contactForm.querySelector('input[type="text"]:nth-of-type(1)').value,
                email: contactForm.querySelector('input[type="email"]').value,
                comuna: contactForm.querySelectorAll('input[type="text"]')[1].value,
                message: contactForm.querySelector('textarea').value
            };
            
            try {
                // Verificar si Supabase está inicializado
                if (!window.supabaseClient) {
                    throw new Error('El sistema de envío no está listo. Por favor, reintenta en unos segundos.');
                }
                
                const { data, error } = await window.supabaseClient.functions.invoke('contact-email', {
                    body: formData
                });
                
                if (error) throw error;
                
                if (window.showToast) {
                    window.showToast('¡Mensaje enviado con éxito!', 'success');
                } else {
                    alert('¡Mensaje enviado correctamente a la Sede Regional!');
                }
                
                contactForm.reset();
                
            } catch (err) {
                console.error('Error enviando contacto:', err);
                if (window.showToast) {
                    window.showToast(err.message || 'Error al enviar el mensaje', 'error');
                } else {
                    alert('Error: ' + err.message);
                }
            } finally {
                if (window.setButtonLoading) {
                    window.setButtonLoading(submitBtn, false, originalBtnText);
                } else {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            }
        });
    }
});
