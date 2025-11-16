// --- 0. KONFIGURASI DAN INISIALISASI FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyAc79DeK_4PerZU0y0PHOdkktByXrQETEc",
    authDomain: "kot2025-9f977.firebaseapp.com",
    projectId: "kot2025-9f977",
    storageBucket: "kot2025-9f977.firebasestorage.app",
    messagingSenderId: "447340488198",
    appId: "1:447340488198:web:5400db0aa4f3c91e834587",
    measurementId: "G-HY26QLXZ3F"
};

// 🌟 PERUBAHAN UTAMA: Menggunakan sintaks 'compat' yang sesuai dengan CDN dalam index.html
// Inisialisasi Firebase App
const app = firebase.initializeApp(firebaseConfig);
// Akses Firestore melalui objek 'app'
const db = app.firestore(); 

// --- Data Global yang akan digunakan di seluruh aplikasi ---
let participants = [];
// eventResults kini akan dimuatkan/disimpan dari Firestore, bukan localStorage
let eventResults = {};
let championshipRecords = []; // Data untuk Rekod Kejohanan
const TRACK_EVENTS = ["100 METER", "200 METER", "100 METER BERPAGAR"];
const FIELD_DISTANCE_EVENTS = ["LOMPAT JAUH", "LONTAR PELURU"];
const FIELD_HEIGHT_EVENTS = ["LOMPAT TINGGI"];
const RELAY_EVENT = "4X100 METER";


