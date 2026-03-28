document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 🛡️ BARRERA 1: Honeypot (Anti-Bots)
            const honey = document.getElementById('website_honey').value;
            if (honey) {
                console.warn("🤖 PNL SECURITY: Bot detectado (Honeypot filled). Ignorando envío.");
                // Simular éxito para que el bot no sospeche
                if (window.showToast) window.showToast('¡Mensaje enviado con éxito!', 'success');
                contactForm.reset();
                return;
            }

            // 🛡️ BARRERA 2: Cooldown (Anti-Spam/Flooding)
            const lastSent = localStorage.getItem('pnl_last_contact_sent');
            const cooldownTime = 60 * 1000; // 60 segundos
            if (lastSent && (Date.now() - parseInt(lastSent) < cooldownTime)) {
                const remaining = Math.ceil((cooldownTime - (Date.now() - parseInt(lastSent))) / 1000);
                const msg = `Por favor, espera ${remaining} segundos antes de enviar otro mensaje.`;
                if (window.showToast) window.showToast(msg, 'warning');
                else alert(msg);
                return;
            }

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerText;
            
            if (window.setButtonLoading) {
                window.setButtonLoading(submitBtn, true);
            } else {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Enviando...';
            }
            
            const formData = {
                name: contactForm.querySelector('input[type="text"]:nth-of-type(1)').value.trim(),
                email: contactForm.querySelector('input[type="email"]').value.trim(),
                comuna: contactForm.querySelectorAll('input[type="text"]')[1].value.trim(),
                message: contactForm.querySelector('textarea').value.trim()
            };
            
            try {
                if (!window.supabaseClient) {
                    throw new Error('El sistema de envío no está listo. Por favor, reintenta en unos segundos.');
                }
                
                const { data, error } = await window.supabaseClient.functions.invoke('contact-email', {
                    body: formData
                });
                
                if (error) throw error;
                
                // 🛡️ Registrar tiempo de envío exitoso
                localStorage.setItem('pnl_last_contact_sent', Date.now().toString());

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
