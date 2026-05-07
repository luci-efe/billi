import { useState, useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useMe, useUpdateMe } from "@/hooks/use-me";
import { apiClient } from "@/lib/api-client";
import {
  User as UserIcon,
  CreditCard,
  Shield,
  Bell,
  Key,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FileWarning
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useUser();
  const { data: me, isLoading, mutate } = useMe();
  const { updateMe, isUpdating } = useUpdateMe();

  const [rfc, setRfc] = useState("");
  const [currency, setCurrency] = useState("MXN");
  const [isAcceptingConsent, setIsAcceptingConsent] = useState(false);

  useEffect(() => {
    if (me) {
      setRfc(me.rfc || "");
      setCurrency(me.defaultCurrency || "MXN");
    }
  }, [me]);

  const handleSave = async () => {
    try {
      await updateMe({ rfc, defaultCurrency: currency });
      toast.success("Perfil actualizado correctamente");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar perfil");
    }
  };

  const handleAcceptConsent = async () => {
    setIsAcceptingConsent(true);
    try {
      const res = await apiClient.post("/api/me/consent", {
        version: 1,
        acceptedAt: Math.floor(Date.now() / 1000),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al aceptar consentimiento");
      }
      toast.success("Consentimiento aceptado");
      if (me) {
        mutate({ ...me, consentAccepted: true, consentVersion: 1 });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aceptar consentimiento");
    } finally {
      setIsAcceptingConsent(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Cargando perfil...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20 lg:pb-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Perfil y Plan</h2>
        <p className="text-muted-foreground">Administra tu cuenta, preferencias y suscripción de Billi.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full max-w-full overflow-x-auto border border-border bg-muted sm:w-fit">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="plan">Suscripción</TabsTrigger>
          <TabsTrigger value="notifications">Notificaciones</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
              <CardDescription>
                Tus detalles personales se sincronizan con Clerk.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} className="h-24 w-24 rounded-full border border-border" alt="Avatar" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <UserIcon className="h-10 w-10" />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">{user?.fullName || "Usuario Billi"}</p>
                  <p className="text-xs text-muted-foreground">Gestionado vía Clerk Auth</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" value={user?.firstName || ""} disabled className="opacity-100 disabled:opacity-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" value={user?.lastName || ""} disabled className="opacity-100 disabled:opacity-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" value={user?.primaryEmailAddress?.emailAddress || ""} disabled className="opacity-100 disabled:opacity-100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC (Opcional para IA Fiscal)</Label>
                  <Input
                    id="rfc"
                    placeholder="XXXX000000XXX"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value)}
                    className="uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda Predeterminada</Label>
                  <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MXN">Pesos Mexicanos (MXN)</SelectItem>
                      <SelectItem value="USD">Dólares (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <Button
                onClick={handleSave}
                disabled={isUpdating}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isUpdating ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {me?.consentAccepted ? (
                  <FileCheck className="h-5 w-5 text-emerald-400" />
                ) : (
                  <FileWarning className="h-5 w-5 text-amber-400" />
                )}
                Consentimiento de Privacidad
              </CardTitle>
              <CardDescription>
                Estado de tu consentimiento para el procesamiento de datos personales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/50 p-4">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {me?.consentAccepted ? "Consentimiento aceptado" : "Consentimiento pendiente"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {me?.consentAccepted
                      ? `Versión ${me.consentVersion ?? 1} aceptada`
                      : "Debes aceptar el consentimiento para acceder a todas las funciones."}
                  </p>
                </div>
                <div className="shrink-0">
                  {me?.consentAccepted ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      Activo
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-400">
                      <AlertCircle className="h-4 w-4" />
                      Pendiente
                    </div>
                  )}
                </div>
              </div>
              {!me?.consentAccepted && (
                <Button
                  onClick={handleAcceptConsent}
                  disabled={isAcceptingConsent}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isAcceptingConsent ? "Procesando..." : "Aceptar Consentimiento"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="relative overflow-hidden">
              <CardHeader>
                <CardTitle>Plan Gratuito</CardTitle>
                <CardDescription>Tu plan actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-foreground">$0 <span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Registro manual de movimientos</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Dashboard básico</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> 10 facturas al mes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Consultas limitadas a Chat Billi</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  Plan Actual
                </Button>
              </CardFooter>
            </Card>

            <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-b from-indigo-50 to-card dark:from-indigo-900/40 dark:to-slate-900">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Recomendado
              </div>
              <CardHeader>
                <CardTitle className="text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  Billi Premium <Zap className="h-4 w-4" />
                </CardTitle>
                <CardDescription>Desbloquea todo el poder de la IA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-foreground">$99 <span className="text-sm font-normal text-muted-foreground">/mes</span></div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Categorización automática con IA</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Lectura de recibos ilimitada</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Consultas fiscales y de inversión ilimitadas</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Exportación a Excel/CSV</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white">
                  Mejorar Plan
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/50">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-12 bg-muted rounded flex items-center justify-center text-xs font-bold text-muted-foreground">VISA</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Terminación 4242</p>
                    <p className="text-xs text-muted-foreground">Expira 12/28</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-indigo-400">Editar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferencias de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Resumen Semanal</p>
                  <p className="text-xs text-muted-foreground">Recibe un reporte de tus gastos cada domingo.</p>
                </div>
                {/* Simulated switch */}
                <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">Alertas de Presupuesto</p>
                  <p className="text-xs text-muted-foreground">Avisos cuando estés cerca de tu límite mensual.</p>
                </div>
                <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Recordatorios Fiscales</p>
                  <p className="text-xs text-muted-foreground">Avisos sobre fechas importantes del SAT.</p>
                </div>
                <div className="w-9 h-5 bg-muted-foreground/40 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad de la Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Key className="h-4 w-4" /> Contraseña
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentPass">Contraseña Actual</Label>
                    <Input id="currentPass" type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2 md:col-start-1">
                    <Label htmlFor="newPass">Nueva Contraseña</Label>
                    <Input id="newPass" type="password" placeholder="••••••••" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPass">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPass" type="password" placeholder="••••••••" />
                  </div>
                </div>
                <Button className="mt-2">Actualizar Contraseña</Button>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-rose-500 dark:text-rose-400">
                      <AlertCircle className="h-4 w-4" /> Zona de Peligro
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">Eliminar permanentemente tu cuenta y todos tus datos.</p>
                  </div>
                  <Button variant="destructive" className="shrink-0">
                    Eliminar Cuenta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
