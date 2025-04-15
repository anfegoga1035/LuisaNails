package pipe.nails.repositorio;

import org.springframework.data.jpa.repository.JpaRepository;
import pipe.nails.modelo.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<String, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
}
