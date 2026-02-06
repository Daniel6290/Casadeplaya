// js/app.js - VERSIÓN CON SWEETALERT Y MEJORA MÓVIL

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIGURACIÓN (Tus llaves)
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

// 3. REFERENCIAS DOM
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

// 4. LOGIN CON SWEETALERT ERROR
formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, txtEmail.value, txtPassword.value);
    } catch (error) {
        // Alerta bonita de error
        Swal.fire({
            icon: 'error',
            title: 'Ups...',
            text: 'Correo o contraseña incorrectos',
            confirmButtonColor: '#d4af37'
        });
    }
});

// 5. SESIÓN
onAuthStateChanged(auth, (user) => {
    if (user) {
        sectionLogin.classList.add('d-none');
        sectionApp.classList.remove('d-none');
        userName.innerText = user.email.split('@')[0]; // Solo el nombre antes del @
        setTimeout(() => { initCalendar(); }, 100);
    } else {
        sectionApp.classList.add('d-none');
        sectionLogin.classList.remove('d-none');
    }
});

btnLogout.addEventListener('click', async () => { await signOut(auth); });

// 6. CALENDARIO MEJORADO
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
            left: 'prev,next', // Quitamos 'today' para ahorrar espacio en móvil
            center: 'title',
            right: '' // Quitamos vistas extra para simplificar
        },
        
        // 👇 CAMBIO IMPORTANTE PARA MÓVIL 👇
        height: 'auto', // Se adapta al contenido, evita scroll doble
        contentHeight: 'auto', 
        aspectRatio: 1.5, // Intenta mantener proporción rectangular
        
        selectable: true, 
        
        // Select
        select: function(info) {
            document.getElementById('input-fecha-inicio').value = info.startStr;
            document.getElementById('input-fecha-fin').value = info.endStr;
            const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
            myModal.show();
        },

        // Click Evento
        eventClick: function(info) {
            document.getElementById('detalle-titulo').innerText = info.event.title;
            const inicio = info.event.start.toLocaleDateString();
            const fin = info.event.end ? info.event.end.toLocaleDateString() : inicio;
            document.getElementById('detalle-fechas').innerText = `${inicio} - ${fin}`;
            document.getElementById('detalle-id').value = info.event.id;

            const emailDueno = info.event.extendedProps.userEmail;
            const miEmail = auth.currentUser.email;

            if (emailDueno === miEmail) {
                btnBorrar.classList.remove('d-none');
            } else {
                btnBorrar.classList.add('d-none');
            }

            const modalDetalles = new bootstrap.Modal(document.getElementById('modalDetalles'));
            modalDetalles.show();
        }
    });

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
                extendedProps: { userEmail: data.userEmail },
                backgroundColor: '#0d6efd',
                borderColor: '#0d6efd'
            });
        });
    });

    calendar.render();
}

// 7. GUARDAR CON SWEETALERT
btnGuardar.addEventListener('click', async () => {
    const inicio = document.getElementById('input-fecha-inicio').value;
    const finUsuario = document.getElementById('input-fecha-fin').value;
    const titulo = document.getElementById('txt-titulo').value;

    if (!titulo) return Swal.fire('Falta info', 'Escribe quién eres', 'warning');
    
    // Ajuste fecha
    const partes = finUsuario.split('-'); 
    const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]); 
    fechaObj.setDate(fechaObj.getDate() + 1);
    const anio = fechaObj.getFullYear();
    const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const dia = String(fechaObj.getDate()).padStart(2, '0');
    const finReal = `${anio}-${mes}-${dia}`;

    // Validación
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

    if (hayConflicto) {
        return Swal.fire({
            icon: 'error',
            title: '¡Ocupado!',
            text: 'Esas fechas ya están reservadas.',
            confirmButtonColor: '#d33'
        });
    }

    try {
        await addDoc(collection(db, "reservas"), {
            title: titulo,
            start: inicio,
            end: finReal,
            allDay: true,
            userEmail: auth.currentUser.email
        });
        
        // Cerrar modal primero
        const modalEl = document.getElementById('modalReserva');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        document.getElementById('txt-titulo').value = "";

        // ALERTA DE ÉXITO
        Swal.fire({
            icon: 'success',
            title: '¡Listo!',
            text: 'Reserva guardada correctamente',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo guardar', 'error');
    }       
});

// 8. BORRAR CON CONFIRMACIÓN DE SWEETALERT
btnBorrar.addEventListener('click', async () => {
    const idParaBorrar = document.getElementById('detalle-id').value;
    if (!idParaBorrar) return;

    // PREGUNTA CON SWEETALERT
    const result = await Swal.fire({
        title: '¿Eliminar reserva?',
        text: "No podrás recuperar esta fecha.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "reservas", idParaBorrar));
            
            const modalEl = document.getElementById('modalDetalles');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();
            
            Swal.fire(
                '¡Eliminado!',
                'La reserva ha sido borrada.',
                'success'
            );
        } catch (error) {
            Swal.fire('Error', 'No se pudo borrar', 'error');
        }
    }
});
const imagenesGaleria = document.querySelectorAll('.img-galeria');

imagenesGaleria.forEach(img => {
    img.addEventListener('click', function() {
        // 1. Obtenemos la fuente (src) de la imagen clickeada
        const rutaImagen = this.src;
        
        // 2. La ponemos en el modal grande
        const imgZoom = document.getElementById('img-zoom');
        if(imgZoom) {
            imgZoom.src = rutaImagen;
            
            // 3. Abrimos el modal
            const modalFoto = new bootstrap.Modal(document.getElementById('modalFoto'));
            modalFoto.show();
        }
    });
});

const btnFab = document.getElementById('btn-fab');

if(btnFab) {
    btnFab.addEventListener('click', () => {
        // 1. Limpiamos los campos para que no tengan datos viejos
        document.getElementById('input-fecha-inicio').value = '';
        document.getElementById('input-fecha-fin').value = '';
        document.getElementById('txt-titulo').value = '';

        // 2. Abrimos el modal manualmente
        const myModal = new bootstrap.Modal(document.getElementById('modalReserva'));
        myModal.show();
    });
}