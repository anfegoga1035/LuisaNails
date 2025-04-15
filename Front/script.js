document.addEventListener('DOMContentLoaded', () => {
    // URL base de la API del backend
    const apiUrl = 'http://localhost:8080/api/appointments';
    
    //const apiUrl = 'https://7hvldqkb-8080.use2.devtunnels.ms/api/appointments';
    

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    // Navbar Links & Toggler
    const navViewLink = document.getElementById('nav-view');
    const navAddLink = document.getElementById('nav-add');
    const navReportsLink = document.getElementById('nav-reports');
    const navToggler = document.querySelector('.navbar-toggler'); // Botón del menú hamburguesa
    const navCollapse = document.getElementById('navbarNav');     // Contenido colapsable del menú
    // Sections Wrappers
    const sectionViewDaily = document.getElementById('section-view-daily');
    const sectionAddEdit = document.getElementById('section-add-edit');
    const sectionReports = document.getElementById('section-reports');
    const allSections = [sectionViewDaily, sectionAddEdit, sectionReports];
    const allNavLinks = [navViewLink, navAddLink, navReportsLink];

    // Formulario Agregar/Editar Cita
    const appointmentForm = document.getElementById('appointmentForm');
    const editAppointmentIdInput = document.getElementById('editAppointmentId');
    const clientNameInput = document.getElementById('clientName');
    const appointmentDateInput = document.getElementById('appointmentDate');
    const appointmentTimeInput = document.getElementById('appointmentTime');
    const costInput = document.getElementById('cost');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    // Sección Ver Citas por Día
    const viewDateInput = document.getElementById('viewDate');
    const loadAppointmentsBtn = document.getElementById('loadAppointmentsBtn');
    const dailyTotalSpan = document.getElementById('dailyTotal');
    const appointmentsTbody = document.getElementById('appointmentsTbody');

    // Sección Reporte por Rango
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const reportResultArea = document.getElementById('reportResultArea');
    const reportDateRangeSpan = document.getElementById('reportDateRange');
    const reportAppointmentCountSpan = document.getElementById('reportAppointmentCount');
    const reportTotalSpan = document.getElementById('reportTotal');
    const printPdfBtn = document.getElementById('printPdfBtn');
    const reportErrorArea = document.getElementById('reportErrorArea');

    // --- FORMATEADORES ---
    const numberFormatter = new Intl.NumberFormat('es-CO', { style: 'decimal', maximumFractionDigits: 0, minimumFractionDigits: 0 });
    const timeFormatter = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateTimeFormatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });

    // --- ALMACENAMIENTO TEMPORAL DE DATOS ---
    let appointmentsData = new Map(); // Guarda datos de citas diarias para edición
    let lastReportData = { startDate: null, endDate: null, total: null, appointments: [] }; // Guarda datos del último reporte generado

    // --- FUNCIONES AUXILIARES ---
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function formatTimeAmPm(timeString) {
        if (!timeString) return 'N/A';
        try {
            const timeParts = timeString.split(':');
            const dateForFormatting = new Date();
            dateForFormatting.setHours(parseInt(timeParts[0], 10), parseInt(timeParts[1], 10), 0, 0);
            return timeFormatter.format(dateForFormatting);
        } catch (e) {
            console.error("Error formateando hora:", timeString, e);
            return timeString; // Devuelve el original si falla
        }
    }

    /**
     * Muestra una sección y oculta las demás, actualiza el estado activo del Navbar.
     */
    function showSection(sectionIdToShow) {
        allSections.forEach(section => { if (section) section.style.display = 'none'; });
        allNavLinks.forEach(link => { if (link) { link.classList.remove('active'); link.removeAttribute('aria-current'); } });
        const sectionToShow = document.getElementById(sectionIdToShow);
        if (sectionToShow) {
            sectionToShow.style.display = 'block';
            let activeLink = null;
            if (sectionIdToShow === 'section-view-daily') activeLink = navViewLink;
            else if (sectionIdToShow === 'section-add-edit') activeLink = navAddLink;
            else if (sectionIdToShow === 'section-reports') activeLink = navReportsLink;
            if(activeLink) { activeLink.classList.add('active'); activeLink.setAttribute('aria-current', 'page'); }
        } else {
            console.error(`Sección no encontrada: ${sectionIdToShow}, mostrando vista por defecto.`);
            if(sectionViewDaily) sectionViewDaily.style.display = 'block'; // Fallback
            if(navViewLink) { navViewLink.classList.add('active'); navViewLink.setAttribute('aria-current', 'page'); }
        }
    }

    // --- FUNCIONES PRINCIPALES (CRUD Citas) ---

    async function loadAppointments(date) {
        if (!date) {
            appointmentsTbody.innerHTML = '<tr><td colspan="5" class="text-center">Selecciona una fecha para ver las citas.</td></tr>';
            dailyTotalSpan.textContent = '$ ' + numberFormatter.format(0);
            return;
        }
        loadAppointmentsBtn.disabled = true;
        loadAppointmentsBtn.textContent = 'Cargando...';
        try {
            // Usar Promise.all para hacer ambas peticiones en paralelo
            const [appointmentsResponse, totalResponse] = await Promise.all([
                fetch(`${apiUrl}?date=${date}`),
                fetch(`${apiUrl}/daily-total?date=${date}`)
            ]);

            // Verificar ambas respuestas
            if (!appointmentsResponse.ok) throw new Error(`Error ${appointmentsResponse.status} al cargar citas.`);
            if (!totalResponse.ok) throw new Error(`Error ${totalResponse.status} al cargar total diario.`);

            const appointments = await appointmentsResponse.json();
            const total = await totalResponse.json();

            renderAppointments(appointments);
            dailyTotalSpan.textContent = '$ ' + numberFormatter.format(total);
        } catch (error) {
            console.error('Error al cargar datos diarios:', error);
            appointmentsTbody.innerHTML = '<tr><td colspan="5" class="text-center">Error al cargar las citas. Intenta de nuevo.</td></tr>';
            dailyTotalSpan.textContent = 'Error';
            alert(`Error al cargar datos: ${error.message}`);
        } finally {
            loadAppointmentsBtn.disabled = false;
            loadAppointmentsBtn.textContent = 'Cargar Citas';
        }
    }

    function renderAppointments(appointments) {
        appointmentsTbody.innerHTML = ''; // Limpiar tabla
        appointmentsData.clear(); // Limpiar mapa de datos

        if (appointments.length === 0) {
            appointmentsTbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay citas para esta fecha.</td></tr>';
            return;
        }

        appointments.forEach(app => {
            appointmentsData.set(app.id.toString(), app); // Guardar datos para posible edición
            const formattedTime = formatTimeAmPm(app.appointmentTime);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(app.clientName)}</td>
                <td>${app.appointmentDate}</td>
                <td>${formattedTime}</td>
                <td>$ ${numberFormatter.format(app.cost)}</td>
                <td class="text-center"> 
                    
                    <button class="btn btn-sm btn-warning edit-btn d-block mx-auto mb-1" data-id="${app.id}" title="Editar">Editar</button>
                    
                    <button class="btn btn-sm btn-danger delete-btn d-block mx-auto" data-id="${app.id}" title="Eliminar">Eliminar</button>
                </td>
            `;
            appointmentsTbody.appendChild(row);
        });
    }

    function setupEditForm(appointmentId) {
        const idStr = appointmentId.toString();
        // 1. Verificar si existen los datos
        if (!appointmentsData.has(idStr)) {
            console.error("Datos de cita no encontrados para editar. ID:", appointmentId);
            alert("Error: No se encontraron los datos de la cita para editar.");
            return; // Salir si no hay datos
        }
        const app = appointmentsData.get(idStr);

        // 2. *** MOSTRAR LA SECCIÓN DE EDICIÓN ***
        showSection('section-add-edit');

        // 3. Rellenar el formulario con los datos encontrados
        editAppointmentIdInput.value = app.id; // Campo oculto para el ID
        clientNameInput.value = app.clientName;
        appointmentDateInput.value = app.appointmentDate;
        appointmentTimeInput.value = app.appointmentTime;
        costInput.value = app.cost;

        // 4. Ajustar botones y foco
        submitBtn.textContent = 'Actualizar Cita';
        submitBtn.classList.replace('btn-primary', 'btn-warning');
        cancelEditBtn.style.display = 'inline-block'; // Mostrar botón Cancelar

        // 5. Mover la vista y enfocar (opcional pero útil)
        sectionAddEdit.scrollIntoView({ behavior: 'smooth' }); // Scroll a la sección
        clientNameInput.focus();
    }

     function resetForm() {
        appointmentForm.reset();
        editAppointmentIdInput.value = ''; // Limpiar ID oculto
        submitBtn.textContent = 'Agregar Cita';
        submitBtn.classList.replace('btn-warning','btn-primary'); // Volver a botón primario
        cancelEditBtn.style.display = 'none'; // Ocultar botón cancelar
        // Opcional: volver a la vista de citas si se cancela una edición
        // if (sectionAddEdit.style.display === 'block') {
        //    showSection('section-view-daily');
        // }
    }

    async function handleFormSubmit(event) {
        event.preventDefault(); // Evitar envío tradicional del formulario

        const appointmentData = {
            clientName: clientNameInput.value.trim(),
            appointmentDate: appointmentDateInput.value,
            appointmentTime: appointmentTimeInput.value,
            cost: parseFloat(costInput.value) // Convertir a número
        };
        const editId = editAppointmentIdInput.value; // Obtener ID si estamos editando

        // Validación básica
        if (!appointmentData.clientName || !appointmentData.appointmentDate || !appointmentData.appointmentTime || isNaN(appointmentData.cost) || appointmentData.cost < 0) {
            alert('Por favor, completa todos los campos correctamente (el valor debe ser un número no negativo).');
            return;
        }

        const url = editId ? `${apiUrl}/${editId}` : apiUrl; // URL para editar o crear
        const method = editId ? 'PUT' : 'POST'; // Método HTTP
        const actionText = editId ? 'actualizar' : 'agregar';

        // Deshabilitar botones durante la petición
        submitBtn.disabled = true;
        cancelEditBtn.disabled = true;

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });

            if (!response.ok) {
                // Intentar obtener mensaje de error del backend si existe
                let errorMsg = `Error ${response.status} al ${actionText} la cita.`;
                try {
                    const errorData = await response.json();
                    errorMsg += `\nDetalle: ${errorData.message || JSON.stringify(errorData)}`;
                } catch(e) {
                    // No hacer nada si no se puede parsear el cuerpo del error
                }
                throw new Error(errorMsg);
            }

            // Éxito
            const resultData = await response.json(); // Podrías usar resultData si el backend devuelve la cita creada/actualizada
            alert(`Cita ${actionText}da exitosamente.`);
            resetForm(); // Limpiar el formulario

            // Recargar la lista de citas si la cita modificada pertenece a la fecha visualizada
             const dateToLoad = viewDateInput.value;
             if (dateToLoad && dateToLoad === appointmentData.appointmentDate) {
                 loadAppointments(dateToLoad); // Recargar la vista actual
                 showSection('section-view-daily'); // Asegurarse de volver a la vista de citas
             } else if (dateToLoad) {
                 // La cita modificada es de otra fecha, no recargar, pero informar
                 console.log(`Cita ${actionText}da para la fecha ${appointmentData.appointmentDate}. La vista actual (${dateToLoad}) no se recargó.`);
                 showSection('section-view-daily'); // Volver a la vista de citas
             } else {
                 // No había fecha seleccionada, simplemente ir a la vista de citas
                 showSection('section-view-daily');
             }

        } catch (error) {
            console.error(`Error al ${actionText} la cita:`, error);
            alert(`Error: ${error.message}`); // Mostrar mensaje de error al usuario
        } finally {
            // Rehabilitar botones
            submitBtn.disabled = false;
            cancelEditBtn.disabled = false;
        }
    }

    async function deleteAppointment(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta cita? Esta acción no se puede deshacer.')) {
            return; // No hacer nada si el usuario cancela
        }

        try {
            const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Cita no encontrada en el servidor.');
                }
                throw new Error(`Error ${response.status} al intentar eliminar.`);
            }

            // Éxito al eliminar
            alert('Cita eliminada exitosamente.');

            // Quitar la fila de la tabla localmente o recargar
            // Opción 1: Quitar fila localmente (más rápido si no hay cambios concurrentes)
            // const rowToRemove = appointmentsTbody.querySelector(`button[data-id="${id}"]`)?.closest('tr');
            // if (rowToRemove) rowToRemove.remove();
            // appointmentsData.delete(id.toString());
            // // Recalcular total diario si es necesario (requeriría otra llamada o cálculo local)

            // Opción 2: Recargar la lista para la fecha actual (más simple y asegura consistencia)
            if (viewDateInput.value) {
                loadAppointments(viewDateInput.value);
            } else {
                // Si no hay fecha seleccionada, limpiar la tabla
                renderAppointments([]);
                dailyTotalSpan.textContent = '$ ' + numberFormatter.format(0);
            }

        } catch (error) {
            console.error('Error al eliminar la cita:', error);
            alert(`Error al eliminar: ${error.message}`);
        }
    }

    // --- FUNCIONES DE REPORTE ---

    function validateReportDates() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        reportErrorArea.style.display = 'none'; // Ocultar error previo

        if (!startDate || !endDate) {
            showReportError('Por favor, selecciona ambas fechas (Inicio y Fin).');
            return false;
        }
        // Comparar fechas como objetos Date
        if (new Date(startDate) > new Date(endDate)) {
            showReportError('La Fecha de Inicio no puede ser posterior a la Fecha de Fin.');
            return false;
        }
        return true; // Fechas válidas
    }

    function showReportError(message) {
        reportErrorArea.textContent = message;
        reportErrorArea.style.display = 'block';
        // Ocultar resultados y botón PDF si hay error
        reportResultArea.style.display = 'none';
        printPdfBtn.style.display = 'none';
    }

    async function generateDateRangeReport() {
        if (!validateReportDates()) return; // Salir si las fechas no son válidas

        const startDate = startDateInput.value;
        const endDate = endDateInput.value;

        generateReportBtn.disabled = true;
        generateReportBtn.textContent = 'Generando...';
        reportResultArea.style.display = 'none'; // Ocultar resultados previos
        reportErrorArea.style.display = 'none';   // Ocultar errores previos
        printPdfBtn.style.display = 'none';     // Ocultar botón PDF
        lastReportData = { startDate: null, endDate: null, total: null, appointments: [] }; // Resetear datos

        try {
            // Peticiones en paralelo para total y lista
            const [totalResponse, listResponse] = await Promise.all([
                fetch(`${apiUrl}/range-total?startDate=${startDate}&endDate=${endDate}`),
                fetch(`${apiUrl}/range-list?startDate=${startDate}&endDate=${endDate}`)
            ]);

            let errorMsg = '';
            if (!totalResponse.ok) errorMsg += `Error ${totalResponse.status} obteniendo total. `;
            if (!listResponse.ok) errorMsg += `Error ${listResponse.status} obteniendo lista.`;
            if (errorMsg) throw new Error(errorMsg.trim()); // Lanzar error si alguna falló

            const total = await totalResponse.json();
            const appointmentsList = await listResponse.json();

            // Guardar datos para el PDF
            lastReportData = { startDate, endDate, total, appointments: appointmentsList };

            // Mostrar resultados
            reportDateRangeSpan.textContent = `${startDate} al ${endDate}`;
            reportAppointmentCountSpan.textContent = appointmentsList.length;
            reportTotalSpan.textContent = '$ ' + numberFormatter.format(total);
            reportResultArea.style.display = 'block'; // Mostrar área de resultados
            if (appointmentsList.length > 0) { // Mostrar botón PDF solo si hay datos
                 printPdfBtn.style.display = 'inline-block';
            }

        } catch (error) {
            console.error('Error al generar reporte:', error);
            showReportError(`Error al generar reporte: ${error.message}`);
        } finally {
            generateReportBtn.disabled = false;
            generateReportBtn.textContent = 'Generar Reporte';
        }
    }

    function generatePdfReport() {
        const { startDate, endDate, total, appointments } = lastReportData;

        // Validar que haya datos para el reporte
        if (startDate === null) {
            alert("Primero debes generar un reporte válido.");
            return;
        }

        // Verificar que jsPDF y autoTable estén cargados
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            alert("Error: La librería jsPDF no se ha cargado correctamente.");
            return;
        }
        const { jsPDF } = window.jspdf; // Desestructurar para obtener jsPDF
        if (typeof jsPDF.API.autoTable !== 'function') {
            alert("Error: El plugin jsPDF-AutoTable no se ha cargado correctamente.");
            return;
        }

        try {
            const doc = new jsPDF({
                orientation: 'p', // portrait
                unit: 'mm',
                format: 'a4'
            });

            // Márgenes y posición Y inicial
            const margin = 15; // Margen general
            let finalY = margin; // Trackea la posición Y actual

            // Título del Reporte
            doc.setFontSize(18);
            doc.text("Reporte Detallado de Ingresos", doc.internal.pageSize.getWidth() / 2, finalY + 7, { align: 'center' });
            finalY += 15; // Incrementar Y

            // Información del Reporte (Periodo, Conteo, Total)
            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60); // Gris oscuro para etiquetas
            doc.text(`Periodo:`, margin, finalY + 7);
            doc.setTextColor(0, 0, 0); // Negro para valores
            doc.text(`${startDate} al ${endDate}`, margin + 20, finalY + 7);
            finalY += 7;

            doc.setTextColor(60, 60, 60);
            doc.text(`Citas Encontradas:`, margin, finalY + 7);
            doc.setTextColor(0, 0, 0);
            doc.text(`${appointments.length}`, margin + 40, finalY + 7);
            finalY += 7;

            doc.setFontSize(12);
            doc.setTextColor(60, 60, 60);
            doc.text("Total Ingresos:", margin, finalY + 7);
            doc.setFontSize(14);
            doc.setTextColor(28, 111, 4); // Verde para el total
            doc.setFont(undefined, 'bold'); // Negrita
            doc.text(`$ ${numberFormatter.format(total)}`, margin + 35, finalY + 7);
            doc.setFont(undefined, 'normal'); // Restaurar fuente normal
            doc.setTextColor(0, 0, 0); // Restaurar color negro
            finalY += 15; // Espacio antes de la tabla

            // Tabla de Citas Detalladas (si existen)
            if (appointments.length > 0) {
                const tableColumn = ["Fecha", "Hora", "Cliente", "Valor ($)"];
                const tableRows = appointments.map(app => [
                    app.appointmentDate,
                    formatTimeAmPm(app.appointmentTime), // Usar hora formateada AM/PM
                    app.clientName,
                    numberFormatter.format(app.cost) // Valor formateado
                ]);

                doc.autoTable({
                    head: [tableColumn],
                    body: tableRows,
                    startY: finalY, // Empezar tabla después del texto anterior
                    theme: 'grid', // Estilo de la tabla
                    headStyles: {
                        fillColor: [22, 160, 133], // Color de fondo cabecera (verde azulado)
                        textColor: 255 // Color texto cabecera (blanco)
                    },
                    styles: {
                        fontSize: 9, // Tamaño de fuente del cuerpo
                        cellPadding: 1.5 // Espaciado interno celdas
                    },
                    columnStyles: {
                        3: { halign: 'right' } // Alinear columna de Valor a la derecha
                    },
                    didDrawPage: function (data) {
                        // Opcional: Añadir pie de página en cada página si la tabla se extiende
                        // Footer
                        const pageHeight = doc.internal.pageSize.getHeight();
                        doc.setFontSize(9);
                        doc.setTextColor(150, 150, 150);
                        const generationDate = dateTimeFormatter.format(new Date());
                        doc.text(`Generado el: ${generationDate}`, data.settings.margin.left, pageHeight - 10);
                        doc.text(`Página ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - data.settings.margin.right, pageHeight - 10, { align: 'right' });
                    }
                });
                // Actualizar finalY a la posición después de la tabla (no necesario si no hay más contenido)
                // finalY = doc.lastAutoTable.finalY;
            } else {
                 // Mensaje si no hay citas detalladas
                 doc.setFontSize(10);
                 doc.setTextColor(150, 150, 150); // Gris claro
                 doc.text("No se encontraron citas detalladas en este periodo.", margin, finalY + 5);
                 finalY += 10;
            }

            // Pie de página (si la tabla no ocupa varias páginas o si no se usó didDrawPage)
            // Se comenta porque ya se incluye en didDrawPage para tablas largas
            /*
            if (doc.internal.getNumberOfPages() <= 1) { // Solo si es una página
                doc.setFontSize(9);
                doc.setTextColor(150, 150, 150);
                const generationDate = dateTimeFormatter.format(new Date());
                const pageHeight = doc.internal.pageSize.getHeight();
                doc.text(`Generado el: ${generationDate}`, margin, pageHeight - 10);
            }
            */

            // Nombre del archivo y guardar
            const fileName = `Reporte_Detallado_${startDate}_a_${endDate}.pdf`;
            doc.save(fileName);

        } catch(error) {
            console.error("Error al generar el PDF:", error);
            alert("Ocurrió un error al intentar generar el archivo PDF. Revisa la consola para más detalles.");
        }
    }

    // --- CÓDIGO PARA CERRAR NAVBAR AL CLICAR FUERA ---
    if (navToggler && navCollapse) {
        // Crear instancia de Collapse de Bootstrap (asegúrate que Bootstrap JS esté cargado)
        const bsCollapse = new bootstrap.Collapse(navCollapse, {
            toggle: false // Inicializar sin cambiar el estado
        });

        document.addEventListener('click', function (event) {
            const isClickInsideNavbar = navCollapse.contains(event.target);
            const isClickOnToggler = navToggler.contains(event.target);
            const isNavbarExpanded = navCollapse.classList.contains('show');

            // Si el menú está expandido y el clic NO fue dentro del menú ni en el botón toggler
            if (isNavbarExpanded && !isClickInsideNavbar && !isClickOnToggler) {
                bsCollapse.hide(); // Ocultar el menú
            }
        });
    }
    // --- FIN CÓDIGO PARA CERRAR NAVBAR ---


    // --- EVENT LISTENERS ---
    // Navegación principal
    navViewLink.addEventListener('click', (e) => { e.preventDefault(); showSection('section-view-daily'); });
    navAddLink.addEventListener('click', (e) => { e.preventDefault(); resetForm(); showSection('section-add-edit'); }); // Resetear form al ir a agregar
    navReportsLink.addEventListener('click', (e) => { e.preventDefault(); showSection('section-reports'); });

    // Sección Vista Diaria
    loadAppointmentsBtn.addEventListener('click', () => {
        if (viewDateInput.value) {
            loadAppointments(viewDateInput.value);
        } else {
            alert('Por favor, selecciona una fecha.');
        }
    });

    // Formulario Agregar/Editar
    appointmentForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', () => {
        resetForm();
        showSection('section-view-daily'); // Volver a la vista diaria al cancelar
    });

    // Tabla de Citas (Delegación de eventos para botones Editar/Eliminar)
    appointmentsTbody.addEventListener('click', (event) => {
        const button = event.target.closest('button'); // Encuentra el botón más cercano al clic
        if (!button) return; // Salir si no se hizo clic en un botón o cerca

        const id = button.dataset.id; // Obtener el ID del data-attribute

        if (button.classList.contains('delete-btn') && id) {
            deleteAppointment(id);
        } else if (button.classList.contains('edit-btn') && id) {
            setupEditForm(id);
        }
    });

    // Sección Vista Diaria - Carga automática al cambiar fecha
    if (viewDateInput) { // Buena práctica verificar si el elemento existe
        viewDateInput.addEventListener('change', () => {
            const selectedDate = viewDateInput.value;
            if (selectedDate) { // Solo cargar si se seleccionó una fecha válida
                loadAppointments(selectedDate);
            } else {
                // Opcional: Limpiar la tabla si el usuario borra la fecha
                appointmentsTbody.innerHTML = '<tr><td colspan="5" class="text-center">Selecciona una fecha para ver las citas.</td></tr>';
                dailyTotalSpan.textContent = '$ ' + numberFormatter.format(0);
            }
        });
    }

    // Sección Vista Diaria - Botón de carga manual (puedes mantenerlo o quitarlo)
    loadAppointmentsBtn.addEventListener('click', () => {
        if (viewDateInput.value) {
            loadAppointments(viewDateInput.value);
        } else {
            alert('Por favor, selecciona una fecha.');
        }
    });


    // Sección Reportes
    generateReportBtn.addEventListener('click', generateDateRangeReport);
    printPdfBtn.addEventListener('click', generatePdfReport);

    // --- INICIALIZACIÓN ---
    showSection('section-view-daily'); // Mostrar la sección por defecto al cargar
    // Opcional: Poner fecha actual en campos de fecha al iniciar
    const today = new Date().toISOString().split('T')[0]; // Obtener fecha de hoy en formato YYYY-MM-DD
    
    if (viewDateInput) {
        viewDateInput.value = today;
        // NO establecemos 'min' aquí para permitir consultar días pasados
    }
    if (appointmentDateInput) {
        appointmentDateInput.value = today;
        appointmentDateInput.min = today; // <-- Añadido: No permitir fechas anteriores a hoy
    }
    if (startDateInput) {
        startDateInput.value = today;
        
    }
    if (endDateInput) {
        endDateInput.value = today;
        
    }

    // Cargar citas del día actual al inicio
    if (viewDateInput && viewDateInput.value) {
        loadAppointments(viewDateInput.value);
    }
    // const today = new Date().toISOString().split('T')[0];
    // viewDateInput.value = today;
    // appointmentDateInput.value = today;
    // startDateInput.value = today;
    // endDateInput.value = today;
    // loadAppointments(today); // Cargar citas del día actual al inicio

    if (viewDateInput && viewDateInput.value) { // Asegurarse que la fecha se estableció
        loadAppointments(viewDateInput.value);
    }
    console.log("Aplicación Citas Nails inicializada.");

}); // Fin del DOMContentLoaded