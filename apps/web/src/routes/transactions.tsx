import { useState, useMemo, useEffect } from "react";
import { 
  Plus,
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  Download,
  Filter,
  Trash2,
  Tag
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTransactions } from "@/hooks/use-transactions";

export default function Transactions() {
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  
  // Convert date strings to unix timestamps for the API
  const filtersParams = useMemo(() => {
    return {
      type: filterType,
      category: filterCategory,
      from: filterDateFrom ? Math.floor(new Date(filterDateFrom).getTime() / 1000) : undefined,
      to: filterDateTo ? Math.floor(new Date(filterDateTo).getTime() / 1000) + 86399 : undefined, // Include end of day
    };
  }, [filterType, filterCategory, filterDateFrom, filterDateTo]);

  const { 
    transactions, 
    isLoading, 
    createTransaction, 
    bulkDelete, 
    bulkUpdateCategory 
  } = useTransactions(filtersParams);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds([]);
  }, [filtersParams]);

  const [searchTerm, setSearchTerm] = useState("");
  const filteredTransactions = transactions.filter((tx) => {
    if (searchTerm && !tx.note?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(tx => tx.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    
    const confirmed = window.confirm(`¿Estás seguro de eliminar ${selectedIds.length} transacciones?`);
    if (!confirmed) return;

    try {
      await bulkDelete(selectedIds);
      setSelectedIds([]);
      toast.success(`${selectedIds.length} transacciones eliminadas`);
    } catch {
      toast.error("Error al eliminar transacciones");
    }
  };

  const handleBulkCategoryUpdate = async (category: string) => {
    if (!selectedIds.length) return;

    try {
      await bulkUpdateCategory(selectedIds, category);
      setSelectedIds([]);
      toast.success(`${selectedIds.length} transacciones actualizadas`);
    } catch {
      toast.error("Error al actualizar categorías");
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Math.abs(cents) / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('es-MX');
  };

  const handleExportCSV = () => {
    if (!filteredTransactions.length) {
      toast.info("No hay transacciones para exportar");
      return;
    }
    
    try {
      const headers = ['Concepto', 'Categoría', 'Fecha', 'Tipo', 'Monto'];
      const rows = filteredTransactions.map(tx => {
        const date = new Date(tx.occurredAt * 1000).toISOString().split('T')[0];
        const amount = (tx.amountCents / 100).toFixed(2);
        return `"${tx.note || ''}","${tx.category}","${date}","${tx.type}","${amount}"`;
      });
      const csvContent = [headers.join(','), ...rows].join('\\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute("href", url);
      link.setAttribute("download", `billi_export_${timestamp}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Exportación completada");
    } catch {
      toast.error("Error al generar el archivo CSV");
    }
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const type = formData.get("type") as 'income' | 'expense';
    
    try {
      await createTransaction({
        note: formData.get("title") as string,
        category: formData.get("category") as string,
        amountCents: Math.round(amount * 100),
        type,
        occurredAt: Math.floor(Date.now() / 1000),
        source: 'form',
      });

      setIsDialogOpen(false);
      toast.success("Movimiento registrado con éxito");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && transactions.length === 0) {
    return <div className="flex items-center justify-center h-full text-slate-400">Cargando transacciones...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Transacciones</h2>
          <p className="text-slate-400">Administra y revisa todos tus movimientos financieros.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-slate-800 bg-slate-900 text-slate-300" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger>
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Movimiento
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
              <form onSubmit={handleAddTransaction}>
                <DialogHeader>
                  <DialogTitle>Registrar Movimiento</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Ingresa los detalles de tu nuevo ingreso o egreso.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Concepto</Label>
                    <Input id="title" name="title" placeholder="Ej. Cena con amigos" className="bg-slate-950 border-slate-800" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="amount">Monto (MXN)</Label>
                      <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" className="bg-slate-950 border-slate-800" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select name="type" defaultValue="expense">
                        <SelectTrigger className="bg-slate-950 border-slate-800">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          <SelectItem value="income">Ingreso</SelectItem>
                          <SelectItem value="expense">Egreso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category" defaultValue="Otros">
                      <SelectTrigger className="bg-slate-950 border-slate-800">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="Comida">Comida</SelectItem>
                        <SelectItem value="Transporte">Transporte</SelectItem>
                        <SelectItem value="Salario">Salario</SelectItem>
                        <SelectItem value="Renta">Renta</SelectItem>
                        <SelectItem value="Entretenimiento">Entretenimiento</SelectItem>
                        <SelectItem value="Otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500">
                    {isSubmitting ? "Guardando..." : "Guardar Movimiento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Tabs defaultValue="all" className="w-full md:w-[400px]" onValueChange={setFilterType}>
                <TabsList className="bg-slate-950 border border-slate-800">
                  <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">Todos</TabsTrigger>
                  <TabsTrigger value="income" className="data-[state=active]:bg-slate-800">Ingresos</TabsTrigger>
                  <TabsTrigger value="expense" className="data-[state=active]:bg-slate-800">Egresos</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Buscar concepto..."
                  className="pl-9 bg-slate-950 border-slate-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 mr-4">
                <Filter className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-400 font-medium">Filtros:</span>
              </div>
              <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val || "all")}>
                <SelectTrigger className="w-[180px] bg-slate-950 border-slate-800 h-9">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="Comida">Comida</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Salario">Salario</SelectItem>
                  <SelectItem value="Renta">Renta</SelectItem>
                  <SelectItem value="Entretenimiento">Entretenimiento</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
              <Input 
                type="date" 
                className="w-[150px] h-9 bg-slate-950 border-slate-800 text-sm" 
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                title="Fecha inicio"
              />
              <span className="text-slate-500">-</span>
              <Input 
                type="date" 
                className="w-[150px] h-9 bg-slate-950 border-slate-800 text-sm" 
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                title="Fecha fin"
              />
              {(filterCategory !== "all" || filterDateFrom || filterDateTo) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 text-slate-400 hover:text-white"
                  onClick={() => {
                    setFilterCategory("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-[40px] px-4">
                    <Checkbox 
                      checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                      onCheckedChange={toggleSelectAll}
                      className="border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                    />
                  </TableHead>
                  <TableHead className="text-slate-400">Concepto</TableHead>
                  <TableHead className="text-slate-400">Categoría</TableHead>
                  <TableHead className="text-slate-400">Fecha</TableHead>
                  <TableHead className="text-right text-slate-400">Monto</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/30">
                    <TableCell className="px-4">
                      <Checkbox 
                        checked={selectedIds.includes(tx.id)}
                        onCheckedChange={() => toggleSelectRow(tx.id)}
                        className="border-slate-700 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          tx.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                        )}>
                          {tx.type === "income" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        {tx.note || "Sin descripción"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400">
                        {tx.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{formatDate(tx.occurredAt)}</TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      tx.type === "income" ? "text-emerald-400" : "text-white"
                    )}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amountCents)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No se encontraron movimientos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-6">
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {selectedIds.length}
              </span>
              <span className="text-sm text-slate-300 font-medium">Seleccionados</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Select onValueChange={(val: string | null) => {
                if (val) handleBulkCategoryUpdate(val);
              }}>
                <SelectTrigger className="h-9 w-[180px] bg-slate-800 border-slate-700 text-xs">
                  <Tag className="mr-2 h-3.5 w-3.5 text-slate-400" />
                  <SelectValue placeholder="Cambiar categoría" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                  <SelectItem value="Comida">Comida</SelectItem>
                  <SelectItem value="Transporte">Transporte</SelectItem>
                  <SelectItem value="Salario">Salario</SelectItem>
                  <SelectItem value="Renta">Renta</SelectItem>
                  <SelectItem value="Entretenimiento">Entretenimiento</SelectItem>
                  <SelectItem value="Otros">Otros</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-9 bg-rose-600 hover:bg-rose-500"
                onClick={handleBulkDelete}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Eliminar
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9 text-slate-400 hover:text-white"
                onClick={() => setSelectedIds([])}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
