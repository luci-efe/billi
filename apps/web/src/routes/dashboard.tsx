import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CalendarDays
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/hooks/use-dashboard";

const CHART_COLORS = ["#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"];

const PERIOD_LABELS: Record<string, string> = {
  day: "Hoy",
  week: "Esta Semana",
  month: "Este Mes",
  year: "Este Año",
};

export default function Dashboard() {
  const [period, setPeriod] = useState("month");
  const { data, recentTransactions, isLoading } = useDashboard(period);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(Math.abs(cents) / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    });
  };

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? "Nueva actividad" : "0%";
    const change = ((current - previous) / previous) * 100;
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  };

  const pieData = data?.categories.map((c, i) => ({
    name: c.name,
    value: c.value / 100, // For charts, use proper numbers
    color: CHART_COLORS[i % CHART_COLORS.length],
  })) || [];

  // Very simple mocked bar data based on totals just for visualization
  // Real implementation would group by day
  const barData = [
    { name: "Period", ingresos: (data?.current.income || 0) / 100, egresos: (data?.current.expense || 0) / 100 },
  ];

  if (isLoading && !data) {
    return <div className="flex items-center justify-center h-full text-slate-400">Cargando dashboard...</div>;
  }

  const incomeTrend = calculateTrend(data?.current.income || 0, data?.previous.income || 0);
  const isIncomeUp = (data?.current.income || 0) >= (data?.previous.income || 0);
  
  const expenseTrend = calculateTrend(data?.current.expense || 0, data?.previous.expense || 0);
  const isExpenseUp = (data?.current.expense || 0) >= (data?.previous.expense || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Resumen Financiero</h2>
          <p className="text-slate-400">Bienvenido de vuelta, aquí está tu estado actual.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val) => setPeriod(val || "month")}>
            <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-slate-300">
              <CalendarDays className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Periodo">{PERIOD_LABELS[period]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="year">Este Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="border-slate-800 bg-slate-900 text-slate-400">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-slate-900 border-slate-800 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Wallet className="h-12 w-12 text-indigo-400" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Saldo Neto</CardDescription>
            <CardTitle className="text-4xl font-bold text-white">
              {(data?.current.balance || 0) < 0 ? "-" : ""}{formatCurrency(data?.current.balance || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-indigo-400 text-xs font-medium">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Estado actual
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Ingresos Totales</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-400">{formatCurrency(data?.current.income || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex items-center text-xs",
              isIncomeUp ? "text-emerald-500" : "text-rose-500"
            )}>
              {isIncomeUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {incomeTrend} vs periodo anterior
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400">Egresos Totales</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-400">{formatCurrency(data?.current.expense || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex items-center text-xs",
              isExpenseUp ? "text-rose-500" : "text-emerald-500"
            )}>
              {isExpenseUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {expenseTrend} vs periodo anterior
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Flujo de Efectivo</CardTitle>
            <CardDescription className="text-slate-400">Ingresos vs Egresos del periodo</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, '']}
                />
                <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3 bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Distribución por Categoría</CardTitle>
            <CardDescription className="text-slate-400">Tus mayores gastos este periodo</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#f8fafc' }}
                      itemStyle={{ fontSize: '12px', color: '#f8fafc' }}
                      labelStyle={{ color: '#94a3b8' }}
                      formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, 'Monto']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 w-full mt-4 px-4 overflow-y-auto max-h-24 scrollbar-thin">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-slate-400 truncate" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-slate-500 text-sm">No hay gastos registrados en este periodo</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">Transacciones Recientes</CardTitle>
            <CardDescription className="text-slate-400">Tus últimos movimientos dentro del periodo seleccionado.</CardDescription>
          </div>
          <Button variant="link" className="text-indigo-400 hover:text-indigo-300">
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      tx.type === "income" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                    )}>
                      {tx.type === "income" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{tx.note || "Sin descripción"}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-slate-500">{formatDate(tx.occurredAt)}</p>
                        <Badge variant="outline" className="text-[10px] h-4 bg-slate-800 border-slate-700 text-slate-400">
                          {tx.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className={cn(
                    "font-semibold",
                    tx.type === "income" ? "text-emerald-400" : "text-white"
                  )}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amountCents)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 italic">No hay transacciones recientes</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
