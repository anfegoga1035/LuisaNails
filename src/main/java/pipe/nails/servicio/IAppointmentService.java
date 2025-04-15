package pipe.nails.servicio;

import org.springframework.stereotype.Service;
import pipe.nails.modelo.Appointment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;


public interface IAppointmentService {
    Appointment createAppointment(Appointment appointment);

    List<Appointment> getAppointmentsByDate(LocalDate date);

    List<Appointment> getAllAppointments(); // Nuevo método si queremos obtener todas sin filtrar

    Optional<Appointment> getAppointmentById(Long id);

    BigDecimal calculateDailyTotal(LocalDate date);

    void deleteAppointment(Long id);

    Appointment updateAppointment(Long id, Appointment appointmentDetails);


    BigDecimal calculateTotalForDateRange(LocalDate startDate, LocalDate endDate);


    List<Appointment> getAppointmentsBetweenDates(LocalDate startDate, LocalDate endDate);
}
