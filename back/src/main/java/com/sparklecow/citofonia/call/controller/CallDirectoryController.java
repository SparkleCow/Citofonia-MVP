package com.sparklecow.citofonia.call.controller;

import com.sparklecow.citofonia.call.dto.ResidentDirectoryItem;
import com.sparklecow.citofonia.call.service.CallService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Directorio de residentes a los que vigilancia (o administracion) puede
 * llamar: cuentas con rol residente y vivienda vinculada.
 */
@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallDirectoryController {

    private final CallService callService;

    @GetMapping("/residents")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY')")
    public List<ResidentDirectoryItem> residents() {
        return callService.listResidents();
    }
}
