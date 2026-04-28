import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  uploadDocument,
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
} from '@/hooks/use-documents';

export interface EvidenceUploaderProps {
  transactionId: string;
  onUploaded?: () => void;
  className?: string;
}

function validateFile(file: File): string | null {
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return 'El archivo excede el límite de 5MB.';
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type as typeof ALLOWED_DOCUMENT_MIME_TYPES[number])) {
    return 'Formato no permitido. Solo PDF, JPG, PNG o WebP.';
  }
  return null;
}

export function EvidenceUploader({
  transactionId,
  onUploaded,
  className,
}: EvidenceUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    const validation = validateFile(file);
    if (validation) {
      setError(validation);
      return;
    }
    setIsUploading(true);
    try {
      await uploadDocument(transactionId, file);
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-700 bg-slate-950 p-4 text-xs text-slate-400 transition-colors hover:border-indigo-500 hover:text-indigo-300',
          isDragging && 'border-indigo-500 bg-indigo-500/5 text-indigo-300',
          isUploading && 'cursor-wait opacity-70',
        )}
      >
        {isUploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Upload className="h-5 w-5" />
        )}
        <span>
          {isUploading
            ? 'Subiendo comprobante…'
            : 'Arrastra un archivo o haz clic para subir'}
        </span>
        <span className="text-[10px] text-slate-500">
          PDF, JPG, PNG, WebP · máx 5MB
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_DOCUMENT_MIME_TYPES.join(',')}
          aria-label="Seleccionar comprobante"
          className="sr-only"
          onChange={onChange}
          disabled={isUploading}
        />
      </label>
      {error && (
        <p
          role="alert"
          className="text-xs text-rose-400"
          data-testid="evidence-uploader-error"
        >
          {error}
        </p>
      )}
      {/* Hidden manual trigger for keyboard users */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="hidden"
        onClick={() => inputRef.current?.click()}
      >
        Subir comprobante
      </Button>
    </div>
  );
}

export default EvidenceUploader;
