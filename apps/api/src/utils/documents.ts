import { ulid } from 'ulid';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function validateFileUpload(file: { size: number; type: string }) {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: 'El archivo excede el límite de 5MB.',
    };
  }

  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Formato de archivo no permitido. Solo se aceptan imágenes y PDFs.',
    };
  }

  return { valid: true };
}

export function getStorageKey(userId: string, transactionId: string, fileName: string) {
  const extension = fileName.split('.').pop() || '';
  const fileId = ulid();
  return `${userId}/${transactionId}/${fileId}.${extension}`;
}
