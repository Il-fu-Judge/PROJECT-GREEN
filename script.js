// 1. CONFIGURAZIONE
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzwG89iXCulcB_aDOyOstiUMYuI2CtYLdpK840eQUbW_OregmibcXfxeJSpO3k4xl7Tug/exec";

let recognition;
let tuttiIClienti = [];
let tuttiGliInterventi = [];
let clienteSelezionato = "";
let idInModifica = null; // Terrà traccia se stiamo creando un nuovo intervento o modificandone uno esistente

// Funzione per cambiare visualizzazione tra le pagine
function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    // Forza lo scroll all'inizio quando si apre l'editor
    const righeCont = document.getElementById('righe-intervento');
    if (righeCont) righeCont.scrollTop = 0;
    
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

    // Raggruppiamo per ID (Colonna A del foglio)
    const raggruppati = {};
    interventiCliente.forEach(i => {
        const idKey = i.id; 
        if (!raggruppati[idKey]) {
            raggruppati[idKey] = { 
                data: i.data, 
                ora: i.ora, 
                status: i.status, 
                righe: [] 
            };
        }
        raggruppati[idKey].righe.push(i);
    });

    // Trasformiamo in array per ordinarli dal più recente (basandoci sull'ID o sulla data)
    const listaIds = Object.keys(raggruppati).sort((a, b) => b.localeCompare(a));

    listaIds.forEach(id => {
        const info = raggruppati[id];
        const isCompletato = info.status === "Completato";
        
        const box = document.createElement('div');
        box.className = 'scheda-cliente';
        box.style.borderLeft = isCompletato ? "6px solid #d32f2f" : "6px solid #2e7d32";

        let elenco = info.righe.map(r => `<li><b>${r.lavoro}</b> su ${r.pianta}</li>`).join('');
        const statusClass = isCompletato ? "status-completato" : "status-da-fare";

        // Preparazione dati per i pulsanti (usiamo il primo rigo del gruppo)
        const r0 = info.righe[0];
        const lavS = r0.lavoro.replace(/'/g, "\\'");
        const piaS = r0.pianta.replace(/'/g, "\\'");
        const notS = (r0.note || "").replace(/'/g, "\\'");

        box.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="font-weight:bold;">${new Date(info.data).toLocaleDateString('it-IT')}</span>
                    <span style="margin-left:10px; font-size:14px; color:#666;">
                        <i class="far fa-clock"></i> ${info.ora || "--:--"}
                    </span>
                </div>
                <span class="badge-status ${statusClass}">${info.status}</span>
            </div>
            <ul style="margin:10px 0; padding-left:20px; font-size:15px;">${elenco}</ul>
            <p class="nota-intervento">${r0.note || ""}</p>
            
            <div class="azioni-intervento">
                <button class="btn-icon-action" title="Calendario" 
                    onclick="inviaACalendario('${info.data}', '${lavS}', '${piaS}', '${notS}')">
                    <i class="fas fa-calendar-plus" style="color: #4285F4;"></i>
                </button>

                <button class="btn-icon-action" onclick="caricaInterventoPerModifica('${id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon-action btn-delete" onclick="eliminaIntervento('${id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        container.appendChild(box);
    });
}

function nuovoIntervento() {
    idInModifica = null; // Reset dell'ID perché è un nuovo lavoro
    mostraPagina('editor-intervento');
    document.getElementById('righe-intervento').innerHTML = '';
    document.getElementById('data-intervento').valueAsDate = new Date();
    document.getElementById('ora-intervento').value = ""; // Pulisce l'ora
    aggiungiRigaLavoro();
}

function aggiungiRigaLavoro() {
    const container = document.getElementById('righe-intervento');
    const rigaId = Date.now();
    const div = document.createElement('div');
    div.className = 'riga-lavoro';
    div.innerHTML = `
        <button onclick="this.parentElement.remove(); aggiornaContatoreLavori();" style="position:absolute; top:10px; right:10px; border:none; background:none; color:red;"><i class="fas fa-trash"></i></button>
        <div class="mini-input-group"><label>Lavoro</label><div class="campo-intervento-row"><input type="text" class="in-lavoro" id="l-${rigaId}"><button onclick="avviaVocale('l-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>
        <div class="mini-input-group"><label>Pianta</label><div class="campo-intervento-row"><input type="text" class="in-pianta" id="p-${rigaId}"><button onclick="avviaVocale('p-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>
        <div class="mini-input-group"><label>Note</label><div class="campo-intervento-row"><textarea class="in-note" id="n-${rigaId}"></textarea><button onclick="avviaVocale('n-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>`;
    container.appendChild(div);
    aggiornaContatoreLavori();
}

function caricaInterventoPerModifica(idUnico) {
    idInModifica = idUnico; // <--- Memorizziamo l'ID che stiamo toccando
    const interventiData = tuttiGliInterventi.filter(i => i.id === idUnico);
    
    if (interventiData.length === 0) { alert("Intervento non trovato."); return; }

    mostraPagina('editor-intervento');
    const intervento = interventiData[0];
    
    // Formattazione data sicura
    const d = new Date(intervento.data);
    const dataFormattata = d.getFullYear() + '-' + 
                           String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(d.getDate()).padStart(2, '0');
    
    document.getElementById('data-intervento').value = dataFormattata;
    document.getElementById('ora-intervento').value = intervento.ora || "";
    document.getElementById('status-intervento').value = intervento.status;
    
    const container = document.getElementById('righe-intervento');
    container.innerHTML = ''; 

    interventiData.forEach(r => {
        const rigaId = Math.random().toString(36).substr(2, 9);
        const div = document.createElement('div');
        div.className = 'riga-lavoro';
        div.innerHTML = `
            <button onclick="this.parentElement.remove(); aggiornaContatoreLavori();" style="position:absolute; top:10px; right:10px; border:none; background:none; color:red;"><i class="fas fa-trash"></i></button>
            <div class="mini-input-group"><label>Lavoro</label><div class="campo-intervento-row"><input type="text" class="in-lavoro" id="l-${rigaId}"><button onclick="avviaVocale('l-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>
            <div class="mini-input-group"><label>Pianta</label><div class="campo-intervento-row"><input type="text" class="in-pianta" id="p-${rigaId}"><button onclick="avviaVocale('p-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>
            <div class="mini-input-group"><label>Note</label><div class="campo-intervento-row"><textarea class="in-note" id="n-${rigaId}"></textarea><button onclick="avviaVocale('n-${rigaId}')" class="btn-icon"><i class="fas fa-microphone"></i></button></div></div>`;
        container.appendChild(div);
        div.querySelector('.in-lavoro').value = r.lavoro;
        div.querySelector('.in-pianta').value = r.pianta;
        div.querySelector('.in-note').value = r.note;
    });
    aggiornaContatoreLavori();
}

async function salvaIntervento() {
    const btn = document.querySelector('#editor-intervento .btn-save');
    const righe = document.querySelectorAll('.riga-lavoro');
    const dataIntervento = document.getElementById('data-intervento').value;
    const oraIntervento = document.getElementById('ora-intervento').value;
    const statusIntervento = document.getElementById('status-intervento').value;
    
    let dettagli = [];
    righe.forEach(r => {
        const lavoro = r.querySelector('.in-lavoro').value;
        const pianta = r.querySelector('.in-pianta').value;
        const note = r.querySelector('.in-note').value;
        if(lavoro.trim() !== "" || pianta.trim() !== "") {
            dettagli.push({ lavoro, pianta, note });
        }
    });

    if (dettagli.length === 0) { alert("Inserisci almeno un dettaglio."); return; }

    const payload = {
        tipo: "NUOVO_INTERVENTO",
        idInModifica: idInModifica, // <--- Se è null, lo script crea un nuovo ID. Se c'è, lo sovrascrive.
        cliente: clienteSelezionato,
        data: dataIntervento,
        ora: oraIntervento,
        status: statusIntervento,
        dettagli: dettagli
    };

    btn.innerText = "SALVATAGGIO..."; 
    btn.disabled = true;

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        await new Promise(resolve => setTimeout(resolve, 1200)); // Pausa tecnica per il DB
        alert(idInModifica ? "Intervento aggiornato!" : "Nuovo intervento salvato!");
        idInModifica = null; // Reset fondamentale
        apriGestione(); 
    } catch (e) { 
        alert("Errore: " + e.message); 
    } finally { 
        btn.innerText = "SALVA INTERVENTO"; 
        btn.disabled = false; 
    }
}

async function eliminaIntervento(id) {
    if (!confirm("Vuoi eliminare definitivamente questo intervento?")) return;

    const payload = {
        tipo: "ELIMINA_INTERVENTO",
        id: id // Inviamo l'ID unico al Google Script
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify(payload) });
        alert("Intervento eliminato!");
        apriGestione(); // Ricarica tutto
    } catch (e) {
        alert("Errore: " + e.message);
    }
}

