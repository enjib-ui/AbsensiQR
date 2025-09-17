// ===== app.js (module) =====
// Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config (user-provided)
const firebaseConfig = {
  apiKey: "AIzaSyCu8ZCpTGTFPcrpJDYn0BB8GHoP0hYvg_Q",
  authDomain: "absensiqr-a623d.firebaseapp.com",
  projectId: "absensiqr-a623d",
  storageBucket: "absensiqr-a623d.firebasestorage.app",
  messagingSenderId: "550764914493",
  appId: "1:550764914493:web:8f9c8515a78b2837a0c754"
};

// Init
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM helpers
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// Elements
const authWrap = qs('#auth-wrap');
const dashboard = qs('#dashboard');
const loginForm = qs('#form-login');
const registerForm = qs('#form-register');
const regMsg = qs('#reg-msg');
const loginMsg = qs('#login-msg');
const userEmail = qs('#user-email');
const siswaForm = qs('#form-siswa');
const tabelBody = qs('#tabel-siswa tbody');
const absensiTableBody = qs('#absensiTableBody');
const absensiScanTableBody = qs('#absensiScanTableBody');
const scanResult = qs('#scan-result');

let currentUser = null;
let html5QrCode = null;

// Toast util
function showToast(text, opts={duration:3000, type:'info'}){
  const container = qs('#toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerText = text;
  if (opts.type === 'success') t.style.background = '#16a34a';
  if (opts.type === 'danger') t.style.background = '#ef4444';
  container.appendChild(t);
  // show
  setTimeout(()=> t.classList.add('show'), 20);
  // remove
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); }, opts.duration);
}

// Auth state
onAuthStateChanged(auth, user => {
  if(user){
    currentUser = user;
    authWrap.style.display = 'none';
    dashboard.style.display = 'flex';
    userEmail.innerText = user.email || 'Guru';
    loadTable();
  } else {
    currentUser = null;
    authWrap.style.display = 'block';
    dashboard.style.display = 'none';
  }
});

// Switch tabs (auth)
qs('#btn-login').onclick = ()=>{ qs('#form-login').style.display='block'; qs('#form-register').style.display='none'; qs('#btn-login').classList.add('active'); qs('#btn-register').classList.remove('active'); };
qs('#btn-register').onclick = ()=>{ qs('#form-register').style.display='block'; qs('#form-login').style.display='none'; qs('#btn-register').classList.add('active'); qs('#btn-login').classList.remove('active'); };

// Register
registerForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = qs('#reg-email').value.trim();
  const password = qs('#reg-password').value;
  try{
    await createUserWithEmailAndPassword(auth, email, password);
    regMsg.innerText = 'Pendaftaran berhasil — silakan login';
    registerForm.reset();
  }catch(err){ regMsg.innerText = err.message; }
});

// Login
loginForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = qs('#login-email').value.trim();
  const password = qs('#login-password').value;
  try{
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  }catch(err){ loginMsg.innerText = err.message; }
});

// Logout
qs('#btn-logout').addEventListener('click', async ()=>{
  await signOut(auth);
  if(html5QrCode){ try{ await html5QrCode.stop(); }catch(e){} html5QrCode=null; }
});

// Add student
siswaForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const nama = qs('#siswa-nama').value.trim();
  const kelas = qs('#siswa-kelas').value.trim();
  const sekolah = qs('#siswa-sekolah').value.trim();
  if(!currentUser){ showToast('Silakan login terlebih dahulu', {type:'danger'}); return; }
  const kode = currentUser.uid + '_S' + Date.now();
  try{
    await addDoc(collection(db, 'users', currentUser.uid, 'siswa'), { nama, kelas, sekolah, kode });
    siswaForm.reset();
    showToast('Siswa ditambahkan', {type:'success'});
  }catch(err){ showToast('Gagal tambah siswa: '+err.message, {type:'danger'}); }
});

