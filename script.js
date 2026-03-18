// 1. CONFIGURAZIONE
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzwG89iXCulcB_aDOyOstiUMYuI2CtYLdpK840eQUbW_OregmibcXfxeJSpO3k4xl7Tug/exec";

let recognition;
let tuttiIClienti = [];
let tuttiGliInterventi = [];
let clienteSelezionato = "";

// Funzione per cambiare visualizzazione tra le pagine
function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove('hidden');
    } else {
        console.error("Pagina non trovata:", id);
    }
}

// 2. GESTIONE VOCALE
function avviaVocale(campoId) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) { alert("Browser non supportato"); return; }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    
    document.getElementById('status-vocale').classList.remove('hidden');
    
    recognition.onresult = (event) => {
        let testo = event.results[0][0].transcript;
        if (campoId === 'telefono') {
            testo = testo.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        }
        document.getElementById(campoId).value = testo;
    };
    
    recognition.onend = () => {
        document.getElementById('status-vocale').classList.add('hidden');
    };
    
    recognition.start();
}

function stopVocale() {
    if (recognition) recognition.stop();
    document.getElementById('status-vocale').classList.add('hidden');
}

// 3. LOGICA GPS
function ottieniPosizione() {
    const btnPos = document.querySelector('.fa-crosshairs').parentElement;
    const iconaOriginale = btnPos.innerHTML;
    btnPos.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        document.getElementById('gps-coords').value = `${lat},${lon}`;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const a = data.address;
            const via = a.road || "";
            const civico = a.house_number ? " " + a.house_number : "";
            const comune = a.village || a.town || a.city || "";
            document.getElementById('indirizzo').value = `${via}${civico}, ${comune}`.trim().replace(/^, /, "");
        } catch (e) { 
            alert("Errore nel recupero indirizzo."); 
        } finally { 
            btnPos.innerHTML = iconaOriginale; 
        }
    }, (err) => {
        alert("Attiva il GPS sul telefono.");
        btnPos.innerHTML = iconaOriginale;
    });
}

// 4. SALVATAGGIO NUOVO CLIENTE
async function salvaDati() {
    const btn = document.getElementById('btn-salva');
    const dati = {
        tipo: "NUOVO_CLIENTE",
        cliente: document.getElementById('cliente').value,
        telefono: document.getElementById('telefono').value,
        indirizzo: document.getElementById('indirizzo').value,
        gps: document.getElementById('gps-coords').value
    };
    
    if (!dati.cliente) { alert("Inserisci il nome del cliente."); return; }
    
    btn.innerText = "INVIO..."; 
    btn.disabled = true;
    
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dati) });
        alert("Cliente salvato correttamente!");
        document.getElementById('cliente').value = "";
        document.getElementById('telefono').value = "";
        document.getElementById('indirizzo').value = "";
        mostraPagina('home');
    } catch (e) { 
        alert("Errore di connessione."); 
    } finally { 
        btn.innerText = "SALVA NEL DATABASE"; 
        btn.disabled = false; 
    }
}

// 5. LISTA E GESTIONE
async function apriGestione() {
    mostraPagina('gestione-cliente');
    const listaDiv = document.getElementById('lista-clienti');
    listaDiv.innerHTML = '<p style="text-align:center;">Caricamento...</p>';
    
    try {
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        tuttiIClienti = data.clienti.sort((a, b) => a.cliente.localeCompare(b.cliente));
        tuttiGliInterventi = data.interventi || [];
        renderizzaLista(tuttiIClienti);
    } catch (e) { 
        listaDiv.innerHTML = '<p>Errore dati.</p>'; 
    }
}

function renderizzaLista(lista) {
    const listaDiv = document.getElementById('lista-clienti');
    listaDiv.innerHTML = '';
    
    lista.forEach(c => {
        // CORRETTO: ${c.gps} e ${encodeURIComponent}
        const mapUrl = c.gps ? `https://www.google.com/maps/search/?api=1&query=${c.gps}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.indirizzo)}`;
        const scheda = document.createElement('div');
        scheda.className = 'scheda-cliente';
        scheda.innerHTML = `
            <h3>${c.cliente}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${c.indirizzo}</p>
            <p><i class="fas fa-phone"></i> ${c.telefono}</p>
            <div class="azioni-scheda">
                <a href="tel:${c.telefono}" class="btn-azione btn-tel"><i class="fas fa-phone"></i> Chiama</a>
                <a href="${mapUrl}" target="_blank" class="btn-azione btn-map"><i class="fas fa-route"></i> Naviga</a>
                <button onclick="apriDettagli('${c.cliente.replace(/'/g, "\\'")}')" class="btn-azione" style="background:#eee; color:#333;">
                    <i class="fas fa-info-circle"></i> Dettagli
                </button>
            </div>`;
        listaDiv.appendChild(scheda);
    });
}

