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
    return <div className="flex items-center justify-center h-full text-muted-foreground">Cargando dashboard...</div>;
  }

  const incomeTrend = calculateTrend(data?.current.income || 0, data?.previous.income || 0);
  const isIncomeUp = (data?.current.income || 0) >= (data?.previous.income || 0);
  
  const expenseTrend = calculateTrend(data?.current.expense || 0, data?.previous.expense || 0);
  const isExpenseUp = (data?.current.expense || 0) >= (data?.previous.expense || 0);

  const chartTooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--card-foreground)",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Resumen Financiero</h2>
          <p className="text-muted-foreground">Bienvenido de vuelta, aquí está tu estado actual.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(val) => setPeriod(val || "month")}>
            <SelectTrigger className="w-[180px]">
              <CalendarDays className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Periodo">{PERIOD_LABELS[period]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mes</SelectItem>
              <SelectItem value="year">Este Año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Wallet className="h-12 w-12 text-indigo-400" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Neto</CardDescription>
            <CardTitle className="text-4xl font-bold text-foreground">
              {(data?.current.balance || 0) < 0 ? "-" : ""}{formatCurrency(data?.current.balance || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-indigo-600 dark:text-indigo-400 text-xs font-medium">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              Estado actual
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos Totales</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(data?.current.income || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex items-center text-xs",
              isIncomeUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {isIncomeUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {incomeTrend} vs periodo anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Egresos Totales</CardDescription>
            <CardTitle className="text-3xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(data?.current.expense || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "flex items-center text-xs",
              isExpenseUp ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {isExpenseUp ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
              {expenseTrend} vs periodo anterior
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Flujo de Efectivo</CardTitle>
            <CardDescription>Ingresos vs Egresos del periodo</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  itemStyle={{ fontSize: '12px', color: 'var(--card-foreground)' }}
                  labelStyle={{ color: 'var(--muted-foreground)' }}
                  formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, '']}
                />
                <Bar dataKey="ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
            <CardDescription>Tus mayores gastos este periodo</CardDescription>
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
                      contentStyle={chartTooltipStyle}
                      itemStyle={{ fontSize: '12px', color: 'var(--card-foreground)' }}
                      labelStyle={{ color: 'var(--muted-foreground)' }}
                      formatter={(value: unknown) => [`$${Number(value).toFixed(2)}`, 'Monto']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 w-full mt-4 px-4 overflow-y-auto max-h-24 scrollbar-thin">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[10px] text-muted-foreground truncate" title={item.name}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">No hay gastos registrados en este periodo</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transacciones Recientes</CardTitle>
            <CardDescription>Tus últimos movimientos dentro del periodo seleccionado.</CardDescription>
          </div>
          <Button variant="link" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Ver todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      tx.type === "income" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                    )}>
                      {tx.type === "income" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{tx.note || "Sin descripción"}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{formatDate(tx.occurredAt)}</p>
                        <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground">
                          {tx.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className={cn(
                    "font-semibold",
                    tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                  )}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amountCents)}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground italic">No hay transacciones recientes</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
