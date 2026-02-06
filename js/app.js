// js/app.js - VERSIÓN CON SWEETALERT Y MEJORA MÓVIL

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } 
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
const btnRegister = document.getElementById('btn-register');

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

// 2. NUEVA LÓGICA PARA EL BOTÓN "REGISTRARSE" (Agrega esto debajo)
if (btnRegister) {
    btnRegister.addEventListener('click', async () => {
        const email = txtEmail.value;
        const password = txtPassword.value;

        // Validación simple: que no estén vacíos
        if (!email || !password) {
            return Swal.fire({
                icon: 'warning',
                title: 'Faltan datos',
                text: 'Escribe un correo y contraseña para crear tu cuenta.',
                confirmButtonColor: '#d4af37'
            });
        }

        try {
            // Intentamos crear el usuario en Firebase
            await createUserWithEmailAndPassword(auth, email, password);
            
            // Si funciona, mostramos éxito (Firebase iniciará sesión solo)
            Swal.fire({
                icon: 'success',
                title: '¡Bienvenido!',
                text: 'Cuenta creada exitosamente.',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error(error);
            let mensaje = "No se pudo crear la cuenta.";

            // Errores comunes traducidos
            if (error.code === 'auth/email-already-in-use') mensaje = "Ese correo ya está registrado.";
            if (error.code === 'auth/weak-password') mensaje = "La contraseña es muy corta (mínimo 6 letras).";
            if (error.code === 'auth/invalid-email') mensaje = "El correo no es válido.";

            Swal.fire({
                icon: 'error',
                title: 'Error de registro',
                text: mensaje,
                confirmButtonColor: '#d33'
            });
        }
    });
}

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
            let colorEvento = '#0d6efd'; 
            if (data.tipo === 'completa') {
            colorEvento = '#dc3545';
            }


            calendar.addEvent({
            id: doc.id,
            title: data.title + (data.tipo === 'completa' ? ' (🏠)' : ' (👤)'), // Iconito visual
            start: data.start,
            end: data.end, 
            allDay: true,
            // 👇 Guardamos el tipo en extendedProps para usarlo luego
            extendedProps: { 
                userEmail: data.userEmail,
                tipo: data.tipo 
            },
            backgroundColor: colorEvento,
            borderColor: colorEvento
        });
    });
});

    calendar.render();
}

// LÓGICA DE GUARDADO CON VALIDACIÓN PARCIAL/COMPLETA
btnGuardar.addEventListener('click', async () => {
    const inicio = document.getElementById('input-fecha-inicio').value;
    const finUsuario = document.getElementById('input-fecha-fin').value;
    const titulo = document.getElementById('txt-titulo').value;
    const tipo = document.getElementById('select-tipo').value; // 'completa' o 'parcial'

    if (!titulo || !inicio || !finUsuario) return Swal.fire('Falta info', 'Llena todos los campos', 'warning');
    
    // Ajuste fecha fin (+1 día para FullCalendar)
    const partes = finUsuario.split('-'); 
    const fechaObj = new Date(partes[0], partes[1] - 1, partes[2]); 
    fechaObj.setDate(fechaObj.getDate() + 1);
    const finReal = fechaObj.toISOString().split('T')[0];

    // Validación de fechas y lógica de tipos
    const eventos = calendar.getEvents();
    const nuevoInicio = new Date(inicio + "T00:00:00");
    const nuevoFin = new Date(finReal + "T00:00:00");

    // REGLA DE ORO:
    // 1. Si ya hay una "Completa", nadie pasa.
    // 2. Si yo quiero "Completa", no puede haber NADA (ni parcial ni completa).
    // 3. Si yo quiero "Parcial" y ya hay "Parcial", SÍ PASA.

    const hayConflicto = eventos.some(evento => {
        const evInicio = evento.start;
        let evFin = evento.end || new Date(evInicio.getTime() + 86400000); // Si es de 1 día

        // ¿Chocan las fechas?
        const choqueFechas = (nuevoInicio < evFin && nuevoFin > evInicio);

        if (!choqueFechas) return false; // Si no chocan fechas, no hay problema.

        // SI CHOCAN FECHAS, VERIFICAMOS LOS TIPOS:
        const tipoExistente = evento.extendedProps.tipo || 'parcial'; // Asumimos parcial si no tiene dato antiguo
        
        // Caso 1: La reserva existente es COMPLETA (Bloqueo total)
        if (tipoExistente === 'completa') return true; 

        // Caso 2: La reserva NUEVA es COMPLETA (Necesito todo vacío)
        if (tipo === 'completa') return true;

        // Caso 3: Ambas son Parciales (EXISTE = Parcial, NUEVA = Parcial)
        // Aquí retornamos FALSE porque NO hay conflicto, se pueden mezclar.
        return false; 
    });

    if (hayConflicto) {
        return Swal.fire({
            icon: 'error',
            title: 'No disponible',
            text: 'La fecha está ocupada por una reserva Completa o intentas reservar Completa sobre una Parcial.',
            confirmButtonColor: '#d33'
        });
    }

    try {
        await addDoc(collection(db, "reservas"), {
            title: titulo,
            start: inicio,
            end: finReal,
            allDay: true,
            userEmail: auth.currentUser.email,
            tipo: tipo // 👇 Guardamos el tipo en la base de datos
        });
        
        const modalEl = document.getElementById('modalReserva');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance.hide();
        
        // Limpiar campos
        document.getElementById('txt-titulo').value = "";
        
        Swal.fire({
            icon: 'success',
            title: '¡Reservado!',
            text: `Reserva ${tipo} guardada con éxito.`,
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