// Load student table (realtime)
function loadTable(){
  if(!currentUser) return;
  const col = collection(db, 'users', currentUser.uid, 'siswa');
  onSnapshot(col, snap=>{
    tabelBody.innerHTML = '';
    snap.forEach(doc=>{
      const s = doc.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.kode}</td><td>${s.nama}</td><td>${s.kelas}</td><td>${s.sekolah}</td><td id="qr-${s.kode}"></td>`;
      tabelBody.appendChild(tr);
      // generate QR into canvas for export
      const container = document.getElementById('qr-'+s.kode);
      container.innerHTML = '';
      const canvas = document.createElement('div'); // qrcodejs will insert img or canvas inside
      container.appendChild(canvas);
      new QRCode(canvas, { text: s.kode, width:64, height:64 });
    });
  });
}

// Export PDF (uses jspdf loaded in window)
qs('#btn-export-pdf').addEventListener('click', async ()=>{
  if(!currentUser){ showToast('Silakan login', {type:'danger'}); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Daftar Siswa - QR', 14, 18);
  let y = 28;
  const siswaSnap = await getDocs(collection(db, 'users', currentUser.uid, 'siswa'));
  for(const sd of siswaSnap.docs){
    const s = sd.data();
    doc.setFontSize(12);
    doc.text('Nama: '+s.nama, 14, y); y+=6;
    doc.text('Kelas: '+s.kelas, 14, y); y+=6;
    doc.text('Sekolah: '+s.sekolah, 14, y); y+=6;
    // get canvas img from DOM
    const qrContainer = document.getElementById('qr-'+s.kode);
    const imgEl = qrContainer ? qrContainer.querySelector('img, canvas') : null;
    if(imgEl){
      let imgData = null;
      if(imgEl.tagName === 'IMG'){ imgData = imgEl.src; }
      else { imgData = imgEl.toDataURL('image/png'); }
      if(imgData){ doc.addImage(imgData, 'PNG', 150, y-18, 30, 30); }
    }
    y += 36;
    if(y > 270){ doc.addPage(); y = 20; }
  }
  doc.save('Daftar_Siswa_QR.pdf');
  showToast('PDF diekspor', {type:'success'});
});

// MENU slide logic
const menuTambah = qs('#menu-tambah');
const menuScan = qs('#menu-scan');
const menuAbsensi = qs('#menu-absensi');
const panelTambah = qs('#panel-tambah');
const panelScan = qs('#panel-scan');
const panelAbsensi = qs('#panel-absensi');

menuTambah.addEventListener('click', ()=>{ menuTambah.classList.add('active'); menuScan.classList.remove('active'); menuAbsensi.classList.remove('active'); panelTambah.style.display='block'; panelScan.style.display='none'; panelAbsensi.style.display='none'; if(html5QrCode){ try{ html5QrCode.stop(); }catch(e){} html5QrCode=null; } });
menuScan.addEventListener('click', ()=>{ menuScan.classList.add('active'); menuTambah.classList.remove('active'); menuAbsensi.classList.remove('active'); panelTambah.style.display='none'; panelScan.style.display='block'; panelAbsensi.style.display='none'; startScanner(); });
menuAbsensi.addEventListener('click', ()=>{ menuAbsensi.classList.add('active'); menuTambah.classList.remove('active'); menuScan.classList.remove('active'); panelTambah.style.display='none'; panelScan.style.display='none'; panelAbsensi.style.display='block'; if(html5QrCode){ try{ html5QrCode.stop(); }catch(e){} html5QrCode=null; loadAbsensiFull(); } });

// Start scanner (keeps running). On each successful scan: save attendance, show toast (no stop), prepend to small absensi list.
async function startScanner(){
  if(!currentUser){ showToast('Silakan login', {type:'danger'}); return; }
  if(html5QrCode) return; // already running
  html5QrCode = new Html5Qrcode('qr-reader');
  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    async (qrMessage)=>{
      // when scan detected
      // find student document by kode
      const col = collection(db, 'users', currentUser.uid, 'siswa');
      const snap = await getDocs(col);
      let matchedDoc = null;
      snap.forEach(d=>{ if(d.data().kode === qrMessage) matchedDoc = d; });
      if(matchedDoc){
        const s = matchedDoc.data();
        // save attendance under siswa doc
        try{
         // 🔽 Simpan absensi ke Firestore (cek double dulu)
const absensiCol = collection(db, "users", currentUser.uid, "siswa", doc.id, "absensi");

// Batas awal & akhir hari (untuk filter tanggal)
const now = new Date();
const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

// Query absensi hari ini
const qAbsensi = query(absensiCol,
  where("waktu", ">=", startOfDay),
  where("waktu", "<=", endOfDay)
);

const snapAbsensi = await getDocs(qAbsensi);

if (!snapAbsensi.empty) {
  // Sudah ada absen hari ini
  showToast(`⚠️ ${s.nama} sudah absen hari ini`, "warning");
} else {
  // Belum ada, simpan baru
  await addDoc(absensiCol, {
    waktu: now,
    status: "Hadir"
  });

  showToast(`✅ Scan berhasil: ${s.nama} (${s.kelas} - ${s.sekolah})`, "success");

  // Tambahkan ke tabel realtime (langsung terlihat di bawah kamera)
  const absenTable = document.getElementById("absensiScanTableBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${s.nama}</td>
    <td>${s.kelas}</td>
    <td>${s.sekolah}</td>
    <td>${now.toLocaleString()}</td>
  `;
  absenTable.prepend(tr);
}
          
}

// Load full absensi (all siswa -> their absensi subcollection)
async function loadAbsensiFull(){
  if(!currentUser) return;
  absensiTableBody.innerHTML = '';
  const siswaSnap = await getDocs(collection(db, 'users', currentUser.uid, 'siswa'));
  for(const sdoc of siswaSnap.docs){
    const s = sdoc.data();
    const absSnap = await getDocs(collection(db, 'users', currentUser.uid, 'siswa', sdoc.id, 'absensi'));
    absSnap.forEach(a=>{
      const ad = a.data();
      const tr = document.createElement('tr');
      const time = ad.waktu && ad.waktu.toDate ? new Date(ad.waktu.toDate()).toLocaleString() : new Date().toLocaleString();
      tr.innerHTML = `<td>${s.nama}</td><td>${s.kelas}</td><td>${s.sekolah}</td><td>${time}</td>`;
      absensiTableBody.prepend(tr);
    });
  }
}

// When page unload, stop camera
window.addEventListener('beforeunload', async ()=>{
  if(html5QrCode){ try{ await html5QrCode.stop(); }catch(e){} html5QrCode=null; }
});