async function inviaACalendario(dataIntervento, lavoro, piante, note) {
    // 1. Leggiamo la data direttamente dall'input HTML per essere sicuri che sia TESTO puro
    const dataDalCampo = document.getElementById('data-intervento').value; // Restituisce "YYYY-MM-DD"
    const oraDalCampo = document.getElementById('ora-intervento').value || "08:00";

    if (!dataDalCampo) {
        alert("Seleziona prima una data.");
        return;
    }

    // 2. Componiamo la stringa senza passare per oggetti Date di Javascript
    // Risultato esatto: "2026-03-18T09:30:00"
    const dataOraCompleta = `${dataDalCampo}T${oraDalCampo}:00`;

    // 3. ALERT DI CONTROLLO (Verifichiamo che dica la data giusta)
    alert("Sto inviando al database: " + dataOraCompleta);

    const infoCliente = tuttiIClienti.find(c => c.cliente === clienteSelezionato);
    
    const payload = {
        tipo: "AGGIUNGI_CALENDARIO",
        cliente: clienteSelezionato,
        data: dataOraCompleta,
        lavoro: lavoro || "Intervento",
        pianta: piante || "-",
        note: note || "-",
        indirizzo: infoCliente ? infoCliente.indirizzo : "",
        gps: infoCliente ? infoCliente.gps : ""
    };

    try {
        const response = await fetch(WEB_APP_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        alert("Operazione completata!");
    } catch (e) { 
        alert("Errore: " + e.message); 
    }
}

function aggiornaContatoreLavori() {
    const contenitore = document.getElementById('righe-intervento');
    const righe = contenitore.querySelectorAll('.riga-lavoro');
    const totale = righe.length;
    const contatoreTop = document.getElementById('contatore-lavori');

    righe.forEach((riga, index) => {
        let titoloBox = riga.querySelector('.titolo-box-lavoro');
        if (!titoloBox) {
            titoloBox = document.createElement('div');
            titoloBox.className = 'titolo-box-lavoro';
            riga.prepend(titoloBox);
        }
        titoloBox.innerText = `LAVORO ${index + 1} DI ${totale}`;
    });

    if (contatoreTop) {
        contatoreTop.innerText = `1 / ${totale}`;
    }

// Sostituisci solo la parte onscroll dentro aggiornaContatoreLavori
contenitore.onscroll = function() {
    const righe = contenitore.querySelectorAll('.riga-lavoro');
    const contenitoreRect = contenitore.getBoundingClientRect();
    const centroContenitore = contenitoreRect.top + (contenitoreRect.height / 2);

    let indexCorrente = 0;
    let minDistanza = Infinity;

    righe.forEach((riga, i) => {
        const rigaRect = riga.getBoundingClientRect();
        const centroRiga = rigaRect.top + (rigaRect.height / 2);
        const distanza = Math.abs(centroContenitore - centroRiga);

        if (distanza < minDistanza) {
            minDistanza = distanza;
            indexCorrente = i;
        }
    });

    if (contatoreTop) {
        contatoreTop.innerText = `${indexCorrente + 1} / ${totale}`;
        }
    };
}
