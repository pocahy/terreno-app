// Configuração do projeto Firebase "terreno-pp".
// Este arquivo fica separado do index.html de propósito:
// sempre que o Claude te enviar um index.html novo, você NÃO
// precisa mexer neste arquivo — ele continua igual no seu repositório.
// Só edite aqui se você criar um novo projeto Firebase do zero,
// ou regenerar a chave lá no console.
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCDQIRBOBmEph8HbOnsxu2jK5MD1nxKAPk",
  authDomain: "terreno-pp.firebaseapp.com",
  projectId: "terreno-pp",
  storageBucket: "terreno-pp.firebasestorage.app",
  messagingSenderId: "325264560286",
  appId: "1:325264560286:web:4fd6e1c24edd6edf87eb8f"
};
window.FIREBASE_CONFIG = FIREBASE_CONFIG;

// Chave do reCAPTCHA v3, usada pelo Firebase App Check para proteger
// o uso da IA (Gemini). Você recebe essa chave ao ativar "AI Logic"
// no console do Firebase — veja o passo a passo em COMO-PUBLICAR.md.
const RECAPTCHA_SITE_KEY = "COLE_AQUI";
window.RECAPTCHA_SITE_KEY = RECAPTCHA_SITE_KEY;
