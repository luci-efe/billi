import { useState, useEffect, useCallback } from 'react';
import { apiClient, buildApiUrl } from '../lib/api-client';

export interface DocumentItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  createdAt: number;
}

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Build a stable URL for downloading/previewing a document.
 * Uses the same API base resolution as fetch calls so staging Pages does not
 * accidentally request the SPA shell from same-origin /api/* URLs.
 */
export function documentDownloadUrl(documentId: string): string {
  return buildApiUrl(`/api/documents/${documentId}`);
}

/**
 * Translate API error responses into Spanish UI strings.
 */
function describeUploadError(status: number, message?: string): string {
  if (status === 413) return 'El archivo excede el límite de 5MB.';
  if (status === 415) return 'Formato de archivo no permitido. Solo PDF, JPG, PNG o WebP.';
  if (status === 422) return message || 'El archivo no pudo procesarse.';
  if (status === 400) return message || 'Solicitud inválida.';
  if (status === 404) return 'La transacción ya no existe.';
  return message || 'No pudimos subir el comprobante. Intenta de nuevo.';
}

export function useDocuments(transactionId: string | null) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!transactionId) {
      setDocuments([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/api/transactions/${transactionId}/documents`);
      if (!res.ok) {
        setError('No pudimos cargar los comprobantes.');
        setDocuments([]);
        return;
      }
      const data = (await res.json()) as { items: DocumentItem[] };
      setDocuments(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al listar comprobantes.');
    } finally {
      setIsLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { documents, isLoading, error, refresh };
}

/**
 * uploadDocument — POSTs a multipart/form-data file to the API.
 * On 413/415/422/400/404 surfaces a Spanish error string.
 */
export async function uploadDocument(
  transactionId: string,
  file: File,
): Promise<DocumentItem> {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    throw new Error('El archivo excede el límite de 5MB.');
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as typeof ALLOWED_DOCUMENT_MIME_TYPES[number])) {
    throw new Error('Formato de archivo no permitido. Solo PDF, JPG, PNG o WebP.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.postFormData(
    `/api/transactions/${transactionId}/documents`,
    formData,
  );

  if (!res.ok) {
    let message: string | undefined;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      message = data.message ?? data.error;
    } catch {
      // ignore JSON parse failure
    }
    throw new Error(describeUploadError(res.status, message));
  }

  return (await res.json()) as DocumentItem;
}

export async function deleteDocument(documentId: string): Promise<void> {
  const res = await apiClient.delete(`/api/documents/${documentId}`);
  if (!res.ok && res.status !== 204) {
    throw new Error('No pudimos eliminar el comprobante.');
  }
}

export async function fetchDocumentBlob(documentId: string): Promise<Blob> {
  const res = await apiClient.get(`/api/documents/${documentId}`);
  if (!res.ok) {
    throw new Error('No pudimos abrir el comprobante.');
  }
  return await res.blob();
}
