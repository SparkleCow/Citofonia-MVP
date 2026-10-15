package com.sparklecow.citofonia.user.enums;

/**
 * Roles disponibles del sistema.
 */
public enum RoleName {

    /** Acceso total: gestion de usuarios, codigos de registro y configuracion. */
    ADMIN("ROLE_ADMIN"),

    /** Perfiles de seguridad: acceso operativo a consultas de usuarios. */
    SECURITY("ROLE_SECURITY"),

    /** rol por defecto de cualquier cuenta registrada. */
    USER("ROLE_USER");

    private final String authority;

    RoleName(String authority) {
        this.authority = authority;
    }

    public String getAuthority() {
        return authority;
    }
}
