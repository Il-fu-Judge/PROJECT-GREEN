const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz_QpIHSYl_zDtzUAR6dHRy8AqC-_nx3HUTpuZPmucM1NBxmwQtq_PXi6y93Nesc-4Raw/exec";

let recognition;

function mostraPagina(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// MICROFONO
function avviaVocale(campoId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Browser non supportato");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    
    document.getElementById('status-vocale').classList.remove('hidden');

    recognition.onresult = (event) => {
        document.getElementById(campoId).value = event.results[0][0].transcript;
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

// GPS PULITO
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
            
            // Costruzione indirizzo semplificato
            const via = a.road || "";
            const civ = a.house_number ? " " + a.house_number : "";
            const loc = a.village || a.town || a.city || "";
            
            document.getElementById('indirizzo').value = `${via}${civ}, ${loc}`.trim().replace(/^,/, '');
        } catch (e) {
            alert("GPS ok, errore nome via");
        } finally {
            btnPos.innerHTML = '<i class="fas fa-crosshairs"></i>';
        }
    }, () => {
        alert("Attiva il GPS");
        btnPos.innerHTML = '<i class="fas fa-crosshairs"></i>';
    });
}

// SALVATAGGIO
async function salvaDati() {
    const btn = document.getElementById('btn-salva');
    const dati = {
        cliente: document.getElementById('cliente').value,
        telefono: document.getElementById('telefono').value,
        indirizzo: document.getElementById('indirizzo').value,
        gps: document.getElementById('gps-coords').value
    };

    if (!dati.cliente) { alert("Manca il nome!"); return; }

    btn.innerText = "SALVATAGGIO...";
    btn.disabled = true;

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(dati)
        });
        alert("Salvato!");
        document.querySelectorAll('input').forEach(i => i.value = "");
        mostraPagina('home');
    } catch (e) {
        alert("Errore");
    } finally {
        btn.innerText = "SALVA NEL DATABASE";
        btn.disabled = false;
    }
}
