import { useState } from 'react';
import { FileText, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type DocumentItem,
  documentDownloadUrl,
  deleteDocument,
} from '@/hooks/use-documents';

export interface EvidenceViewerProps {
  documents: DocumentItem[];
  isLoading?: boolean;
  onDeleted?: () => void;
  className?: string;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith('image/');
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceViewer({
  documents,
  isLoading,
  onDeleted,
  className,
}: EvidenceViewerProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este comprobante? La acción no se puede deshacer.')) {
      return;
    }
    setError(null);
    setDeletingId(id);
    try {
      await deleteDocument(id);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading && documents.length === 0) {
    return (
      <p className="text-xs text-slate-400 flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Cargando comprobantes…
      </p>
    );
  }

  if (documents.length === 0) {
    return (
      <p className="text-xs text-slate-500">Aún no hay comprobantes.</p>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {error && (
        <p role="alert" className="text-xs text-rose-400">{error}</p>
      )}
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const url = documentDownloadUrl(doc.id);
          const isImage = isImageMime(doc.fileType);
          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-2"
            >
              <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-md bg-slate-800">
                {isImage ? (
                  <img
                    src={url}
                    alt={doc.fileName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <FileText className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={doc.fileName}
                  className="truncate text-xs font-medium text-indigo-300 hover:underline"
                  title={doc.fileName}
                >
                  {doc.fileName}
                </a>
                <span className="text-[10px] text-slate-500">
                  {doc.fileType} · {fmtSize(doc.fileSize)}
                </span>
              </div>
              <a
                href={url}
                download={doc.fileName}
                className="text-slate-400 hover:text-indigo-300"
                aria-label={`Descargar ${doc.fileName}`}
              >
                <Download className="h-4 w-4" />
              </a>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                aria-label={`Eliminar ${doc.fileName}`}
              >
                {deletingId === doc.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default EvidenceViewer;
