package com.sparklecow.citofonia.admin.dto;

import java.time.Instant;

/** Entrada del feed de actividad reciente del dashboard. */
public record ActivityItem(
        /** VISIT, PACKAGE, EMERGENCY o REGISTRATION. */
        String type,
        String title,
        String subtitle,
        Instant at) {
}