// --- 1. Fungsi Utama Navigasi ---
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(div => {
        div.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="showTab('${tabId}')"]`).classList.add('active');

    // Kemaskini dropdown/analisis setiap kali tab ditukar
    if (tabId === 'balapan' || tabId === 'padangJarak' || tabId === 'padangTinggi' || tabId === 'relay') {
        populateDropdowns();
    } else if (tabId === 'analisis') {
        populateAnalysisDropdowns();
        // Pastikan results dimuatkan sebelum analisis
        loadEventResultsFromFirebase().then(() => {
            runHouseAnalysis();
            displayWinners();
        });
    }
}

// --- 2. FUNGSI FIREBASE: Pemuatan dan Penyimpanan Data ---

/**
 * Muat data peserta dari Firestore. Jika tiada, muat dari data.csv dan simpan ke Firestore.
 */
async function loadParticipantsFromFirebase() {
    console.log("Memuatkan data peserta...");
    try {
        // Menggunakan sintaks 'compat'
        const docRef = db.collection("configuration").doc("participants");
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            // Data wujud di Firestore, gunakan data tersebut
            participants = docSnap.data().list || [];
            console.log(`Peserta berjaya dimuatkan dari Firestore: ${participants.length} rekod.`);
        } else {
            // Tiada data di Firestore, muat dari CSV dan simpan.
            console.log("Peserta tiada di Firestore. Memuatkan dari data.csv...");
            await loadParticipantsFromCSV(); // Muat dari fail tempatan
            await saveParticipantsToFirebase(); // Simpan ke Firestore
        }
        
        // Panggil fungsi yang memerlukan data peserta setelah data dimuat
        populateDropdowns(); 
        populateAnalysisDropdowns();
        populateTablePeserta(); // 🌟 Tambahan: Paparkan jadual peserta di tab Pengurusan

    } catch (error) {
        console.error("Ralat memuatkan peserta dari Firebase/CSV:", error);
        alert("Ralat memuatkan data peserta. Sila semak konsol.");
    }
}

/**
 * Muat data peserta dari fail data.csv (PapaParse)
 */
function loadParticipantsFromCSV() {
    return new Promise((resolve, reject) => {
        Papa.parse('data.csv', {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                participants = results.data.map(p => ({
                    // Pastikan semua field wujud, tetapkan nilai lalai jika null/undefined
                    IDPeserta: p.IDPeserta || '',
                    NamaPenuh: p.NamaPenuh || '',
                    RumahSukan: p.RumahSukan || '',
                    Jantina: p.Jantina || '',
                    UmurKAtegori: p.UmurKAtegori || '',
                    Acara1: p.Acara1 || '',
                    Acara2: p.Acara2 || '',
                    Acara3: p.Acara3 || '',
                    AcaraRelay: p.AcaraRelay || ''
                }));
                console.log(`Peserta berjaya dimuatkan dari data.csv: ${participants.length} rekod.`);
                resolve();
            },
            error: function (err) {
                console.error("Ralat PapaParse (data.csv):", err);
                reject(err);
            }
        });
    });
}

/**
 * Simpan data peserta semasa ke Firestore.
 * 🌟 Fungsi ini sebelum ini tidak wujud atau hilang.
 */
async function saveParticipantsToFirebase() {
    try {
        // Menggunakan sintaks 'compat'
        await db.collection("configuration").doc("participants").set({ list: participants });
        console.log("Peserta berjaya disimpan ke Firestore.");
    } catch (error) {
        console.error("Ralat menyimpan peserta ke Firebase:", error);
        alert("Ralat menyimpan data peserta. Sila semak konsol.");
    }
}

/**
 * Fungsi Penuh untuk Butang Muat Semula CSV & Simpan ke Firebase.
 */
async function loadParticipantsFromCSVAndSave() {
    if (confirm("Adakah anda PASTI ingin memuat semula data peserta dari data.csv dan menimpanya ke Firestore? Tindakan ini akan mengemas kini senarai peserta sedia ada.")) {
        await loadParticipantsFromCSV(); // Muat dari fail CSV
        await saveParticipantsToFirebase(); // Simpan ke Firestore
        populateTablePeserta(); // Panggil fungsi untuk memaparkan jadual yang dikemas kini

        alert("Data peserta berjaya dimuat semula dan disimpan ke Firebase.");
        showTab('peserta');
    }
}


/**
 * Muat keputusan acara dari Firestore.
 */
async function loadEventResultsFromFirebase() {
    console.log("Memuatkan keputusan acara...");
    try {
        // Menggunakan sintaks 'compat'
        const docRef = db.collection("results").doc("championship");
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            eventResults = docSnap.data();
            console.log("Keputusan acara berjaya dimuatkan dari Firestore.");
        } else {
            // Dokumen belum wujud
            eventResults = {};
            console.log("Tiada keputusan acara ditemui di Firestore. Mula dengan data kosong.");
        }
    } catch (error) {
        console.error("Ralat memuatkan keputusan acara dari Firebase:", error);
        alert("Ralat memuatkan keputusan acara. Sila semak konsol.");
    }
}

/**
 * Simpan keputusan acara semasa ke Firestore.
 */
async function saveEventResultsToFirebase() {
    try {
        // Menggunakan sintaks 'compat'
        await db.collection("results").doc("championship").set(eventResults);
        console.log("Keputusan acara berjaya disimpan ke Firestore.");
    } catch (error) {
        console.error("Ralat menyimpan keputusan acara ke Firebase:", error);
        alert("Ralat menyimpan keputusan acara. Sila semak konsol.");
    }
}

/**
 * Muat data rekod kejohanan dari fail rekod.csv (statis).
 */
function loadChampionshipRecords() {
    Papa.parse('rekod.csv', {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            championshipRecords = results.data;
            console.log(`Rekod kejohanan berjaya dimuatkan: ${championshipRecords.length} rekod.`);
            
            // Jika dalam tab analisis, kemas kini paparan
            if (document.getElementById('analisis').classList.contains('active')) {
                displayWinners(); 
            }
        },
        error: function (err) {
            console.error("Ralat PapaParse (rekod.csv):", err);
        }
    });
}

/**
 * Fungsi untuk mengesahkan dan mereset SEMUA keputusan acara.
 * 🌟 Diperlukan untuk butang PADAM/RESET.
 */
async function resetAllDataConfirmation() {
    if (confirm("AMARAN: Adakah anda PASTI ingin PADAM SEMUA Keputusan Acara (markah, kedudukan) dalam pangkalan data Firestore? Tindakan ini tidak boleh diundur.")) {
        await resetAllEventResults();
    }
}

async function resetAllEventResults() {
    try {
        // Tetapkan eventResults kepada objek kosong dalam memori
        eventResults = {};
        
        // Simpan objek kosong ke Firestore untuk menimpa semua keputusan sedia ada
        await db.collection("results").doc("championship").set(eventResults);

        console.log("Semua keputusan acara berjaya direset dalam Firestore.");
        alert("Semua keputusan acara telah dipadamkan (RESET). Sila muat semula tab 'Analisis' untuk melihat kesan.");
        
        // Muat semula paparan Analisis jika aktif
        if (document.getElementById('analisis').classList.contains('active')) {
             loadEventResultsFromFirebase().then(() => {
                runHouseAnalysis();
                displayWinners();
            });
        }
    } catch (error) {
        console.error("Ralat mereset data keputusan:", error);
        alert("Ralat mereset data. Sila semak konsol.");
    }
}


// --- 3. FUNGSI SOKONGAN UTAMA (Dikekalkan & Diperluaskan) ---

// Mendapatkan senarai unik acara berdasarkan jenis tab
function getUniqueEvents(tabId) {
    if (tabId === 'balapan') return TRACK_EVENTS;
    if (tabId === 'padangJarak') return FIELD_DISTANCE_EVENTS;
    if (tabId === 'padangTinggi') return FIELD_HEIGHT_EVENTS;
    return [];
}

// Fungsi untuk mengisi dropdown (kecuali analisis)
function populateDropdowns() {
    const uniqueUmur = [...new Set(participants.map(p => p.UmurKAtegori))].filter(u => u);
    const uniqueJantina = [...new Set(participants.map(p => p.Jantina))].filter(j => j);

    ['track', 'distance', 'height'].forEach(prefix => {
        const eventSelect = document.getElementById(`${prefix}Event`);
        const umurSelect = document.getElementById(`${prefix}Umur`);
        const jantinaSelect = document.getElementById(`${prefix}Jantina`);

        if (eventSelect) {
            const events = getUniqueEvents(eventSelect.parentElement.parentElement.id);
            eventSelect.innerHTML = events.map(e => `<option value="${e}">${e}</option>`).join('');
        }

        if (umurSelect) umurSelect.innerHTML = uniqueUmur.map(u => `<option value="${u}">${u}</option>`).join('');
        if (jantinaSelect) jantinaSelect.innerHTML = uniqueJantina.map(j => `<option value="${j}">${j}</option>`).join('');
    });

    // Relay dropdown
    const relayUmurSelect = document.getElementById('relayUmur');
    const relayJantinaSelect = document.getElementById('relayJantina');
    if (relayUmurSelect) relayUmurSelect.innerHTML = uniqueUmur.map(u => `<option value="${u}">${u}</option>`).join('');
    if (relayJantinaSelect) relayJantinaSelect.innerHTML = uniqueJantina.map(j => `<option value="${j}">${j}</option>`).join('');

    // Trigger pemuatan awal jadual
    const activeTabId = document.querySelector('.tab-content.active').id;
    if (['balapan', 'padangJarak', 'padangTinggi'].includes(activeTabId)) {
        populateParticipantTable(activeTabId);
    } else if (activeTabId === 'relay') {
        populateRelayTable();
    }
}

// Fungsi untuk mengisi dropdown analisis
function populateAnalysisDropdowns() {
    const uniqueUmur = ['Semua', ...new Set(participants.map(p => p.UmurKAtegori))].filter(u => u);
    const uniqueJantina = ['Semua', ...new Set(participants.map(p => p.Jantina))].filter(j => j);
    
    const jantinaAnalisis = document.getElementById('jantinaAnalisis');
    const umurAnalisis = document.getElementById('umurAnalisis');
    
    if (jantinaAnalisis) jantinaAnalisis.innerHTML = uniqueJantina.map(j => `<option value="${j}">${j}</option>`).join('');
    if (umurAnalisis) umurAnalisis.innerHTML = uniqueUmur.map(u => `<option value="${u}">${u}</option>`).join('');
}

/**
 * 🌟 Fungsi baru: Memaparkan semua peserta dalam bentuk jadual di tab 'Pengurusan Peserta'.
 */
function populateTablePeserta() {
    const pesertaTableDiv = document.getElementById('pesertaTable');
    if (!pesertaTableDiv || participants.length === 0) {
        if (pesertaTableDiv) pesertaTableDiv.textContent = 'Tiada data peserta ditemui.';
        return;
    }

    let html = `
        <table>
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nama</th>
                    <th>Rumah Sukan</th>
                    <th>Umur</th>
                    <th>Acara 1</th>
                    <th>Acara 2</th>
                    <th>Acara 3</th>
                    <th>Relay</th>
                </tr>
            </thead>
            <tbody>
    `;

    participants.forEach(p => {
        html += `
            <tr>
                <td>${p.IDPeserta}</td>
                <td>${p.NamaPenuh}</td>
                <td>${p.RumahSukan}</td>
                <td>${p.UmurKAtegori}</td>
                <td>${p.Acara1}</td>
                <td>${p.Acara2}</td>
                <td>${p.Acara3}</td>
                <td>${p.AcaraRelay}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    pesertaTableDiv.innerHTML = html;
}

