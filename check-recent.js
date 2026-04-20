
const RESEND_KEY = "re_JMRychW4_FtVxybooADtZodiNoPCwsquP";

async function checkRecent() {
    try {
        const res = await fetch('https://api.resend.com/emails?limit=100', {
            headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
        });
        const data = await res.json();
        
        console.log(`📋 Últimos ${data.data.length} mails registrados:`);
        data.data.forEach((m, i) => {
            console.log(`${i+1}. [${m.last_event}] To: ${m.to[0]} | Asunto: ${m.subject}`);
        });
    } catch (e) {
        console.error(e);
    }
}
checkRecent();
