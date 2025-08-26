/**
 * firebase-init.js
 * - Dynamically imports the Firebase modular SDK from CDN and initializes the app.
 * - Exported bindings: getAuthInstance(), getDatabaseInstance(), controlsRef(path)
 * NOTE: Update to latest stable when you run this. Using v12.x in this scaffold.
 */

export let firebaseApp = null;
export let firebaseAuth = null;
export let firebaseDb = null;

// TODO: paste your Firebase config object here (do NOT commit private keys from other sources)
const firebaseConfig = /* TODO: paste your Firebase config here */ null;

async function ensureFirebase(){
  if(firebaseApp) return;
  try{
    const modApp = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const modAuth = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const modDb = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js');
    const { initializeApp } = modApp;
    const { getAuth } = modAuth;
    const { getDatabase } = modDb;
    if(!firebaseConfig) {
      console.warn('firebase-init: firebaseConfig not provided. Realtime features disabled.');
      return;
    }
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    firebaseDb = getDatabase(firebaseApp);
    console.log('firebase-init: initialized');
  }catch(e){
    console.warn('firebase-init: failed to load firebase modules', e);
  }
}

export async function getAuthInstance(){ await ensureFirebase(); return firebaseAuth; }
export async function getDatabaseInstance(){ await ensureFirebase(); return firebaseDb; }

// helper: returns a database ref for teacher controls path. If DB not configured, returns null.
export async function controlsRef(path='controls/latest'){
  const db = await getDatabaseInstance();
  if(!db) return null;
  const modDb = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js');
  return modDb.ref(db, path);
}
