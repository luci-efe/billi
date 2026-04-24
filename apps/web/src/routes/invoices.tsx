import { 
  FileText, 
  Upload, 
  Search, 
  Filter,
  Eye,
  Download
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const mockInvoices = [
  { id: "INV-001", vendor: "Amazon AWS", date: "2024-04-18", amount: 1450.00, status: "Procesada", linked: true },
  { id: "INV-002", vendor: "WeWork Reforma", date: "2024-04-15", amount: 4500.00, status: "Pendiente", linked: false },
  { id: "INV-003", vendor: "Telcel", date: "2024-04-12", amount: 599.00, status: "Procesada", linked: true },
  { id: "INV-004", vendor: "Uber Viajes", date: "2024-04-10", amount: 350.00, status: "Error", linked: false },
  { id: "INV-005", vendor: "Librerías Gandhi", date: "2024-04-05", amount: 890.00, status: "Procesada", linked: true },
];

export default function Invoices() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Facturas y Recibos</h2>
          <p className="text-slate-400">Sube tus comprobantes para extracción automática con IA.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Upload className="mr-2 h-4 w-4" />
            Subir Factura (XML/PDF)
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-slate-900 border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Documentos Recientes</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-64 hidden sm:block">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Buscar proveedor o folio..."
                    className="pl-9 bg-slate-950 border-slate-800 h-9 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" className="h-9 border-slate-800 bg-slate-950 text-slate-300">
                  <Filter className="h-4 w-4 mr-2" /> Filtros
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 pl-4">Emisor</TableHead>
                  <TableHead className="text-slate-400">Fecha</TableHead>
                  <TableHead className="text-slate-400">Monto</TableHead>
                  <TableHead className="text-slate-400">Estado IA</TableHead>
                  <TableHead className="text-right pr-4"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockInvoices.map((inv) => (
                  <TableRow key={inv.id} className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell className="font-medium text-white pl-4 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-indigo-400" />
                      {inv.vendor}
                    </TableCell>
                    <TableCell className="text-slate-400">{inv.date}</TableCell>
                    <TableCell className="text-slate-200">${inv.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          inv.status === "Procesada" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          inv.status === "Pendiente" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                          "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Extracción IA (Premium)</CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Sube una foto de un recibo o un PDF y Billi extraerá los datos automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-slate-950/50 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-white mb-1">Arrastra tu archivo aquí</p>
                <p className="text-xs text-slate-500">PDF, JPG, PNG (Max 5MB)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Resumen del Mes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Total Facturado</span>
                <span className="text-white font-medium">$7,289.00</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Documentos</span>
                <span className="text-white font-medium">5/10</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 mt-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '50%' }}></div>
              </div>
              <p className="text-[10px] text-slate-500 text-center pt-2">
                Actualiza a Premium para documentos ilimitados.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
