// 1. CONFIGURAZIONE - URL della tua Web App Google
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz_QpIHSYl_zDtzUAR6dHRy8AqC-_nx3HUTpuZPmucM1NBxmwQtq_PXi6y93Nesc-4Raw/exec";

let recognition;

// Funzione per cambiare visualizzazione tra le pagine
function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// 2. GESTIONE VOCALE (MICROFONO)
function avviaVocale(campoId) {
    const SpeechRecognition = window.webkitRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) {
        alert("Il tuo browser non supporta il riconoscimento vocale.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.continuous = false;

    // Mostra l'interfaccia di ascolto (Overlay Rosso)
    document.getElementById('status-vocale').classList.remove('hidden');

    recognition.onresult = (event) => {
        let testo = event.results[0][0].transcript;

        // PULIZIA TELEFONO: Se il campo è il telefono, togliamo spazi e caratteri non numerici
        if (campoId === 'telefono') {
            testo = testo.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        }

        document.getElementById(campoId).value = testo;
    };

    recognition.onend = () => {
        document.getElementById('status-vocale').classList.add('hidden');
    };

    recognition.onerror = (event) => {
        console.error("Errore riconoscimento:", event.error);
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

// 3. LOGICA GPS (MIRINO) - INDIRIZZO SEMPLIFICATO
function ottieniPosizione() {
    const btnPos = document.querySelector('.fa-crosshairs').parentElement;
    const iconaOriginale = btnPos.innerHTML;
    btnPos.innerHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Animazione caricamento

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        document.getElementById('gps-coords').value = `${lat},${lon}`;

        try {
            // Chiamata a OpenStreetMap per recuperare l'indirizzo
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            
            const a = data.address;
            
            // Estrazione selettiva dei campi
            const via = a.road || "";
            const civico = a.house_number ? " " + a.house_number : "";
            const comune = a.village || a.town || a.city || "";

            // Formattazione: Via NomeVia Numero, Comune
            let indirizzoPulito = `${via}${civico}, ${comune}`.trim();
            
            // Pulizia se la stringa inizia con una virgola (es. se manca la via)
            indirizzoPulito = indirizzoPulito.replace(/^, /, "");

            document.getElementById('indirizzo').value = indirizzoPulito;
            
        } catch (e) {
            alert("Coordinate acquisite, ma non è stato possibile determinare l'indirizzo testuale.");
        } finally {
            btnPos.innerHTML = iconaOriginale;
        }
    }, (error) => {
        alert("Errore GPS: Assicurati di aver attivato la localizzazione sul telefono.");
        btnPos.innerHTML = iconaOriginale;
    }, { timeout: 10000, enableHighAccuracy: true });
}

// 4. LOGICA SALVATAGGIO (INVIO AL DATABASE)
async function salvaDati() {
    const btn = document.getElementById('btn-salva');
    
    const dati = {
        cliente: document.getElementById('cliente').value,
        telefono: document.getElementById('telefono').value,
        indirizzo: document.getElementById('indirizzo').value,
        gps: document.getElementById('gps-coords').value
    };

    // Controllo validità minima
    if (!dati.cliente) {
        alert("Inserisci almeno il nome del cliente.");
        return;
    }

    btn.innerText = "INVIO IN CORSO...";
    btn.disabled = true;

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors', // Necessario per Google Apps Script
            body: JSON.stringify(dati)
        });

        alert("Cliente salvato correttamente!");
        
        // Svuota i campi per il prossimo inserimento
        document.getElementById('cliente').value = "";
        document.getElementById('telefono').value = "";
        document.getElementById('indirizzo').value = "";
        document.getElementById('gps-coords').value = "";
        
        // Torna alla home
        mostraPagina('home');

    } catch (e) {
        alert("Errore durante l'invio al database. Controlla la connessione.");
    } finally {
        btn.innerText = "SALVA NEL DATABASE";
        btn.disabled = false;
    }
}
