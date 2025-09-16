// ===== Import Firebase SDK =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== Konfigurasi Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyCu8ZCpTGTFPcrpJDYn0BB8GHoP0hYvg_Q",
  authDomain: "absensiqr-a623d.firebaseapp.com",
  projectId: "absensiqr-a623d",
  storageBucket: "absensiqr-a623d.firebasestorage.app",
  messagingSenderId: "550764914493",
  appId: "1:550764914493:web:8f9c8515a78b2837a0c754"
};

// ===== Inisialisasi =====
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;

// ===== DOM Helper =====
const qs = (s) => document.querySelector(s);

const loginForm = qs("#form-login");
const registerForm = qs("#form-register");
const loginMsg = qs("#login-msg");
const regMsg = qs("#reg-msg");
const dashboard = qs("#dashboard");
const authWrap = qs("#auth-wrap");
const siswaForm = qs("#form-siswa");
const tabelBody = qs("#tabel-siswa tbody");

// ===== Cek status login =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authWrap.style.display = "none";
    dashboard.style.display = "flex";
    loadTable();
  } else {
    currentUser = null;
    authWrap.style.display = "grid";
    dashboard.style.display = "none";
  }
});

// ===== REGISTER =====
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = qs("#reg-nama").value.trim();
  const email = qs("#reg-email").value.trim();
  const password = qs("#reg-password").value;
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    regMsg.textContent = "Pendaftaran berhasil, silakan login.";
    registerForm.reset();
  } catch (err) {
    regMsg.textContent = err.message;
  }
});

// ===== LOGIN =====
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = qs("#login-email").value.trim();
  const password = qs("#login-password").value;
  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCred.user;
    authWrap.style.display = "none";
    dashboard.style.display = "flex";
    loadTable();
  } catch (err) {
    loginMsg.textContent = "Login gagal: " + err.message;
  }
});

// ===== LOGOUT =====
qs("#btn-logout").onclick = async () => {
  await signOut(auth);
  currentUser = null;
  dashboard.style.display = "none";
  authWrap.style.display = "grid";
};

// ===== TAMBAH SISWA =====
siswaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nama = qs("#siswa-nama").value.trim();
  const kelas = qs("#siswa-kelas").value.trim();
  const sekolah = qs("#siswa-sekolah").value.trim();
  const kode = currentUser.uid + "_S" + Date.now();
  try {
    await addDoc(collection(db, "users", currentUser.uid, "siswa"), {
      nama,
      kelas,
      sekolah,
      kode
    });
    siswaForm.reset();
  } catch (err) {
    alert("Gagal tambah siswa: " + err.message);
  }
});

