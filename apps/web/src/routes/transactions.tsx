import { useState } from "react";
import { 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  Download
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { transactions, isLoading, createTransaction } = useTransactions();
  const [filter, setFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Math.abs(cents) / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('es-MX');
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
          <Button variant="outline" className="border-slate-800 bg-slate-900 text-slate-300">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Tabs defaultValue="all" className="w-full md:w-[400px]" onValueChange={setFilter}>
              <TabsList className="bg-slate-950 border border-slate-800">
                <TabsTrigger value="all" className="data-[state=active]:bg-slate-800">Todos</TabsTrigger>
                <TabsTrigger value="income" className="data-[state=active]:bg-slate-800">Ingresos</TabsTrigger>
                <TabsTrigger value="expense" className="data-[state=active]:bg-slate-800">Egresos</TabsTrigger>
              </TabsList>
            </Tabs>
...
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-800 hover:bg-slate-800/30">
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
...
            <div className="relative w-full md:w-[300px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar movimientos..."
                className="pl-9 bg-slate-950 border-slate-800"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-800">
            <Table>
              <TableHeader className="bg-slate-950/50">
                <TableRow className="border-slate-800 hover:bg-transparent">
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
                    <TableCell className="font-medium text-white">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full",
                          tx.type === "ingreso" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                        )}>
                          {tx.type === "ingreso" ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        {tx.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-400">
                        {tx.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-400">{tx.date}</TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      tx.type === "ingreso" ? "text-emerald-400" : "text-white"
                    )}>
                      {tx.type === "ingreso" ? "+" : "-"}${Math.abs(tx.amount).toLocaleString()}
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
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No se encontraron movimientos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