// Mendapatkan data rekod untuk acara tertentu
function getRecord(eventName, umur, jantina) {
    const fullEventName = `${eventName} ${jantina} ${umur}`;
    const record = championshipRecords.find(r => r.ACARA === fullEventName);
    return record ? { rekod: record.REKOD, tahun: record['TAHUN DICATAT'], nama: record['NAMA PEMEGANG REKOD'] } : null;
}

// Menjana Kunci Acara (Event Key) untuk Firebase
function generateEventKey(eventName, umur, jantina) {
    return `${eventName.replace(/\s/g, '_')}_${jantina.replace(/\s/g, '_')}_${umur.replace(/\s/g, '_')}`;
}

// --- 4. FUNGSI PENGURUSAN KEPUTUSAN (Disesuaikan untuk Firebase) ---

// Mengisi jadual peserta berdasarkan dropdown
function populateParticipantTable(tabId) {
    const prefix = tabId === 'balapan' ? 'track' : (tabId === 'padangJarak' ? 'distance' : 'height');
    
    const eventName = document.getElementById(`${prefix}Event`)?.value;
    const jantina = document.getElementById(`${prefix}Jantina`)?.value;
    const umur = document.getElementById(`${prefix}Umur`)?.value;
    const resultsDiv = document.getElementById(`${prefix}Results`);

    if (!eventName || !jantina || !umur || !resultsDiv) return;

    const eventKey = generateEventKey(eventName, umur, jantina);
    const existingResults = eventResults[eventKey] || [];
    const isDistance = FIELD_DISTANCE_EVENTS.includes(eventName) || FIELD_HEIGHT_EVENTS.includes(eventName);

    const filteredParticipants = participants.filter(p =>
        (p.Acara1 === eventName || p.Acara2 === eventName || p.Acara3 === eventName) &&
        p.Jantina === jantina &&
        p.UmurKAtegori === umur
    ).sort((a, b) => a.NamaPenuh.localeCompare(b.NamaPenuh));

    let html = `
        <h3>${eventName} ${jantina} ${umur}</h3>
        <p>Rekod Kejohanan: 
            ${getRecord(eventName, umur, jantina) 
                ? `**${getRecord(eventName, umur, jantina).rekod}** (${getRecord(eventName, umur, jantina).tahun} oleh ${getRecord(eventName, umur, jantina).nama})` 
                : 'Tiada Rekod Ditemui'}
        </p>
        <table>
            <thead>
                <tr>
                    <th>No.</th>
                    <th>ID Peserta</th>
                    <th>Nama Penuh</th>
                    <th>Rumah Sukan</th>
                    <th>Masa / Jarak Terbaik (${isDistance ? 'Meter' : 'Minit:Saat:Milisat'})</th>
                    <th>Kedudukan</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredParticipants.forEach((p, index) => {
        const result = existingResults.find(r => r.IDPeserta === p.IDPeserta);
        const inputType = isDistance ? 'number' : 'text';
        const placeholder = isDistance ? 'Contoh: 3.55 (Meter)' : 'Contoh: 00:00:15:30';
        
        html += `
            <tr data-id="${p.IDPeserta}">
                <td>${index + 1}</td>
                <td>${p.IDPeserta}</td>
                <td>${p.NamaPenuh}</td>
                <td>${p.RumahSukan}</td>
                <td>
                    <input type="${inputType}" class="result-input" data-is-distance="${isDistance}" 
                           value="${result ? (result.Result || '') : ''}" 
                           placeholder="${placeholder}">
                </td>
                <td>
                    <input type="number" class="rank-input" min="1" 
                           value="${result ? (result.Rank || '') : ''}" 
                           placeholder="1, 2, 3...">
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    resultsDiv.innerHTML = html;
}

