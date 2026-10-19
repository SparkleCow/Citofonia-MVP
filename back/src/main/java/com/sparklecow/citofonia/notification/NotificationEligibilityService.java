package com.sparklecow.citofonia.notification;

import com.sparklecow.citofonia.user.entity.User;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Regla de elegibilidad de notificaciones por usuario.
 *
 * <ul>
 *   <li><strong>GENERAL</strong>: toda cuenta habilitada, con o sin vivienda
 *       (administracion, vigilancia y residentes).</li>
 *   <li><strong>VISIT / DELIVERY</strong>: solo quien reside en su apartamento.
 *       Un propietario ausente recibe unicamente notificaciones generales; los
 *       inquilinos y los propietarios residentes reciben ademas visitas y
 *       domicilios.</li>
 * </ul>
 */
@Service
public class NotificationEligibilityService {

    /** Indica si el usuario puede recibir notificaciones de un tipo dado. */
    public boolean canReceive(User user, NotificationType type) {
        return switch (type) {
            case GENERAL -> true;
            case VISIT, DELIVERY -> livesInApartment(user);
        };
    }

    /** Perfil de vivienda del usuario ({@code null} si no tiene vivienda). */
    public HousingProfile profileOf(User user) {
        if (user.getApartment() == null) {
            return HousingProfile.NONE;
        }
        if (!user.isOccupiesApartment()) {
            return HousingProfile.OWNER_ABSENT;
        }
        return HousingProfile.RESIDENT;
    }

    /** Tipos que el usuario puede recibir en su bandeja. */
    public List<NotificationType> allowedTypes(User user) {
        return List.of(NotificationType.values()).stream()
                .filter(type -> canReceive(user, type))
                .toList();
    }

    private boolean livesInApartment(User user) {
        return user.getApartment() != null && user.isOccupiesApartment();
    }
}
