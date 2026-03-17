        // 1. CONFIGURAZIONE: Incolla qui l'URL della tua Web App di Google
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzZwgDXrBR-_zpNNd69wO0BlGhy4LIRbKPwN7xxDTpn4UZAh30bpZYkg4GvBnEz30HO2w/exec";

let recognition;

// Navigazione tra le pagine
function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 2. LOGICA VOCALE (Microfono)
function avviaVocale(campoId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Il tuo browser non supporta il riconoscimento vocale.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.continuous = false; // Si ferma da solo quando smetti di parlare

    // Mostra l'overlay "In ascolto"
    document.getElementById('status-vocale').classList.remove('hidden');

    recognition.onresult = (event) => {
        const testo = event.results[0][0].transcript;
        document.getElementById(campoId).value = testo;
    };

    recognition.onend = () => {
        document.getElementById('status-vocale').classList.add('hidden');
    };

    recognition.onerror = () => {
        document.getElementById('status-vocale').classList.add('hidden');
    };

    recognition.start();
}

function stopVocale() {
    if (recognition) {
        recognition.stop();
    }
    document.getElementById('status-vocale').classList.add('hidden');
}

// 3. LOGICA GPS (Mirino)
function ottieniPosizione() {
    const btnPos = document.querySelector('.fa-crosshairs').parentElement;
    const iconaOriginale = btnPos.innerHTML;
    btnPos.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Icona caricamento

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        document.getElementById('gps-coords').value = lat + "," + lon;

        try {
            // Reverse Geocoding gratuito con OpenStreetMap
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            // Inserisce l'indirizzo nel campo (modificabile dall'utente)
            document.getElementById('indirizzo').value = data.display_name || "Indirizzo non trovato";
        } catch (e) {
            alert("Errore nel recupero dell'indirizzo testuale, ma le coordinate GPS sono state acquisite.");
        } finally {
            btnPos.innerHTML = iconaOriginale;
        }
    }, (error) => {
        alert("Errore GPS: Assicurati di aver dato i permessi di posizione.");
        btnPos.innerHTML = iconaOriginale;
    }, { timeout: 10000, enableHighAccuracy: true });
}

// 4. LOGICA SALVATAGGIO
async function salvaDati() {
    const btn = document.getElementById('btn-salva');
    const dati = {
        cliente: document.getElementById('cliente').value,
        telefono: document.getElementById('telefono').value,
        indirizzo: document.getElementById('indirizzo').value,
        gps: document.getElementById('gps-coords').value
    };

    if (!dati.cliente) {
        alert("Il nome cliente è obbligatorio.");
        return;
    }

    btn.innerText = "INVIO IN CORSO...";
    btn.disabled = true;

    try {
        // Invio al foglio Google
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Importante per Google Apps Script
            body: JSON.stringify(dati)
        });

        alert("Cliente salvato correttamente nel database!");
        
        // Svuota i campi e torna alla Home
        document.getElementById('cliente').value = "";
        document.getElementById('telefono').value = "";
        document.getElementById('indirizzo').value = "";
        document.getElementById('gps-coords').value = "";
        mostraPagina('home');

    } catch (e) {
        alert("Errore durante il salvataggio. Riprova.");
        console.error(e);
    } finally {
        btn.innerText = "SALVA NEL DATABASE";
        btn.disabled = false;
    }
}