// Menyimpan keputusan acara biasa ke Firebase
async function saveResults(tabId) {
    const prefix = tabId === 'balapan' ? 'track' : (tabId === 'padangJarak' ? 'distance' : 'height');
    
    const eventName = document.getElementById(`${prefix}Event`)?.value;
    const jantina = document.getElementById(`${prefix}Jantina`)?.value;
    const umur = document.getElementById(`${prefix}Umur`)?.value;
    const resultsDiv = document.getElementById(`${prefix}Results`);

    if (!eventName || !jantina || !umur) {
        alert("Sila pilih Acara, Jantina dan Kategori Umur.");
        return;
    }

    const eventKey = generateEventKey(eventName, umur, jantina);
    const rows = resultsDiv.querySelectorAll('tbody tr');
    let resultsToSave = [];

    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        const resultInput = row.querySelector('.result-input').value.trim();
        const rankInput = parseInt(row.querySelector('.rank-input').value.trim());
        const participant = participants.find(p => p.IDPeserta === id);
        
        if (resultInput || !isNaN(rankInput)) {
            resultsToSave.push({
                IDPeserta: id,
                NamaPenuh: participant.NamaPenuh,
                RumahSukan: participant.RumahSukan,
                Jantina: jantina,
                UmurKAtegori: umur,
                Event: eventName,
                Result: resultInput,
                Rank: isNaN(rankInput) ? null : rankInput
            });
        }
    });

    // Simpan ke pembolehubah global dan ke Firebase
    eventResults[eventKey] = resultsToSave;
    await saveEventResultsToFirebase();
    
    alert(`Keputusan ${eventName} ${jantina} ${umur} berjaya disimpan ke Firebase!`);
    populateParticipantTable(tabId); // Refresh jadual
}

