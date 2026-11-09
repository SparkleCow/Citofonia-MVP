/** Parámetros de `Pageable` de Spring (page, size, sort). */
export interface PageParams {
  page?: number;
  size?: number;
  /** Ej.: `createdAt,desc`. */
  sort?: string;
}

export function pageParams({ page = 0, size = 20, sort = 'createdAt,desc' }: PageParams = {}) {
  return { page, size, sort };
}
