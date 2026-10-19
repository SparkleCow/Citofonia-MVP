package com.sparklecow.citofonia.user.enums;

/**
 * Roles disponibles del sistema.
 */
public enum RoleName {

    /** Acceso total: gestion de usuarios, codigos de registro y configuracion. */
    ADMIN("ROLE_ADMIN"),

    /** Personal de vigilancia/gerencia: panel operativo del edificio. */
    SECURITY("ROLE_SECURITY"),

    /** Residente (rol por defecto de cualquier cuenta registrada). */
    USER("ROLE_USER");

    private final String authority;

    RoleName(String authority) {
        this.authority = authority;
    }

    public String getAuthority() {
        return authority;
    }

    /**
     * Indica si el rol puede obtenerse mediante el codigo de registro fijo
     * de residentes. Solo {@code USER}: los demas roles los crea un
     * administrador desde el panel de administracion.
     */
    public boolean isRegistrable() {
        return this == USER;
    }
}
