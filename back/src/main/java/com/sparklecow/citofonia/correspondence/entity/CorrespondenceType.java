package com.sparklecow.citofonia.correspondence.entity;

/**
 * Tipo de correspondencia recibida en el portal: paquete, carta, documento...
 */
public enum CorrespondenceType {

    /** Bulto o paquete de un transportista. */
    PAQUETE,

    /** Carta o correspondencia postal. */
    CARTA,

    /** Documento o notificacion administrativa. */
    DOCUMENTO,

    /** Recarga, publicidad o entrega de un proveedor. */
    OTRO
}
