package pipe.nails.servicio;


import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional; // <--- ESTA ES LA CORRECTA
import org.springframework.beans.factory.annotation.Autowired;
import pipe.nails.modelo.Appointment;
import pipe.nails.repositorio.AppointmentRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class AppointmentServiceImpl implements IAppointmentService{

    @Autowired // Inyectamos el Repositorio
    private AppointmentRepository appointmentRepository;

    @Override
    @Transactional // Asegura que la operación de guardado sea transaccional
    public Appointment createAppointment(Appointment appointment) {
        // Aquí podríamos añadir lógica de negocio antes de guardar
        // Por ejemplo, validar si la hora ya está ocupada, etc.
        return appointmentRepository.save(appointment);
    }

    @Override
    @Transactional(readOnly = true) // Transacción de solo lectura, optimiza rendimiento
    public List<Appointment> getAppointmentsByDate(LocalDate date) {
        return appointmentRepository.findByAppointmentDateOrderByAppointmentTimeAsc(date);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Appointment> getAllAppointments() {
        // Aquí podríamos añadir lógica como ordenar por defecto
        return appointmentRepository.findAll(); // O usar JpaRepository.findAll(Sort.by(...))
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Appointment> getAppointmentById(Long id) {
        return appointmentRepository.findById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateDailyTotal(LocalDate date) {
        // La consulta ya está definida en el repositorio, el servicio solo la llama
        return appointmentRepository.calculateDailyTotal(date);
    }

    @Override
    @Transactional // Transacción de escritura/modificación
    public void deleteAppointment(Long id) {
        // Podríamos añadir validaciones aquí, por ejemplo, si existe antes de borrar
        if (!appointmentRepository.existsById(id)) {
            // Podríamos lanzar una excepción personalizada aquí
            // throw new AppointmentNotFoundException("Cita con ID " + id + " no encontrada.");
            // Por ahora, simplemente no hacemos nada o dejamos que deleteById falle si no existe
            // (depende del comportamiento deseado)
        }
        appointmentRepository.deleteById(id);
    }

    // Implementación del método update si lo añadiéramos

    @Override
    @Transactional
    public Appointment updateAppointment(Long id, Appointment appointmentDetails) {
        Appointment existingAppointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cita no encontrada con id: " + id)); // O una excepción personalizada

        // Actualizar los campos necesarios
        existingAppointment.setClientName(appointmentDetails.getClientName());
        existingAppointment.setAppointmentDate(appointmentDetails.getAppointmentDate());
        existingAppointment.setAppointmentTime(appointmentDetails.getAppointmentTime());
        existingAppointment.setCost(appointmentDetails.getCost());

        return appointmentRepository.save(existingAppointment);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalForDateRange(LocalDate startDate, LocalDate endDate) {
        // Podrías añadir validación aquí si startDate es posterior a endDate, aunque el frontend también debería hacerlo.
        if (startDate == null || endDate == null) {
            throw new IllegalArgumentException("Las fechas de inicio y fin no pueden ser nulas.");
        }
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("La fecha de inicio no puede ser posterior a la fecha de fin.");
        }
        return appointmentRepository.calculateTotalBetweenDates(startDate, endDate);
    }

    // --- IMPLEMENTACIÓN OPCIONAL (si quieres la lista detallada para el PDF después) ---
    @Override
    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsBetweenDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Fechas inválidas para obtener citas.");
        }
        return appointmentRepository.findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(startDate, endDate);
    }





}
