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

// ===== Toast =====
function showToast(msg, type = "success", duration = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 50);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ===== Auth State =====
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

// ===== Tambah Siswa =====
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
      kode,
    });
    siswaForm.reset();
    showToast("✅ Siswa berhasil ditambahkan", "success");
  } catch (err) {
    showToast("❌ Gagal tambah siswa: " + err.message, "danger");
  }
});

// ===== Load Tabel Siswa =====
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

      const qrContainer = document.getElementById(`qr-${s.kode}`);
      qrContainer.innerHTML = "";
      new QRCode(qrContainer, { text: s.kode, width: 64, height: 64 });
    });
  });
}

// ===== Ekspor PDF =====
qs("#btn-export-pdf").onclick = async () => {
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
    doc.text(`Nama   : ${s.nama}`, 14, y);
    y += 6;
    doc.text(`Kelas  : ${s.kelas}`, 14, y);
    y += 6;
    doc.text(`Sekolah: ${s.sekolah}`, 14, y);
    y += 6;

    const qrCanvas = document
      .getElementById(`qr-${s.kode}`)
      .querySelector("canvas");
    if (qrCanvas) {
      const imgData = qrCanvas.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 150, y - 18, 30, 30);
    }

    y += 40;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save("Daftar_Siswa.pdf");
};

// ===== QR SCAN =====
let html5QrCode = null;
async function startScanner() {
  if (html5QrCode) return;
  html5QrCode = new Html5Qrcode("qr-reader");

  html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    async (qrCodeMessage) => {
      const q = collection(db, "users", currentUser.uid, "siswa");
      const snap = await getDocs(q);
      let matchedDoc = null;

      snap.forEach((doc) => {
        if (doc.data().kode === qrCodeMessage) {
          matchedDoc = doc;
        }
      });

      if (matchedDoc) {
        const s = matchedDoc.data();

        // 🔽 Cek absensi hari ini
        const absensiCol = collection(db, "users", currentUser.uid, "siswa", matchedDoc.id, "absensi");
        const absensiSnap = await getDocs(absensiCol);

        let sudahHadir = false;
        const today = new Date().toDateString();
        absensiSnap.forEach(a => {
          const ad = a.data();
          const waktu = ad.waktu && ad.waktu.toDate ? ad.waktu.toDate() : ad.waktu;
          if (new Date(waktu).toDateString() === today) {
            sudahHadir = true;
          }
        });

        if (sudahHadir) {
          showToast(`⚠️ ${s.nama} sudah absen hari ini`, "danger", 2500);
        } else {
          await addDoc(absensiCol, { waktu: new Date(), status: "Hadir" });
          showToast(`✅ Scan berhasil: ${s.nama}`, "success", 2500);

          // update tabel absensi di bawah kamera
          const absenTable = document.getElementById("absensiScanTableBody");
          if (absenTable) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${s.nama}</td>
              <td>${s.kelas}</td>
              <td>${s.sekolah}</td>
              <td>${new Date().toLocaleString()}</td>
            `;
            absenTable.prepend(tr);
          }
        }
      } else {
        showToast("❌ QR tidak dikenali", "danger", 2500);
      }
    }
  );
}

window.startScanner = startScanner;
  
