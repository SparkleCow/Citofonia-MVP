import api from '@/api/axios';
import { API_BASE_URL } from '@/config/env';
import type { AttachmentResponse } from '@/types';

export interface UploadableFile {
  uri: string;
  name: string;
  type: string;
  /** Solo web: el File/Blob real (FormData del navegador no acepta { uri }). */
  blob?: Blob | null;
}

/** `AttachmentController` — `/api/attachments` (ADMIN | CONCIERGE). */
export const attachmentsApi = {
  upload: (file: UploadableFile, entityType: string, entityId?: number | null) => {
    const form = new FormData();
    // React Native acepta { uri, name, type } como parte de un multipart.
    if (file.blob) form.append('file', file.blob, file.name);
    else form.append('file', file as unknown as Blob);
    form.append('entityType', entityType);
    if (entityId != null) form.append('entityId', String(entityId));
    return api
      .post<AttachmentResponse>('/api/attachments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((response) => response.data);
  },
  /** URL del contenido (requiere cabecera Authorization: usar con `attachmentSource`). */
  contentUrl: (id: number) => `${API_BASE_URL}/api/attachments/${id}/content`,
  list: (entityType: string, entityId: number) =>
    api
      .get<AttachmentResponse[]>('/api/attachments', { params: { entityType, entityId } })
      .then((response) => response.data),
};