// Fungsi Relay (diadaptasi untuk Firebase)
function populateRelayTable() {
    const jantina = document.getElementById('relayJantina')?.value;
    const umur = document.getElementById('relayUmur')?.value;
    const resultsDiv = document.getElementById('relayResults');

    if (!jantina || !umur || !resultsDiv) return;

    const eventKey = generateEventKey(RELAY_EVENT, umur, jantina);
    const existingResults = eventResults[eventKey] || [];

    const uniqueHouses = [...new Set(participants
        .filter(p => p.AcaraRelay === RELAY_EVENT && p.Jantina === jantina && p.UmurKAtegori === umur)
        .map(p => p.RumahSukan)
    )].filter(h => h);

    let html = `
        <h3>${RELAY_EVENT} ${jantina} ${umur}</h3>
        <table>
            <thead>
                <tr>
                    <th>Rumah Sukan</th>
                    <th>Masa (Minit:Saat:Milisat)</th>
                    <th>Kedudukan</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    uniqueHouses.forEach(house => {
        const result = existingResults.find(r => r.RumahSukan === house);
        
        html += `
            <tr data-house="${house}">
                <td>${house}</td>
                <td>
                    <input type="text" class="relay-result-input" 
                           value="${result ? (result.Result || '') : ''}" 
                           placeholder="Contoh: 00:01:05:40">
                </td>
                <td>
                    <input type="number" class="relay-rank-input" min="1" 
                           value="${result ? (result.Rank || '') : ''}" 
                           placeholder="1, 2, 3...">
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    resultsDiv.innerHTML = html;
}

