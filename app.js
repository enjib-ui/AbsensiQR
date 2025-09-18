import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCu8ZCpTGTFPcrpJDYn0BB8GHoP0hYvg_Q",
  authDomain: "absensiqr-a623d.firebaseapp.com",
  projectId: "absensiqr-a623d",
  storageBucket: "absensiqr-a623d.firebasestorage.app",
  messagingSenderId: "550764914493",
  appId: "1:550764914493:web:8f9c8515a78b2837a0c754"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const qs = s => document.querySelector(s);

const authWrap = qs('#auth-wrap');
const dashboard = qs('#dashboard');
const loginForm = qs('#form-login');
const registerForm = qs('#form-register');
const regMsg = qs('#reg-msg');
const loginMsg = qs('#login-msg');
const userEmail = qs('#user-email');

let currentUser = null;

function showToast(text, opts={duration:3000, type:'info'}){
  const container = qs('#toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerText = text;
  if (opts.type === 'success') t.style.background = '#16a34a';
  if (opts.type === 'danger') t.style.background = '#ef4444';
  container.appendChild(t);
  setTimeout(()=> t.classList.add('show'), 20);
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); }, opts.duration);
}

onAuthStateChanged(auth, user => {
  if(user){
    currentUser = user;
    authWrap.style.display = 'none';
    dashboard.style.display = 'flex';
    userEmail.innerText = user.email || 'Guru';
  } else {
    currentUser = null;
    authWrap.style.display = 'block';
    dashboard.style.display = 'none';
  }
});

qs('#btn-login').onclick = ()=>{ qs('#form-login').style.display='block'; qs('#form-register').style.display='none'; qs('#btn-login').classList.add('active'); qs('#btn-register').classList.remove('active'); };
qs('#btn-register').onclick = ()=>{ qs('#form-register').style.display='block'; qs('#form-login').style.display='none'; qs('#btn-register').classList.add('active'); qs('#btn-login').classList.remove('active'); };

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

loginForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = qs('#login-email').value.trim();
  const password = qs('#login-password').value;
  try{
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  }catch(err){ loginMsg.innerText = err.message; }
});

qs('#btn-logout').addEventListener('click', async ()=>{ await signOut(auth); });

// Drawer toggle
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
if(menuToggle && sidebar){
  menuToggle.addEventListener('click', ()=>{ sidebar.classList.toggle('open'); });
  document.querySelectorAll('.menu-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> sidebar.classList.remove('open'));
  });
}