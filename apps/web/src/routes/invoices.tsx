import { Link, useNavigate } from "react-router";
import { ArrowLeft, FileImage, FileText, Receipt, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTransactions, type Transaction } from "@/hooks/use-transactions";
import { useDocuments } from "@/hooks/use-documents";
import EvidenceUploader from "@/components/EvidenceUploader";
import EvidenceViewer from "@/components/EvidenceViewer";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(Math.abs(cents) / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function InvoiceTransactionRow({ transaction }: { transaction: Transaction }) {
  const { documents, isLoading, error, refresh } = useDocuments(transaction.id);
  const hasDocuments = documents.length > 0;

  return (
    <Card className="border-slate-800 bg-slate-900/70">
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "border-slate-700 text-[10px]",
                  transaction.type === "income"
                    ? "bg-emerald-500/10 text-emerald-300"
                    : "bg-slate-800 text-slate-300"
                )}
              >
                {transaction.type === "income" ? "Ingreso" : "Egreso"}
              </Badge>
              <Badge variant="outline" className="border-slate-700 bg-slate-950 text-[10px] text-slate-400">
                {transaction.category}
              </Badge>
              <span className="text-xs text-slate-500">{formatDate(transaction.occurredAt)}</span>
            </div>
            <div>
              <p className="truncate text-sm font-medium text-white">
                {transaction.note?.trim() || "Movimiento sin descripción"}
              </p>
              <p className="text-xs text-slate-400">
                Adjunta aquí los comprobantes relacionados con este movimiento.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 lg:items-end">
            <p
              className={cn(
                "text-lg font-semibold",
                transaction.type === "income" ? "text-emerald-400" : "text-white"
              )}
            >
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amountCents)}
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {hasDocuments ? <FileImage className="h-3.5 w-3.5" /> : <Receipt className="h-3.5 w-3.5" />}
              <span>
                {hasDocuments
                  ? `${documents.length} comprobante${documents.length === 1 ? "" : "s"}`
                  : "Sin comprobantes"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,240px)_1fr]">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-200">
              <Upload className="h-3.5 w-3.5 text-indigo-300" />
              Subir comprobante
            </div>
            <EvidenceUploader transactionId={transaction.id} onUploaded={refresh} />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-200">
              <FileText className="h-3.5 w-3.5 text-indigo-300" />
              Archivos vinculados
            </div>
            {error ? (
              <p className="text-xs text-rose-400">{error}</p>
            ) : (
              <EvidenceViewer documents={documents} isLoading={isLoading} onDeleted={refresh} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Invoices() {
  const navigate = useNavigate();
  const { transactions, isLoading, error } = useTransactions();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Facturas y Recibos</h2>
          <p className="text-slate-400">
            Administra comprobantes PDF e imagen ya vinculados a tus movimientos financieros.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            className="bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => navigate("/transactions", { state: { openCreate: true } })}
          >
            <Receipt className="mr-2 h-4 w-4" />
            Nuevo movimiento
          </Button>
          <Link to="/transactions">
            <Button variant="outline" className="border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Ver transacciones
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-white">Cómo funciona</CardTitle>
          <CardDescription className="text-slate-400">
            En este MVP, cada comprobante se guarda ligado a un movimiento existente. Puedes subir PDFs,
            fotos y capturas en JPG, PNG o WebP de hasta 5MB, descargarlos y eliminarlos cuando sea necesario.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading && transactions.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="py-10 text-sm text-slate-400">Cargando comprobantes…</CardContent>
        </Card>
      ) : error ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="py-10 text-sm text-rose-400">{error.message}</CardContent>
        </Card>
      ) : transactions.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
              <Receipt className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-white">Aún no tienes movimientos para documentar</p>
              <p className="max-w-xl text-sm text-slate-400">
                Primero registra un ingreso o egreso. Después podrás adjuntar aquí los comprobantes que lo respaldan.
              </p>
            </div>
            <Button
              className="bg-indigo-600 text-white hover:bg-indigo-500"
              onClick={() => navigate("/transactions", { state: { openCreate: true } })}
            >
              <Receipt className="mr-2 h-4 w-4" />
              Registrar primer movimiento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <InvoiceTransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </div>
      )}
    </div>
  );
}
