package com.sparklecow.citofonia.notification;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.user.entity.User;
import org.junit.jupiter.api.Test;

/**
 * Matriz de elegibilidad de notificaciones:
 * general para todos; visitas/domicilios solo para quien reside en su vivienda.
 */
class NotificationEligibilityServiceTest {

    private final NotificationEligibilityService service = new NotificationEligibilityService();

    @Test
    void everyAccountReceivesGeneralNotifications() {
        assertTrue(service.canReceive(admin(), NotificationType.GENERAL));
        assertTrue(service.canReceive(tenant(), NotificationType.GENERAL));
        assertTrue(service.canReceive(ownerResident(), NotificationType.GENERAL));
        assertTrue(service.canReceive(ownerAbsent(), NotificationType.GENERAL));
    }

    @Test
    void tenantLivingInApartmentReceivesVisitsAndDeliveries() {
        assertTrue(service.canReceive(tenant(), NotificationType.VISIT));
        assertTrue(service.canReceive(tenant(), NotificationType.DELIVERY));
    }

    @Test
    void ownerResidentReceivesVisitsAndDeliveries() {
        assertTrue(service.canReceive(ownerResident(), NotificationType.VISIT));
        assertTrue(service.canReceive(ownerResident(), NotificationType.DELIVERY));
    }

    @Test
    void absentOwnerOnlyReceivesGeneralNotifications() {
        assertFalse(service.canReceive(ownerAbsent(), NotificationType.VISIT));
        assertFalse(service.canReceive(ownerAbsent(), NotificationType.DELIVERY));
    }

    @Test
    void staffWithoutApartmentOnlyReceivesGeneralNotifications() {
        assertFalse(service.canReceive(admin(), NotificationType.VISIT));
        assertFalse(service.canReceive(admin(), NotificationType.DELIVERY));
    }

    @Test
    void housingProfilesReflectOccupancy() {
        assertTrue(service.profileOf(admin()) == HousingProfile.NONE);
        assertTrue(service.profileOf(tenant()) == HousingProfile.RESIDENT);
        assertTrue(service.profileOf(ownerResident()) == HousingProfile.RESIDENT);
        assertTrue(service.profileOf(ownerAbsent()) == HousingProfile.OWNER_ABSENT);
    }

    private User admin() {
        return new User("Ada", "Admin", "admin@test.local", "x", true);
    }

    private User tenant() {
        return resident(false, true);
    }

    private User ownerResident() {
        return resident(true, true);
    }

    private User ownerAbsent() {
        return resident(true, false);
    }

    private User resident(boolean owner, boolean occupies) {
        User user = new User("Ana", "Residente", "r" + System.nanoTime() + "@test.local", "x", true);
        user.setApartment(new Apartment("A-101", "Torre A", 1, null));
        user.setOwner(owner);
        user.setOccupiesApartment(occupies);
        return user;
    }
}
