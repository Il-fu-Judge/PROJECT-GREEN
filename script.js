// 1. CONFIGURAZIONE - URL della tua Web App Google
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzePV3FylbP4hfbR70GOWgzl8Drv3a7f4tYN43gNLSwKGNR7N11XsyoQ96pvBP_-vbC8A/exec";

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

// 4. LOGICA SALVATAGGIO (INVIO AL DATABASE) - AGGIORNATA
async function salvaDati() {
    const btn = document.getElementById('btn-salva');
    
    const dati = {
        tipo: "NUOVO_CLIENTE", // Fondamentale per il nuovo script di Google
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
            mode: 'no-cors', 
            body: JSON.stringify(dati)
        });

        alert("Cliente salvato correttamente!");
        
        // Svuota i campi del form "Nuovo Cliente"
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

let tuttiIClienti = []; // Lascialo così com'è dopo la funzione
let tuttiGliInterventi = []; // AGGIUNGI QUESTA RIGA: ci servirà per mostrare le box
// Funzione per aprire la gestione e caricare i dati
async function apriGestione() {
    mostraPagina('gestione-cliente');
    const listaDiv = document.getElementById('lista-clienti');
    listaDiv.innerHTML = '<p class="caricamento">Caricamento database...</p>';

    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        
        // Ordine alfabetico per nome cliente
        tuttiIClienti = data.sort((a, b) => a.cliente.localeCompare(b.cliente));
        
        renderizzaLista(tuttiIClienti);
    } catch (e) {
        listaDiv.innerHTML = '<p>Errore nel caricamento dei dati.</p>';
    }
}

// Crea fisicamente le schede nell'HTML
function renderizzaLista(lista) {
    const listaDiv = document.getElementById('lista-clienti');
    listaDiv.innerHTML = '';

    if (lista.length === 0) {
        listaDiv.innerHTML = '<p>Nessun cliente trovato.</p>';
        return;
    }

    lista.forEach(c => {
        const scheda = document.createElement('div');
        scheda.className = 'scheda-cliente';
        
        // Creazione link Google Maps dalle coordinate
        const mapUrl = c.gps ? `https://www.google.com/maps/search/?api=1&query=${c.gps}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.indirizzo)}`;

        scheda.innerHTML = `
            <h3>${c.cliente}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${c.indirizzo}</p>
            <p><i class="fas fa-phone"></i> ${c.telefono}</p>
            <div class="azioni-scheda">
                <a href="tel:${c.telefono}" class="btn-azione btn-tel">
                    <i class="fas fa-phone"></i> Chiama
                </a>
                <a href="${mapUrl}" target="_blank" class="btn-azione btn-map">
                    <i class="fas fa-route"></i> Naviga
                </a>
                <button onclick="apriDettagli('${c.cliente}')" class="btn-azione" style="background:#eee; color:#333;">
                    <i class="fas fa-info-circle"></i> Dettagli
                </button>
            </div>
        `;
        listaDiv.appendChild(scheda);
    });
}

// Funzione per la barra di ricerca
function filtraClienti() {
    const testo = document.getElementById('cerca-cliente').value.toLowerCase();
    const filtrati = tuttiIClienti.filter(c => 
        c.cliente.toLowerCase().includes(testo)
    );
    renderizzaLista(filtrati);
}

// --- NUOVA LOGICA GESTIONE INTERVENTI ---

let clienteSelezionato = "";

// Sostituisce la vecchia funzione che avevi in fondo
function apriDettagli(nome) {
    clienteSelezionato = nome;
    document.getElementById('nome-cliente-titolo').innerText = nome;
    mostraPagina('scheda-cliente');
    
    // Per ora mostriamo un messaggio vuoto (nel prossimo step scaricheremo i dati veri)
    document.getElementById('lista-interventi').innerHTML = '<p style="text-align:center; padding:20px; color:#666;">Nessun intervento registrato per questo cliente.</p>';
}

function nuovoIntervento() {
    mostraPagina('editor-intervento');
    document.getElementById('righe-intervento').innerHTML = ''; // Pulisce interventi precedenti
    document.getElementById('data-intervento').valueAsDate = new Date(); // Imposta data odierna
    document.getElementById('status-intervento').value = "Da Fare";
    
    // Aggiunge la prima riga vuota automaticamente
    aggiungiRigaLavoro();
}

function aggiungiRigaLavoro() {
    const container = document.getElementById('righe-intervento');
    const rigaId = Date.now(); // ID unico per i campi vocali
    const div = document.createElement('div');
    div.className = 'riga-lavoro';
    
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#d32f2f;">
            <i class="fas fa-trash-alt"></i>
        </button>

        <div class="mini-input-group">
            <label>Tipo Intervento</label>
            <div class="campo-intervento-row">
                <input type="text" id="int-${rigaId}" placeholder="es. Potatura">
                <button onclick="avviaVocale('int-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button>
            </div>
        </div>

        <div class="mini-input-group">
            <label>Pianta</label>
            <div class="campo-intervento-row">
                <input type="text" id="pianta-${rigaId}" placeholder="es. Juglans Regia">
                <button onclick="avviaVocale('pianta-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button>
            </div>
        </div>

        <div class="mini-input-group">
            <label>Note</label>
            <div class="campo-intervento-row">
                <textarea id="note-${rigaId}" placeholder="Dettagli..."></textarea>
                <button onclick="avviaVocale('note-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button>
            </div>
        </div>
    `;
    container.appendChild(div);
}

async function salvaIntervento() {
    const data = document.getElementById('data-intervento').value;
    const status = document.getElementById('status-intervento').value;
    const righe = document.querySelectorAll('.riga-lavoro');
    
    let dettagliIntervento = [];

    righe.forEach(r => {
        const lavoro = r.querySelector('.campo-lavoro').value;
        const pianta = r.querySelector('.campo-pianta').value;
        const note = r.querySelector('.campo-note').value;
        
        if(lavoro || pianta) {
            dettagliIntervento.push({ lavoro, pianta, note });
        }
    });

    if (dettagliIntervento.length === 0) {
        alert("Aggiungi almeno un'azione all'intervento.");
        return;
    }

    console.log("Salvataggio per:", clienteSelezionato);
    console.log("Dati:", { data, status, dettagliIntervento });

    alert("Dati pronti per il database! (Prossimo step: collegamento Google Sheets)");
    mostraPagina('scheda-cliente');
}
