import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type DocumentItem,
  deleteDocument,
  fetchDocumentBlob,
} from '@/hooks/use-documents';

export interface EvidenceViewerProps {
  documents: DocumentItem[];
  isLoading?: boolean;
  onDeleted?: () => void;
  className?: string;
}

type DocumentUrlMap = Record<string, string>;

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
  const [documentUrls, setDocumentUrls] = useState<DocumentUrlMap>({});

  useEffect(() => {
    let isCurrent = true;
    const previousUrls: string[] = [];

    setError(null);

    async function loadDocumentUrls() {
      if (documents.length === 0) {
        setDocumentUrls({});
        return;
      }

      try {
        const nextEntries = await Promise.all(
          documents.map(async (doc) => {
            const blob = await fetchDocumentBlob(doc.id);
            return [doc.id, URL.createObjectURL(blob)] as const;
          }),
        );

        if (!isCurrent) {
          nextEntries.forEach(([, url]) => URL.revokeObjectURL(url));
          return;
        }

        setDocumentUrls((current) => {
          previousUrls.push(...Object.values(current));
          return Object.fromEntries(nextEntries);
        });
      } catch (err) {
        if (!isCurrent) return;
        setDocumentUrls((current) => {
          previousUrls.push(...Object.values(current));
          return {};
        });
        setError(err instanceof Error ? err.message : 'No pudimos abrir el comprobante.');
      } finally {
        previousUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    }

    void loadDocumentUrls();

    return () => {
      isCurrent = false;
      previousUrls.forEach((url) => URL.revokeObjectURL(url));
      Object.values(documentUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documents]);

  const readyDocumentIds = useMemo(
    () => new Set(Object.keys(documentUrls)),
    [documentUrls],
  );

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
    return <p className="text-xs text-slate-500">Aún no hay comprobantes.</p>;
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {error && (
        <p role="alert" className="text-xs text-rose-400">{error}</p>
      )}
      <ul className="flex flex-col gap-2">
        {documents.map((doc) => {
          const url = documentUrls[doc.id];
          const isImage = isImageMime(doc.fileType);
          const isReady = readyDocumentIds.has(doc.id) && !!url;

          return (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-950/60 p-2"
            >
              <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-md bg-slate-800">
                {isReady && isImage ? (
                  <img
                    src={url}
                    alt={doc.fileName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : isReady ? (
                  <FileText className="h-5 w-5 text-slate-300" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                {isReady ? (
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
                ) : (
                  <span className="truncate text-xs font-medium text-slate-300" title={doc.fileName}>
                    {doc.fileName}
                  </span>
                )}
                <span className="text-[10px] text-slate-500">
                  {doc.fileType} · {fmtSize(doc.fileSize)}
                </span>
              </div>
              {isReady ? (
                <>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-indigo-300"
                    aria-label={`Abrir ${doc.fileName}`}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <a
                    href={url}
                    download={doc.fileName}
                    className="text-slate-400 hover:text-indigo-300"
                    aria-label={`Descargar ${doc.fileName}`}
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </>
              ) : null}
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
