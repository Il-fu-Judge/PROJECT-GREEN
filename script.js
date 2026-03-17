// 1. CONFIGURAZIONE
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzePV3FylbP4hfbR70GOWgzl8Drv3a7f4tYN43gNLSwKGNR7N11XsyoQ96pvBP_-vbC8A/exec";

let recognition;
let tuttiIClienti = [];
let tuttiGliInterventi = [];
let clienteSelezionato = "";

// Funzione per cambiare visualizzazione tra le pagine
function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
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
        if (campoId === 'telefono') testo = testo.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        document.getElementById(campoId).value = testo;
    };
    recognition.onend = () => document.getElementById('status-vocale').classList.add('hidden');
    recognition.start();
}

function stopVocale() {
    if (recognition) recognition.stop();
    document.getElementById('status-vocale').classList.add('hidden');
}

// 3. LOGICA GPS
function ottieniPosizione() {
    const btnPos = document.querySelector('.fa-crosshairs').parentElement;
    btnPos.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        document.getElementById('gps-coords').value = `${lat},${lon}`;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const a = data.address;
            document.getElementById('indirizzo').value = `${a.road || ""}${a.house_number ? " " + a.house_number : ""}, ${a.village || a.town || a.city || ""}`.trim().replace(/^, /, "");
        } catch (e) { alert("Errore indirizzo"); }
        finally { btnPos.innerHTML = '<i class="fas fa-crosshairs"></i>'; }
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
    if (!dati.cliente) { alert("Nome obbligatorio"); return; }
    btn.innerText = "INVIO..."; btn.disabled = true;
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dati) });
        alert("Cliente salvato!");
        document.querySelectorAll('#nuovo-cliente input').forEach(i => i.value = "");
        mostraPagina('home');
    } catch (e) { alert("Errore invio"); }
    finally { btn.innerText = "SALVA NEL DATABASE"; btn.disabled = false; }
}

// 5. GESTIONE E LISTA CLIENTI
async function apriGestione() {
    mostraPagina('gestione-cliente');
    const listaDiv = document.getElementById('lista-clienti');
