// js/app.js - CÓDIGO COMPLETO Y CORREGIDO

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIGURACIÓN (¡Pega aquí tus llaves reales!)
const firebaseConfig = {
  apiKey: "AIzaSyCK24jfAypi_5cbpxUAoRqm5GpD0AztLmo", // <--- Tu API Key que vi antes
  authDomain: "casadeplaya-familia.firebaseapp.com",
  projectId: "casadeplaya-familia",
  storageBucket: "casadeplaya-familia.firebasestorage.app",
  messagingSenderId: "8636762795",
  appId: "1:8636762795:web:a88b8679e37ee03d6985ee"
};

// 3. INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase conectado correctamente");

// 4. REFERENCIAS DOM
const sectionLogin = document.getElementById('section-login');
const sectionApp = document.getElementById('section-app');
const formLogin = document.getElementById('form-login');
const txtEmail = document.getElementById('txt-email');
const txtPassword = document.getElementById('txt-password');
const msgError = document.getElementById('msg-error');
const btnLogout = document.getElementById('btn-logout');
const userName = document.getElementById('user-name');
const btnGuardar = document.getElementById('btn-guardar'); // Referencia al botón guardar

// 5. LÓGICA DE LOGIN
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = txtEmail.value;
    const password = txtPassword.value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error(error);
        if(error.code === 'auth/invalid-credential') {
            msgError.innerText = "Correo o contraseña incorrectos.";
        } else {
            msgError.innerText = "Error: " + error.message;
        }
    }
});

// 6. OBSERVADOR DE SESIÓN
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Usuario logueado
        sectionLogin.classList.add('d-none');
        sectionApp.classList.remove('d-none');
        userName.innerText = user.email;
        msgError.innerText = "";

        // Iniciar calendario con pequeño retraso para que se pinte bien
        setTimeout(() => {
            initCalendar();
        }, 100);

    } else {
        // Usuario no logueado
        sectionApp.classList.add('d-none');
        sectionLogin.classList.remove('d-none');
    }
});

// 7. LÓGICA DE LOGOUT
btnLogout.addEventListener('click', async () => {
    await signOut(auth);
});

// 8. LÓGICA DEL CALENDARIO
let calendar; // Variable global

function initCalendar() {
    const calendarEl = document.getElementById('calendar');

    if (calendar) {
        calendar.render();
        return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek'
        },
        height: 650,
        selectable: true,
        dateClick: function(info) {
            document.getElementById('input-fecha').value = info.dateStr;
            document.getElementById('texto-fecha').innerText = info.dateStr;
            const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
            myModal.show();
        }
    });

    // --- AQUÍ PEGASTE EL BLOQUE DE ONSNAPSHOT ---
    onSnapshot(collection(db, "reservas"), (snapshot) => {
        calendar.removeAllEvents();
        snapshot.forEach((doc) => {
            const data = doc.data();
            calendar.addEvent({
                title: data.title,
                start: data.start,
                allDay: true
            });
        });
    });

    calendar.render();
}

// 9. LÓGICA PARA GUARDAR RESERVA (¡FUERA de initCalendar!)
btnGuardar.addEventListener('click', async () => {
    const fecha = document.getElementById('input-fecha').value;
    const titulo = document.getElementById('txt-titulo').value;

    if (!titulo) {
        alert("Por favor escribe quién eres");
        return;
    }

    try {
        await addDoc(collection(db, "reservas"), {
            title: titulo,
            start: fecha,
            allDay: true,
            userEmail: auth.currentUser.email
        });

        alert("¡Reserva guardada!");
        
        // Cerrar modal y limpiar
        const modalEl = document.getElementById('modalReserva');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        document.getElementById('txt-titulo').value = "";

    } catch (error) {
        console.error("Error al guardar: ", error);
        alert("Hubo un error al guardar");
    }       
});