// ===== MUAT TABEL SISWA =====
async function loadTable() {
  tabelBody.innerHTML = "";
  const q = collection(db, "users", currentUser.uid, "siswa");
  onSnapshot(q, (snap) => {
    tabelBody.innerHTML = "";
    snap.forEach((doc) => {
      const s = doc.data();
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${s.kode}</td>
        <td>${s.nama}</td>
        <td>${s.kelas}</td>
        <td>${s.sekolah}</td>
        <td id="qr-${s.kode}"></td>`;
      tabelBody.appendChild(tr);
      new QRCode(document.getElementById(`qr-${s.kode}`), {
        text: s.kode,
        width: 64,
        height: 64
      });
    });
  });
}

// ===== EKSPOR PDF =====
document.getElementById("btn-export-pdf").addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const siswaCol = collection(db, "users", currentUser.uid, "siswa");
  const siswaSnap = await getDocs(siswaCol);

  let y = 20;
  doc.setFontSize(14);
  doc.text("Daftar Siswa dengan QR Code", 14, y);
  y += 10;

  for (let siswa of siswaSnap.docs) {
    const s = siswa.data();
    doc.setFontSize(12);
    doc.text(`Nama   : ${s.nama}`, 14, y); y += 6;
    doc.text(`Kelas  : ${s.kelas}`, 14, y); y += 6;
    doc.text(`Sekolah: ${s.sekolah}`, 14, y); y += 6;

    // Generate QR code di canvas sementara
    const qrCanvas = document.createElement("canvas");
    new QRCode(qrCanvas, { text: s.kode, width: 64, height: 64 });
    const qrEl = qrCanvas.querySelector("canvas");
    if (qrEl) {
      const imgData = qrEl.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 150, y - 18, 30, 30);
    }

    y += 40;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save("Daftar_Siswa.pdf");
});

// ===== MUAT ABSENSI =====
async function loadAbsensi() {
  const absensiTableBody = document.getElementById("absensiTableBody");
  absensiTableBody.innerHTML = "";

  const siswaCol = collection(db, "users", currentUser.uid, "siswa");
  const siswaSnap = await getDocs(siswaCol);

  for (let siswaDoc of siswaSnap.docs) {
    const siswaData = siswaDoc.data();
    const absensiCol = collection(
      db,
      "users",
      currentUser.uid,
      "siswa",
      siswaDoc.id,
      "absensi"
    );
    const absensiSnap = await getDocs(absensiCol);

    absensiSnap.forEach((absen) => {
      const absenData = absen.data();
      absensiTableBody.innerHTML += `
        <tr>
          <td>${siswaData.nama}</td>
          <td>${siswaData.kelas}</td>
          <td>${siswaData.sekolah}</td>
          <td>${new Date(absenData.waktu.toDate()).toLocaleString()}</td>
        </tr>`;
    });
  }
}

// ===== NAVIGASI MENU =====
const menuTambah = qs("#menu-tambah");
const menuScan = qs("#menu-scan");
const menuAbsensi = qs("#menu-absensi");
const panelTambah = qs("#panel-tambah");
const panelScan = qs("#panel-scan");
const panelAbsensi = qs("#panel-absensi");

menuTambah.onclick = () => {
  menuTambah.classList.add("active");
  menuScan.classList.remove("active");
  menuAbsensi.classList.remove("active");
  panelTambah.style.display = "block";
  panelScan.style.display = "none";
  panelAbsensi.style.display = "none";
};

menuScan.onclick = () => {
  menuScan.classList.add("active");
  menuTambah.classList.remove("active");
  menuAbsensi.classList.remove("active");
  panelTambah.style.display = "none";
  panelScan.style.display = "block";
  panelAbsensi.style.display = "none";
  startScanner();
};

menuAbsensi.onclick = () => {
  menuAbsensi.classList.add("active");
  menuTambah.classList.remove("active");
  menuScan.classList.remove("active");
  panelTambah.style.display = "none";
  panelScan.style.display = "none";
  panelAbsensi.style.display = "block";
  loadAbsensi();
};

// ===== QR SCANNER =====
let html5QrCode = null;
function startScanner() {
  if (html5QrCode) return;
  html5QrCode = new Html5Qrcode("qr-reader");
  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (qrCodeMessage) => {
      const q = collection(db, "users", currentUser.uid, "siswa");
      const snap = await getDocs(q);
      let found = false;
      snap.forEach(async (docSnap) => {
        if (docSnap.data().kode === qrCodeMessage) {
          const s = docSnap.data();
          qs("#scan-result").textContent = `✅ ${s.nama} (${s.kelas} - ${s.sekolah}) discan pada ${new Date().toLocaleString()}`;
          found = true;
          // Tampilkan alert scan berhasil
          alert(`Scan berhasil: ${s.nama} (${s.kelas} - ${s.sekolah})`);
          await addDoc(
            collection(
              db,
              "users",
              currentUser.uid,
              "siswa",
              docSnap.id,
              "absensi"
            ),
            {
              waktu: new Date(),
              status: "Hadir"
            }
          );
        }
      });
      if (!found) qs("#scan-result").textContent = "❌ QR tidak dikenali";
    }
  );
      }
