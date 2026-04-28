import { ulid } from 'ulid';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_FILE_TYPES)[number];

const MIME_TO_EXT: Record<AllowedMimeType, 'pdf' | 'jpg' | 'png' | 'webp'> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extFromMime(mime: string): 'pdf' | 'jpg' | 'png' | 'webp' | null {
  return MIME_TO_EXT[mime as AllowedMimeType] ?? null;
}

type ValidationResult = { valid: true } | { valid: false; error: string };

function startsWith(bytes: Uint8Array, prefix: number[]): boolean {
  if (bytes.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) return false;
  }
  return true;
}

function bytesEqualAt(bytes: Uint8Array, offset: number, expected: number[]): boolean {
  if (bytes.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected[i]) return false;
  }
  return true;
}

function magicBytesMatch(mime: string, bytes: Uint8Array): boolean {
  switch (mime) {
    case 'application/pdf':
      // %PDF
      return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
    case 'image/jpeg':
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'image/png':
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'image/webp':
      // 'RIFF' .... 'WEBP'
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        bytesEqualAt(bytes, 8, [0x57, 0x45, 0x42, 0x50])
      );
    default:
      return false;
  }
}

export function validateFileUpload(file: {
  size: number;
  type: string;
  magicBytes: Uint8Array;
}): ValidationResult {
  if (file.size <= 0) {
    return { valid: false, error: 'El archivo está vacío.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'El archivo excede el límite de 5MB.' };
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: 'Formato de archivo no permitido. Solo se aceptan imágenes y PDFs.',
    };
  }
  if (!magicBytesMatch(file.type, file.magicBytes)) {
    return {
      valid: false,
      error: 'El contenido del archivo no coincide con el tipo declarado.',
    };
  }
  return { valid: true };
}

export function getStorageKey(input: {
  transactionId: string;
  fileName: string;
  mimeType: string;
}): string {
  const ext = extFromMime(input.mimeType);
  if (!ext) {
    // Caller should have validated already; fall back to opaque suffix.
    throw new Error('unsupported_mime_type');
  }
  return `${input.transactionId}/${ulid()}.${ext}`;
}

/**
 * Sanitize a user-supplied filename for safe storage in the DB `file_name`
 * column (display only — never used to build the R2 key). NFKC-normalize,
 * strip path separators, NUL, and control chars. Truncate to 255 chars.
 */
export function sanitizeFileName(name: string): string {
  const stripped = name
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\.\.+/g, '.')
    .replace(/[\\/]/g, '_')
    .trim();
  const safe = stripped.length > 0 ? stripped : 'archivo';
  return safe.slice(0, 255);
}