// Menyimpan keputusan Relay ke Firebase
async function saveRelayResults() {
    const jantina = document.getElementById('relayJantina')?.value;
    const umur = document.getElementById('relayUmur')?.value;
    const resultsDiv = document.getElementById('relayResults');

    if (!jantina || !umur) {
        alert("Sila pilih Jantina dan Kategori Umur.");
        return;
    }

    const eventKey = generateEventKey(RELAY_EVENT, umur, jantina);
    const rows = resultsDiv.querySelectorAll('tbody tr');
    let resultsToSave = [];

    rows.forEach(row => {
        const house = row.getAttribute('data-house');
        const resultInput = row.querySelector('.relay-result-input').value.trim();
        const rankInput = parseInt(row.querySelector('.relay-rank-input').value.trim());
        
        if (resultInput || !isNaN(rankInput)) {
            resultsToSave.push({
                RumahSukan: house,
                Jantina: jantina,
                UmurKAtegori: umur,
                Event: RELAY_EVENT,
                Result: resultInput,
                Rank: isNaN(rankInput) ? null : rankInput
            });
        }
    });

    // Simpan ke pembolehubah global dan ke Firebase
    eventResults[eventKey] = resultsToSave;
    await saveEventResultsToFirebase();

    alert(`Keputusan Relay ${jantina} ${umur} berjaya disimpan ke Firebase!`);
    populateRelayTable(); // Refresh jadual
}

// --- 5. FUNGSI ANALISIS (Dikekalkan, tetapi menggunakan eventResults global yang dimuatkan dari Firebase) ---

// Fungsi utiliti untuk membandingkan masa/jarak
function compareResults(a, b, isDistance) {
    if (isDistance) {
        // Jarak: Lebih besar lebih baik (descending)
        const valA = parseFloat(a.Result);
        const valB = parseFloat(b.Result);
        if (isNaN(valA)) return 1;
        if (isNaN(valB)) return -1;
        return valB - valA;
    } else {
        // Masa: Lebih kecil lebih baik (ascending)
        const timeToMs = (time) => {
            const parts = time.split(':').map(Number);
            if (parts.length === 4) { // Min:Saat:Milisat
                return parts[0] * 60000 + parts[1] * 1000 + parts[2] * 10;
            } else if (parts.length === 3) { // Saat:Milisat
                 return parts[0] * 1000 + parts[1] * 10;
            }
            return Infinity; 
        };
        const msA = timeToMs(a.Result);
        const msB = timeToMs(b.Result);
        return msA - msB;
    }
}

// Fungsi untuk memaparkan senarai pemenang
function displayWinners() {
    const jantinaFilter = document.getElementById('jantinaAnalisis')?.value;
    const umurFilter = document.getElementById('umurAnalisis')?.value;
    const winnersListDiv = document.getElementById('winnersList');

    if (!winnersListDiv) return;

    winnersListDiv.innerHTML = '';
    
    let allWinnerHtml = '<h3>Senarai Pemenang Acara</h3>';

    Object.keys(eventResults).forEach(eventKey => {
        const results = eventResults[eventKey];
        if (results.length === 0) return;

        const { Event, Jantina, UmurKAtegori } = results[0];
        
        // Penapisan
        if (jantinaFilter !== 'Semua' && Jantina !== jantinaFilter) return;
        if (umurFilter !== 'Semua' && UmurKAtegori !== umurFilter) return;

        // Ambil pemenang 1, 2, 3
        const sortedResults = results.filter(r => r.Rank).sort((a, b) => a.Rank - b.Rank);
        const top3 = sortedResults.slice(0, 3);
        const isDistance = FIELD_DISTANCE_EVENTS.includes(Event) || FIELD_HEIGHT_EVENTS.includes(Event);
        const recordData = getRecord(Event, UmurKAtegori, Jantina);
        
        let winnerHtml = `
            <div class="event-result-container">
                <h4>🏅 ${Event} (${Jantina} ${UmurKAtegori}) </h4>
                ${recordData ? `<p class="record-info">**Rekod:** ${recordData.rekod} (${recordData.tahun})</p>` : ''}
                <ul>
        `;

        top3.forEach((winner, index) => {
            let resultDisplay = winner.Result;
            let note = '';
            
            // Semak jika rekod dipecahkan
            if (recordData) {
                if (isDistance) {
                    // Jarak: nilai semasa > rekod
                    if (parseFloat(resultDisplay) > parseFloat(recordData.rekod)) {
                        note = '**(MEMECAH REKOD BARU!)**';
                    }
                } else {
                    // Masa: masa semasa < rekod
                    // Pastikan compareResults tidak membandingkan dengan nilai null/undefined
                    if (winner.Result && compareResults(winner, { Result: recordData.rekod }, false) < 0) {
                        note = '**(MEMECAH REKOD BARU!)**';
                    }
                }
            }
            
            winnerHtml += `
                <li>
                    **Kedudukan ${winner.Rank}** (${winner.RumahSukan}): 
                    ${winner.NamaPenuh ? winner.NamaPenuh : winner.RumahSukan} - 
                    ${resultDisplay} ${note}
                </li>
            `;
        });
        
        winnerHtml += '</ul></div>';
        allWinnerHtml += winnerHtml;
    });

    winnersListDiv.innerHTML = allWinnerHtml;
}


