package com.sparklecow.citofonia.apartment.entity;

import com.sparklecow.citofonia.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Apartamento o unidad habitacional del conjunto residencial.
 *
 * <p>Los usuarios con rol {@code USER} (inquilinos/clientes) pueden quedar
 * vinculados a un apartamento. El borrado es logico: la unidad se marca como
 * eliminada pero se conserva para no perder el historial de residentes.</p>
 */
@Entity
@Table(name = "apartments")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Apartment extends BaseEntity {

    /** Identificador visible de la unidad (ej. "A-101"). Unico en el sistema. */
    @Column(nullable = false, unique = true, length = 40)
    private String identifier;

    /** Torre, bloque o pabellon al que pertenece la unidad. */
    @Column(length = 60)
    private String block;

    /** Piso o nivel de la unidad. */
    private Integer floor;

    /** Notas internas de administracion. */
    @Column(length = 200)
    private String notes;

    /** Borrado logico de la unidad. */
    @Column(nullable = false)
    private boolean deleted;

    public Apartment(String identifier, String block, Integer floor, String notes) {
        this.identifier = identifier;
        this.block = block;
        this.floor = floor;
        this.notes = notes;
    }
}
