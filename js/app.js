import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyCK24jfAypi_5cbpxUAoRqm5GpD0AztLmo",
  authDomain: "casadeplaya-familia.firebaseapp.com",
  projectId: "casadeplaya-familia",
  storageBucket: "casadeplaya-familia.firebasestorage.app",
  messagingSenderId: "8636762795",
  appId: "1:8636762795:web:a88b8679e37ee03d6985ee"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);       
const db = getFirestore(app);  

console.log("Firebase conectado correctamente");

export { auth, db };