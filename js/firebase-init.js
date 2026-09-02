// ============================================================
// FIREBASE: inicialização, login com Google e estado de sessão.
// Deve carregar logo após firebase-config.js e os SDKs compat.
// ============================================================
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  let currentUser = null;

  document.getElementById('googleLoginBtn').addEventListener('click', ()=>{
    const provider = new firebase.auth.GoogleAuthProvider();
    document.getElementById('loginError').style.display = 'none';
    auth.signInWithPopup(provider).catch(err=>{
      const el = document.getElementById('loginError');
      el.textContent = 'Não deu pra entrar agora (' + err.code + '). Tente de novo.';
      el.style.display = 'block';
    });
  });

  auth.onAuthStateChanged(user=>{
    if(user){
      currentUser = user;
      document.getElementById('loginGate').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      window.startTerrenoApp();
    } else {
      currentUser = null;
      document.getElementById('loginGate').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
    }
  });
