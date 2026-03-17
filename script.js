        // 1. CONFIGURAZIONE: Incolla qui l'URL della tua Web App di Google
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzZwgDXrBR-_zpNNd69wO0BlGhy4LIRbKPwN7xxDTpn4UZAh30bpZYkg4GvBnEz30HO2w/exec";

let recognition;

// Navigazione tra le pagine
function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// LOGICA GPS OTTIMIZZATA
function ottieniPosizione() {
    const btnPos = document.querySelector('.fa-crosshairs').parentElement;
    const iconaOriginale = btnPos.innerHTML;
    btnPos.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        document.getElementById('gps-coords').value = lat + "," + lon;

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            
            // Estraiamo solo i pezzi che ti servono
            const a = data.address;
            const via = a.road || "";
            const civico = a.house_number || "";
            const paese = a.village || a.town || a.hamlet || ""; // Comune o frazione
            const citta = a.city || a.county || ""; // Città o provincia

            const indirizzoPulito = `${via} ${civico}, ${paese} ${citta}`.replace(/^ ,/, '').trim();
            document.getElementById('indirizzo').value = indirizzoPulito;
            
        } catch (e) {
            alert("Coordinate GPS salvate, ma errore nel tradurre l'indirizzo.");
        } finally {
            btnPos.innerHTML = iconaOriginale;
        }
    }, (error) => {
        alert("Attiva il GPS per usare questa funzione.");
        btnPos.innerHTML = iconaOriginale;
    }, { timeout: 10000, enableHighAccuracy: true });
}

// LOGICA SALVATAGGIO (Status e Data vuoti)
async function salvaDati() {
    const btn = document.getElementById('btn-salva');
    const dati = {
        cliente: document.getElementById('cliente').value,
        telefono: document.getElementById('telefono').value,
        indirizzo: document.getElementById('indirizzo').value,
        gps: document.getElementById('gps-coords').value
    };

    if (!dati.cliente) { alert("Il nome cliente è obbligatorio."); return; }

    btn.innerText = "INVIO IN CORSO...";
    btn.disabled = true;

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(dati)
        });

        alert("Salvato correttamente!");
        document.querySelectorAll('input').forEach(i => i.value = "");
        mostraPagina('home');

    } catch (e) {
        alert("Errore invio.");
    } finally {
        btn.innerText = "SALVA NEL DATABASE";
        btn.disabled = false;
    }
}
