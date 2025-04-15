package pipe.nails.controlador;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pipe.nails.modelo.Appointment;
import pipe.nails.servicio.IAppointmentService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired // Inyectamos la dependencia del SERVICIO
    private IAppointmentService appointmentService; // Ya no inyectamos el Repositorio directamente

    // Endpoint para crear una nueva cita
    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@RequestBody Appointment appointment) {
        try {
            // Llama al método del servicio
            Appointment savedAppointment = appointmentService.createAppointment(appointment);
            return new ResponseEntity<>(savedAppointment, HttpStatus.CREATED);
        } catch (Exception e) {
            // Aquí podríamos manejar excepciones específicas lanzadas por el servicio
            // Loggear el error e
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Endpoint para obtener todas las citas (o por fecha)
    @GetMapping
    public ResponseEntity<List<Appointment>> getAppointments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            List<Appointment> appointments;
            if (date != null) {
                // Llama al método del servicio
                appointments = appointmentService.getAppointmentsByDate(date);
            } else {
                // Llama al método del servicio
                appointments = appointmentService.getAllAppointments();
            }
            return new ResponseEntity<>(appointments, HttpStatus.OK);
        } catch (Exception e) {
            // Loggear el error e
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Endpoint para obtener una cita específica por ID
    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getAppointmentById(@PathVariable Long id) {
        // Llama al método del servicio
        return appointmentService.getAppointmentById(id)
                .map(appointment -> new ResponseEntity<>(appointment, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND)); // El servicio devuelve Optional, lo manejamos aquí
    }

    // Endpoint para obtener el total del día
    @GetMapping("/daily-total")
    public ResponseEntity<BigDecimal> getDailyTotal(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            // Llama al método del servicio
            BigDecimal total = appointmentService.calculateDailyTotal(date);
            return new ResponseEntity<>(total, HttpStatus.OK);
        } catch (Exception e) {
            // Loggear el error e
            return new ResponseEntity<>(BigDecimal.ZERO, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // Endpoint para eliminar una cita
    @DeleteMapping("/{id}")
    public ResponseEntity<HttpStatus> deleteAppointment(@PathVariable Long id) {
        try {
            // Primero verificamos si existe usando el servicio
            if (!appointmentService.getAppointmentById(id).isPresent()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            }
            // Llama al método del servicio
            appointmentService.deleteAppointment(id);
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            // Aquí podríamos capturar excepciones específicas si el servicio las lanzara
            // Loggear el error e
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    // Aquí asumimos que el método updateAppointment ya está implementado en el servicio
    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(@PathVariable Long id, @RequestBody Appointment appointmentDetails) {
        try {
            Appointment updatedAppointment = appointmentService.updateAppointment(id, appointmentDetails);
            return new ResponseEntity<>(updatedAppointment, HttpStatus.OK);
        } catch (RuntimeException e) { // Capturar la excepción si no se encuentra
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        } catch (Exception e) {
            // Loggear el error e
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @GetMapping("/range-total")
    public ResponseEntity<?> getTotalBetweenDates(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            BigDecimal total = appointmentService.calculateTotalForDateRange(startDate, endDate);
            return ResponseEntity.ok(total); // Devuelve directamente el BigDecimal
        } catch (IllegalArgumentException e) {
            // Captura la excepción de validación del servicio
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            // Loggear el error 'e'
            System.err.println("Error calculando total por rango: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error interno al calcular el total.");
        }
    }

    // --- ENDPOINT OPCIONAL (si quieres la lista detallada para el PDF después) ---
    @GetMapping("/range-list")
    public ResponseEntity<?> getAppointmentsBetweenDates(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        try {
            List<Appointment> appointments = appointmentService.getAppointmentsBetweenDates(startDate, endDate);
            return ResponseEntity.ok(appointments);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.err.println("Error obteniendo citas por rango: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error interno al obtener las citas.");
        }
    }

}
