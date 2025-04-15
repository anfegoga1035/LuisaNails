package pipe.nails.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pipe.nails.modelo.Appointment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    // Método para encontrar todas las citas de una fecha específica
    List<Appointment> findByAppointmentDate(LocalDate date);

    // Método para calcular la suma total del costo para una fecha específica
    // COALESCE se usa para devolver 0 si no hay citas ese día
    @Query("SELECT COALESCE(SUM(a.cost), 0) FROM Appointment a WHERE a.appointmentDate = :date")
    BigDecimal calculateDailyTotal(@Param("date") LocalDate date);

    // Spring Data JPA infiere esta consulta por el nombre del método
    List<Appointment> findByAppointmentDateOrderByAppointmentTimeAsc(LocalDate date);

    //Calcula la suma total de costos de citas entre dos fechas (incluidas).
    @Query("SELECT COALESCE(SUM(a.cost), 0) FROM Appointment a WHERE a.appointmentDate BETWEEN :startDate AND :endDate")
    BigDecimal calculateTotalBetweenDates(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    // Método para encontrar todas las citas entre dos fechas
    List<Appointment> findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(LocalDate startDate, LocalDate endDate);
}