function filtraClienti() {
    const testo = document.getElementById('cerca-cliente').value.toLowerCase();
    const filtrati = tuttiIClienti.filter(c => c.cliente.toLowerCase().includes(testo));
    renderizzaLista(filtrati);
}

// 6. INTERVENTI
function apriDettagli(nome) {
    clienteSelezionato = nome;
    document.getElementById('nome-cliente-titolo').innerText = nome;
    mostraPagina('scheda-cliente');
    
    const container = document.getElementById('lista-interventi');
    container.innerHTML = '';
    
    const interventiCliente = tuttiGliInterventi.filter(i => i.cliente === nome);
    
    if (interventiCliente.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding:20px;">Nessun intervento registrato.</p>';
        return;
    }

    const raggruppati = {};
    interventiCliente.forEach(i => {
        const dataKey = i.data; 
        if (!raggruppati[dataKey]) raggruppati[dataKey] = { status: i.status, righe: [] };
        raggruppati[dataKey].righe.push(i);
    });

    for (const data in raggruppati) {
        const info = raggruppati[data];
        const isCompletato = info.status === "Completato";
        
        const box = document.createElement('div');
        box.className = 'scheda-cliente';
        box.style.borderLeft = isCompletato ? "6px solid #d32f2f" : "6px solid #2e7d32";

        let elenco = info.righe.map(r => `<li><b>${r.lavoro}</b> su ${r.pianta}</li>`).join('');
        const statusClass = isCompletato ? "status-completato" : "status-da-fare";

        const lavS = info.righe[0].lavoro.replace(/'/g, "\\'");
        const piaS = info.righe[0].pianta.replace(/'/g, "\\'");
        const notS = (info.righe[0].note || "").replace(/'/g, "\\'");

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold;">${new Date(data).toLocaleDateString('it-IT')}</span>
                <span class="badge-status ${statusClass}">${info.status}</span>
            </div>
            <ul style="margin:10px 0; padding-left:20px; font-size:15px;">${elenco}</ul>
            <p class="nota-intervento">${info.righe[0].note || ""}</p>
            
            <div class="azioni-intervento">
                <button class="btn-icon-action" title="Calendario" 
                    onclick="inviaACalendario('${data}', '${lavS}', '${piaS}', '${notS}')">
                    <i class="fas fa-calendar-plus" style="color: #4285F4;"></i>
                </button>

                <button class="btn-icon-action" onclick="caricaInterventoPerModifica('${data}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon-action"><i class="fas fa-image"></i></button>
                <button class="btn-icon-action btn-delete" onclick="eliminaIntervento('${data}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        container.appendChild(box);
    }
}

function nuovoIntervento() {
    mostraPagina('editor-intervento');
    document.getElementById('righe-intervento').innerHTML = '';
    document.getElementById('data-intervento').valueAsDate = new Date();
    aggiungiRigaLavoro();
}

function aggiungiRigaLavoro() {
    const container = document.getElementById('righe-intervento');
    const rigaId = Date.now();
    const div = document.createElement('div');
    div.className = 'riga-lavoro';
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position:absolute; top:10px; right:10px; border:none; background:none; color:red;"><i class="fas fa-trash"></i></button>
        <div class="mini-input-group"><label>Lavoro</label><div class="campo-intervento-row"><input type="text" class="in-lavoro" id="l-${rigaId}"><button onclick="avviaVocale('l-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>
        <div class="mini-input-group"><label>Pianta</label><div class="campo-intervento-row"><input type="text" class="in-pianta" id="p-${rigaId}"><button onclick="avviaVocale('p-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>
        <div class="mini-input-group"><label>Note</label><div class="campo-intervento-row"><textarea class="in-note" id="n-${rigaId}"></textarea><button onclick="avviaVocale('n-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>`;
    container.appendChild(div);
}

function caricaInterventoPerModifica(dataOriginale) {
    const interventiData = tuttiGliInterventi.filter(i => i.cliente === clienteSelezionato && i.data === dataOriginale);
    if (interventiData.length === 0) return;

    mostraPagina('editor-intervento');
    const d = new Date(dataOriginale);
    const dataFormattata = d.getFullYear() + '-' + 
                           String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(d.getDate()).padStart(2, '0');
    
    document.getElementById('data-intervento').value = dataFormattata;
    document.getElementById('status-intervento').value = interventiData[0].status;
    
    const container = document.getElementById('righe-intervento');
    container.innerHTML = ''; 

    interventiData.forEach(r => {
        aggiungiRigaLavoro();
        const ultimeRighe = container.querySelectorAll('.riga-lavoro');
        const ultima = ultimeRighe[ultimeRighe.length - 1];
        ultima.querySelector('.in-lavoro').value = r.lavoro;
        ultima.querySelector('.in-pianta').value = r.pianta;
        ultima.querySelector('.in-note').value = r.note;
    });
}

async function salvaIntervento() {
    const btn = document.querySelector('#editor-intervento .btn-save');
    const righe = document.querySelectorAll('.riga-lavoro');
    let dettagli = [];
    
    righe.forEach(r => {
        const lavoro = r.querySelector('.in-lavoro').value;
        const pianta = r.querySelector('.in-pianta').value;
        const note = r.querySelector('.in-note').value;
        if(lavoro.trim() !== "" || pianta.trim() !== "") {
            dettagli.push({ lavoro, pianta, note });
        }
    });
    
    if (dettagli.length === 0) { 
        alert("Inserisci almeno un dettaglio."); 
        return; 
    }
    
    const payload = {
        tipo: "NUOVO_INTERVENTO",
        cliente: clienteSelezionato,
        data: document.getElementById('data-intervento').value,
        status: document.getElementById('status-intervento').value,
        dettagli: dettagli
    };

    btn.innerText = "AGGIORNAMENTO..."; 
    btn.disabled = true;

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await fetch(WEB_APP_URL);
        const data = await response.json();
        tuttiGliInterventi = data.interventi || [];
        alert("Intervento aggiornato!");
        apriDettagli(clienteSelezionato);
    } catch (e) { 
        alert("Errore salvataggio."); 
    } finally { 
        btn.innerText = "SALVA INTERVENTO"; 
        btn.disabled = false; 
    }
}

async function eliminaIntervento(dataDaEliminare) {
    if (confirm("Sei sicuro di voler cancellare questo intervento?")) {
        const payload = {
            tipo: "ELIMINA_INTERVENTO",
            cliente: clienteSelezionato,
            data: dataDaEliminare
        };
        try {
            await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
            alert("Intervento eliminato.");
            tuttiGliInterventi = tuttiGliInterventi.filter(i => !(i.cliente === clienteSelezionato && i.data === dataDaEliminare));
            apriDettagli(clienteSelezionato);
        } catch (e) { alert("Errore eliminazione."); }
    }
}

async function inviaACalendario(dataIntervento, lavoro, piante, note) {
    // 1. Recupero info cliente (per indirizzo e GPS)
    const infoCliente = tuttiIClienti.find(c => c.cliente === clienteSelezionato);
    
    // 2. Messaggio di conferma visivo
    alert("Invio al calendario: " + (lavoro || "Intervento") + " del " + dataIntervento);

    const payload = {
        tipo: "AGGIUNGI_CALENDARIO",
        cliente: clienteSelezionato,
        data: dataIntervento,
        lavoro: lavoro || "Intervento", // Evita che sia vuoto
        pianta: piante || "-",
        note: note || "-",
        indirizzo: infoCliente ? infoCliente.indirizzo : "",
        gps: infoCliente ? infoCliente.gps : ""
    };

    try {
        // Rimuoviamo temporaneamente 'no-cors' per vedere se il browser ci segnala errori
        const response = await fetch(WEB_APP_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        
        alert("Richiesta inviata! Controlla il calendario tra pochi secondi.");
    } catch (e) { 
        console.error("Errore invio:", e);
        alert("Errore nell'invio: " + e.message); 
    }
}
