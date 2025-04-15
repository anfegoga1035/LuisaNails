package pipe.nails.modelo;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id // Clave primaria
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Autoincremental
    private Long id;

    @Column(nullable = false, length = 100) // No puede ser nulo, longitud máxima 100
    private String clientName;

    @Column(nullable = false)
    private LocalDate appointmentDate; // Fecha de la cita

    @Column(nullable = false)
    private LocalTime appointmentTime; // Hora de la cita

    @Column(nullable = false, precision = 10, scale = 2) // Para valores monetarios
    private BigDecimal cost; // Valor de la cita
}
