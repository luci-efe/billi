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

const initialTransactions = [
  { id: 1, title: "Starbucks Reforma", category: "Comida", amount: -125, date: "2024-04-19", type: "egreso" },
  { id: 2, title: "Nómina Quincena", category: "Salario", amount: 15000, date: "2024-04-15", type: "ingreso" },
  { id: 3, title: "Uber Casa", category: "Transporte", amount: -85, date: "2024-04-18", type: "egreso" },
  { id: 4, title: "Netflix Suscripción", category: "Entretenimiento", amount: -199, date: "2024-04-15", type: "egreso" },
  { id: 5, title: "Transferencia SPEI", category: "Otros", amount: 2500, date: "2024-04-14", type: "ingreso" },
  { id: 6, title: "Supermercado Walmart", category: "Comida", amount: -1200, date: "2024-04-13", type: "egreso" },
  { id: 7, title: "Venta Teclado", category: "Otros", amount: 800, date: "2024-04-12", type: "ingreso" },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [filter, setFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredTransactions = transactions.filter((tx) => {
    if (filter === "all") return true;
    return tx.type === filter;
  });

  const handleAddTransaction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const type = formData.get("type") as string;
    
    const newTx = {
      id: transactions.length + 1,
      title: formData.get("title") as string,
      category: formData.get("category") as string,
      amount: type === "egreso" ? -Math.abs(amount) : Math.abs(amount),
      date: new Date().toISOString().split('T')[0],
      type: type as "ingreso" | "egreso",
    };

    setTransactions([newTx, ...transactions]);
    setIsDialogOpen(false);
    toast.success("Movimiento registrado con éxito");
  };

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
            <DialogTrigger 
              render={
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Movimiento
                </Button>
              }
            />
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
                      <Input id="amount" name="amount" type="number" placeholder="0.00" className="bg-slate-950 border-slate-800" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select name="type" defaultValue="egreso">
                        <SelectTrigger className="bg-slate-950 border-slate-800">
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                          <SelectItem value="ingreso">Ingreso</SelectItem>
                          <SelectItem value="egreso">Egreso</SelectItem>
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
                  <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500">Guardar Movimiento</Button>
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
                <TabsTrigger value="ingreso" className="data-[state=active]:bg-slate-800">Ingresos</TabsTrigger>
                <TabsTrigger value="egreso" className="data-[state=active]:bg-slate-800">Egresos</TabsTrigger>
              </TabsList>
            </Tabs>
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
