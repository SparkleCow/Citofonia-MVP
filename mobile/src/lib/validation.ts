/** Quita todo lo que no sea dígito y recorta a `max` caracteres. */
export function digitsOnly(value: string, max?: number) {
  const digits = value.replace(/\D+/g, '');
  return max ? digits.slice(0, max) : digits;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LIMITS = {
  phone: { min: 7, max: 15 },
  document: { min: 6, max: 12 },
  apartment: { min: 1, max: 10 },
  floor: { max: 200 },
} as const;

/** Cada validador devuelve el mensaje de error o `null` si es válido. */
export const validators = {
  phone(value: string, { required = false }: { required?: boolean } = {}) {
    if (!value) return required ? 'El teléfono es obligatorio.' : null;
    if (!/^\d+$/.test(value)) return 'Solo se permiten números.';
    if (value.length < LIMITS.phone.min || value.length > LIMITS.phone.max) {
      return `Debe tener entre ${LIMITS.phone.min} y ${LIMITS.phone.max} dígitos.`;
    }
    return null;
  },
  document(value: string, { required = false }: { required?: boolean } = {}) {
    if (!value) return required ? 'La cédula es obligatoria.' : null;
    if (!/^\d+$/.test(value)) return 'Solo se permiten números.';
    if (value.length < LIMITS.document.min || value.length > LIMITS.document.max) {
      return `Debe tener entre ${LIMITS.document.min} y ${LIMITS.document.max} dígitos.`;
    }
    return null;
  },
  apartmentNumber(value: string) {
    if (!value) return 'El número de apartamento es obligatorio.';
    if (!/^\d+$/.test(value)) return 'Solo se permiten números.';
    if (value.length > LIMITS.apartment.max) return `Máximo ${LIMITS.apartment.max} dígitos.`;
    return null;
  },
  floor(value: string) {
    if (!value) return null;
    if (!/^\d+$/.test(value)) return 'Solo se permiten números.';
    if (Number(value) > LIMITS.floor.max) return `El piso no puede superar ${LIMITS.floor.max}.`;
    return null;
  },
  email(value: string) {
    return EMAIL_REGEX.test(value.trim()) ? null : 'Introduce un email válido.';
  },
  password(value: string) {
    return value.length >= 8 ? null : 'La contraseña debe tener al menos 8 caracteres.';
  },
};

/** Minúsculas y sin tildes, para búsquedas tolerantes ("Pérez" == "perez"). */
export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
