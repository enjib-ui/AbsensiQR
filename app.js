// ===== Import Firebase SDK =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===== Konfigurasi Firebase =====
const firebaseConfig = { apiKey: "...", authDomain: "absensiqr-a623d.firebaseapp.com", projectId: "absensiqr-a623d", storageBucket: "absensiqr-a623d.firebasestorage.app", messagingSenderId: "550764914493", appId: "1:550764914493:web:8f9c8515a78b2837a0c754" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

// ===== DOM Helper =====
const qs = (s) => document.querySelector(s);
function showToast(msg, type="success"){
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.style.background = type==="success"?"#06b6d4":"#ef4444";
  toast.className = "show";
  setTimeout(()=>toast.className="",3000);
}

// ===== Auth State =====
onAuthStateChanged(auth, (user) => {
  if (user) { currentUser = user; authWrap.style.display="none"; dashboard.style.display="flex"; loadTable(); }
  else { currentUser=null; authWrap.style.display="grid"; dashboard.style.display="none"; }
});

// ... (Login, Register, Logout, Tambah siswa, LoadTable, Export PDF, Scan QR, Menu Slide dll)

