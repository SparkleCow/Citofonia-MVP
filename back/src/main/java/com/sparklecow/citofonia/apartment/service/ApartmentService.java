package com.sparklecow.citofonia.apartment.service;

import com.sparklecow.citofonia.apartment.dto.ApartmentOptionResponse;
import com.sparklecow.citofonia.apartment.dto.ApartmentRequest;
import com.sparklecow.citofonia.apartment.dto.ApartmentResponse;
import com.sparklecow.citofonia.apartment.dto.ApartmentResidentResponse;
import com.sparklecow.citofonia.apartment.entity.Apartment;
import com.sparklecow.citofonia.apartment.repository.ApartmentRepository;
import com.sparklecow.citofonia.common.exception.ConflictException;
import com.sparklecow.citofonia.common.exception.NotFoundException;
import com.sparklecow.citofonia.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de gestion de apartamentos y sus residentes.
 *
 * <p>La lectura de apartamentos con residentes esta pensada para los roles de
 * administracion ({@code ADMIN}) y consergeria ({@code CONCIERGE}). El borrado es
 * logico: la unidad deja de ser utilizable pero se conserva.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ApartmentService {

    private final ApartmentRepository apartmentRepository;
    private final UserRepository userRepository;

    /** Listado paginado de apartamentos activos, cada uno con sus residentes. */
    @Transactional(readOnly = true)
    public Page<ApartmentResponse> list(Pageable pageable) {
        return apartmentRepository.findAllByDeletedFalse(pageable)
                .map(this::toResponseWithResidents);
    }

    /**
     * Listado ligero y <strong>publico</strong> de unidades activas para el
     * formulario de autoregistro de residentes. Sin residentes ni notas.
     */
    @Transactional(readOnly = true)
    public List<ApartmentOptionResponse> options() {
        return apartmentRepository.findAllByDeletedFalse().stream()
                .sorted((a, b) -> a.getIdentifier().compareToIgnoreCase(b.getIdentifier()))
                .map(ApartmentOptionResponse::from)
                .toList();
    }

    /** Detalle de un apartamento activo con sus residentes. */
    @Transactional(readOnly = true)
    public ApartmentResponse getById(Long id) {
        return toResponseWithResidents(findActive(id));
    }

    /** Residentes activos vinculados a un apartamento. */
    @Transactional(readOnly = true)
    public List<ApartmentResidentResponse> listResidents(Long id) {
        findActive(id);
        return findResidents(id);
    }

    /** Creacion de una unidad. Solo administracion. */
    @Transactional
    public ApartmentResponse create(ApartmentRequest request) {
        if (apartmentRepository.existsByIdentifierAndDeletedFalse(normalizeIdentifier(request.identifier()))) {
            throw new ConflictException("Ya existe un apartamento con ese identificador");
        }
        Apartment saved = apartmentRepository.save(new Apartment(
                normalizeIdentifier(request.identifier()),
                normalize(request.block()),
                request.floor(),
                normalize(request.notes())));
        log.info("Apartamento creado: {}", saved.getIdentifier());
        return toResponseWithResidents(saved);
    }

    /** Actualizacion de una unidad. Solo administracion. */
    @Transactional
    public ApartmentResponse update(Long id, ApartmentRequest request) {
        Apartment apartment = findActive(id);
        String identifier = normalizeIdentifier(request.identifier());
        if (apartmentRepository.existsByIdentifierAndDeletedFalse(identifier)
                && !apartment.getIdentifier().equals(identifier)) {
            throw new ConflictException("Ya existe un apartamento con ese identificador");
        }
        apartment.setIdentifier(identifier);
        apartment.setBlock(normalize(request.block()));
        apartment.setFloor(request.floor());
        apartment.setNotes(normalize(request.notes()));
        log.info("Apartamento actualizado: {}", apartment.getIdentifier());
        return toResponseWithResidents(apartment);
    }

    /** Borrado logico de una unidad. Los residentes quedan sin apartamento. */
    @Transactional
    public void delete(Long id) {
        Apartment apartment = findActive(id);
        userRepository.findAllByApartmentIdAndDeletedFalse(id)
                .forEach(user -> user.setApartment(null));
        apartment.setDeleted(true);
        log.info("Apartamento eliminado logicamente: {}", apartment.getIdentifier());
    }

    private Apartment findActive(Long id) {
        return apartmentRepository.findByIdAndDeletedFalse(id)
                .orElseThrow(() -> new NotFoundException("Apartamento no encontrado con id " + id));
    }

    private List<ApartmentResidentResponse> findResidents(Long apartmentId) {
        return userRepository.findAllByApartmentIdAndDeletedFalse(apartmentId).stream()
                .map(ApartmentResidentResponse::from)
                .toList();
    }

    private ApartmentResponse toResponseWithResidents(Apartment apartment) {
        return ApartmentResponse.from(apartment, findResidents(apartment.getId()));
    }

    private String normalizeIdentifier(String value) {
        return value.trim().toUpperCase();
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