// Fungsi untuk menjalankan analisis rumah sukan
function runHouseAnalysis() {
    const houseScores = {};
    const uniqueHouses = [...new Set(participants.map(p => p.RumahSukan))].filter(h => h);
    
    // Inisialisasi skor untuk setiap rumah sukan
    uniqueHouses.forEach(house => {
        houseScores[house] = { J1: 0, K2: 0, K3: 0, LL: 0, Total: 0 };
    });

    // Proses setiap acara dalam eventResults
    Object.values(eventResults).forEach(results => {
        results.forEach(result => {
            const rank = result.Rank;
            const house = result.RumahSukan;
            let points = 0;

            if (!houseScores[house]) return; // Skip jika rumah sukan tidak wujud
            
            switch (rank) {
                case 1:
                    points = 6;
                    houseScores[house].J1++;
                    break;
                case 2:
                    points = 4;
                    houseScores[house].K2++;
                    break;
                case 3:
                    points = 3;
                    houseScores[house].K3++;
                    break;
                default:
                    // Mata untuk tempat ke-4 dan seterusnya (jika Rank > 3)
                    if (rank > 3) {
                        points = 1;
                        houseScores[house].LL++;
                    }
                    break;
            }
            houseScores[house].Total += points;
        });
    });

    const tbody = document.getElementById('houseAnalysisTable')?.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let analysisData = [];
    for (const house in houseScores) {
        analysisData.push({
            house: house,
            ...houseScores[house]
        });
    }

    // Isih berdasarkan Jumlah Mata (menurun)
    analysisData.sort((a, b) => b.Total - a.Total);

    analysisData.forEach(data => {
        const row = tbody.insertRow();
        row.insertCell().textContent = data.house;
        row.insertCell().textContent = data.J1;
        row.insertCell().textContent = data.K2;
        row.insertCell().textContent = data.K3;
        row.insertCell().textContent = data.LL;
        row.insertCell().textContent = data.Total;
    });

    const overallChampionP = document.getElementById('overallChampion');
    if (overallChampionP) {
        if (analysisData.length > 0) {
            const champion = analysisData[0];
            overallChampionP.innerHTML = `<h3>🎉 Johan Keseluruhan: **${champion.house}** dengan Jumlah Mata **${champion.Total}**!</h3>`;
        } else {
            overallChampionP.textContent = 'Tiada data keputusan untuk dianalisis.';
        }
    }
}

// --- Pemuatan Data Permulaan (Menggantikan loadData() asal) ---
document.addEventListener('DOMContentLoaded', async () => {
    // Muat keputusan acara dari Firebase terlebih dahulu
    await loadEventResultsFromFirebase();
    // Muat rekod statik
    loadChampionshipRecords();
    // Muat peserta (dari Firebase atau CSV->Firebase)
    await loadParticipantsFromFirebase();
    
    // Panggil fungsi awal untuk memaparkan tab pertama
    showTab('peserta'); 
});