// js/app.js - VERSIÓN CON SEGURIDAD DE PROPIETARIO

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIGURACIÓN (¡Tus llaves reales!)
const firebaseConfig = {
  apiKey: "AIzaSyCK24jfAypi_5cbpxUAoRqm5GpD0AztLmo",
  authDomain: "casadeplaya-familia.firebaseapp.com",
  projectId: "casadeplaya-familia",
  storageBucket: "casadeplaya-familia.firebasestorage.app",
  messagingSenderId: "8636762795",
  appId: "1:8636762795:web:a88b8679e37ee03d6985ee"
};

// 3. INICIALIZAR
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 4. REFERENCIAS DOM
const sectionLogin = document.getElementById('section-login');
const sectionApp = document.getElementById('section-app');
const formLogin = document.getElementById('form-login');
const txtEmail = document.getElementById('txt-email');
const txtPassword = document.getElementById('txt-password');
const msgError = document.getElementById('msg-error');
const btnLogout = document.getElementById('btn-logout');
const userName = document.getElementById('user-name');
const btnGuardar = document.getElementById('btn-guardar');
const btnBorrar = document.getElementById('btn-borrar');

// 5. LOGIN
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, txtEmail.value, txtPassword.value);
    } catch (error) {
        msgError.innerText = "Error: " + error.message;
    }
});

// 6. SESIÓN
onAuthStateChanged(auth, (user) => {
    if (user) {
        sectionLogin.classList.add('d-none');
        sectionApp.classList.remove('d-none');
        userName.innerText = user.email;
        setTimeout(() => { initCalendar(); }, 100);
    } else {
        sectionApp.classList.add('d-none');
        sectionLogin.classList.remove('d-none');
    }
});

btnLogout.addEventListener('click', async () => { await signOut(auth); });

// 7. CALENDARIO
let calendar;

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
        
        // A. CREAR: Al tocar días vacíos
        select: function(info) {
            document.getElementById('input-fecha-inicio').value = info.startStr;
            document.getElementById('input-fecha-fin').value = info.endStr;
            const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
            myModal.show();
        },

        // B. DETALLES: Al tocar un evento existente
        eventClick: function(info) {
            // Llenar datos visuales
            document.getElementById('detalle-titulo').innerText = info.event.title;
            const inicio = info.event.start.toLocaleDateString();
            const fin = info.event.end ? info.event.end.toLocaleDateString() : inicio;
            document.getElementById('detalle-fechas').innerText = `${inicio} - ${fin}`;
            document.getElementById('detalle-id').value = info.event.id;

            // --- <<< NUEVO: SEGURIDAD DE PROPIETARIO >>> ---
            
            // 1. Obtenemos el email guardado en el evento (extendedProps)
            const emailDueno = info.event.extendedProps.userEmail;
            // 2. Obtenemos mi email actual
            const miEmail = auth.currentUser.email;

            // 3. Comparamos
            if (emailDueno === miEmail) {
                // SOY EL DUEÑO: Muestro el botón
                btnBorrar.classList.remove('d-none');
            } else {
                // NO SOY EL DUEÑO: Oculto el botón
                btnBorrar.classList.add('d-none');
            }
            // ------------------------------------------------

            const modalDetalles = new bootstrap.Modal(document.getElementById('modalDetalles'));
            modalDetalles.show();
        }
    });

    // C. LEER DATOS REALES
    onSnapshot(collection(db, "reservas"), (snapshot) => {
        calendar.removeAllEvents();
        snapshot.forEach((doc) => {
            const data = doc.data();
            calendar.addEvent({
                id: doc.id,
                title: data.title,
                start: data.start,
                end: data.end, 
                allDay: true,
                // --- <<< NUEVO: GUARDAMOS EL EMAIL EN EL EVENTO >>> ---
                extendedProps: {
                    userEmail: data.userEmail // FullCalendar guarda datos extra aquí
                },
                backgroundColor: '#0d6efd',
                borderColor: '#0d6efd'
            });
        });
    });

    calendar.render();
}

// 8. GUARDAR
btnGuardar.addEventListener('click', async () => {
    const inicio = document.getElementById('input-fecha-inicio').value;
    const finUsuario = document.getElementById('input-fecha-fin').value;
    const titulo = document.getElementById('txt-titulo').value;

    if (!titulo) return alert("Escribe quién eres.");
    if (!inicio || !finUsuario) return alert("Faltan fechas.");
    if (inicio > finUsuario) return alert("Fechas inválidas.");

    // Ajuste fecha fin (+1 día visual)
    const partes = finUsuario.split('-'); 
    const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]); 
    fechaObj.setDate(fechaObj.getDate() + 1);
    const anio = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const finReal = `${anio}-${mes}-${dia}`;

    // Validación Conflictos
    const eventos = calendar.getEvents();
    const nuevoInicio = new Date(inicio + "T00:00:00");
    const nuevoFin = new Date(finReal + "T00:00:00");

    const hayConflicto = eventos.some(evento => {
        const evInicio = evento.start;
        let evFin = evento.end;
        if (!evFin) {
            evFin = new Date(evInicio);
            evFin.setDate(evFin.getDate() + 1);
        }
        return (nuevoInicio < evFin && nuevoFin > evInicio);
    });

    if (hayConflicto) return alert("¡Conflicto! Días ocupados.");

    try {
        await addDoc(collection(db, "reservas"), {
            title: titulo,
            start: inicio,
            end: finReal,
            allDay: true,
            userEmail: auth.currentUser.email // Esto es lo que comparamos luego
        });
        
        alert("¡Guardado!");
        const modalEl = document.getElementById('modalReserva');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        document.getElementById('txt-titulo').value = "";
    } catch (error) {
        console.error(error);
        alert("Error al guardar.");
    }       
});

// 9. BORRAR
btnBorrar.addEventListener('click', async () => {
    const idParaBorrar = document.getElementById('detalle-id').value;
    if (!idParaBorrar) return;

    if (!confirm("¿Seguro que quieres borrar TU reserva?")) return;

    try {
        await deleteDoc(doc(db, "reservas", idParaBorrar));
        const modalEl = document.getElementById('modalDetalles');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        alert("Reserva eliminada.");
    } catch (error) {
        console.error(error);
        alert("No se pudo borrar.");
    }
});