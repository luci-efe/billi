import { 
  User, 
  CreditCard, 
  Shield, 
  Bell, 
  Key,
  Zap,
  CheckCircle2,
  AlertCircle
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

export default function Settings() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20 lg:pb-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-white">Perfil y Plan</h2>
        <p className="text-slate-400">Administra tu cuenta, preferencias y suscripción de Billi.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-slate-950 border border-slate-800">
          <TabsTrigger value="profile" className="data-[state=active]:bg-slate-800">Perfil</TabsTrigger>
          <TabsTrigger value="plan" className="data-[state=active]:bg-slate-800">Suscripción</TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-800">Notificaciones</TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-slate-800">Seguridad</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Información Personal</CardTitle>
              <CardDescription className="text-slate-400">
                Actualiza tu foto y detalles personales aquí.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <User className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="border-slate-700 bg-slate-800 text-white hover:bg-slate-700">
                    Cambiar Foto
                  </Button>
                  <p className="text-xs text-slate-500">JPG, GIF o PNG. Max 2MB.</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input id="firstName" defaultValue="Demo" className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" defaultValue="User" className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" defaultValue="demo@billi.finance" className="bg-slate-950 border-slate-800" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC (Opcional para IA Fiscal)</Label>
                  <Input id="rfc" placeholder="XXXX000000XXX" className="bg-slate-950 border-slate-800 uppercase" />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-800 pt-6">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">Guardar Cambios</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
              <CardHeader>
                <CardTitle className="text-white">Plan Gratuito</CardTitle>
                <CardDescription className="text-slate-400">Tu plan actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-white">$0 <span className="text-sm font-normal text-slate-500">/mes</span></div>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> Registro manual de movimientos</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> Dashboard básico</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> 10 facturas al mes</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-slate-500" /> Consultas limitadas a Chat Billi</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full border-slate-700 bg-slate-800/50 text-slate-300" disabled>
                  Plan Actual
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-gradient-to-b from-indigo-900/40 to-slate-900 border-indigo-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                Recomendado
              </div>
              <CardHeader>
                <CardTitle className="text-indigo-400 flex items-center gap-2">
                  Billi Premium <Zap className="h-4 w-4" />
                </CardTitle>
                <CardDescription className="text-slate-400">Desbloquea todo el poder de la IA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-white">$99 <span className="text-sm font-normal text-slate-500">/mes</span></div>
                <ul className="space-y-2 text-sm text-slate-300">
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
          
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Método de Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-12 bg-slate-800 rounded flex items-center justify-center text-xs font-bold text-slate-400">VISA</div>
                  <div>
                    <p className="text-sm font-medium text-white">Terminación 4242</p>
                    <p className="text-xs text-slate-500">Expira 12/28</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-indigo-400">Editar</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Preferencias de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <div>
                  <p className="text-sm font-medium text-white">Resumen Semanal</p>
                  <p className="text-xs text-slate-500">Recibe un reporte de tus gastos cada domingo.</p>
                </div>
                {/* Simulated switch */}
                <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <div>
                  <p className="text-sm font-medium text-white">Alertas de Presupuesto</p>
                  <p className="text-xs text-slate-500">Avisos cuando estés cerca de tu límite mensual.</p>
                </div>
                <div className="w-9 h-5 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-white">Recordatorios Fiscales</p>
                  <p className="text-xs text-slate-500">Avisos sobre fechas importantes del SAT.</p>
                </div>
                <div className="w-9 h-5 bg-slate-700 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Seguridad de la Cuenta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Key className="h-4 w-4" /> Contraseña
                </h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentPass">Contraseña Actual</Label>
                    <Input id="currentPass" type="password" placeholder="••••••••" className="bg-slate-950 border-slate-800" />
                  </div>
                  <div className="space-y-2 md:col-start-1">
                    <Label htmlFor="newPass">Nueva Contraseña</Label>
                    <Input id="newPass" type="password" placeholder="••••••••" className="bg-slate-950 border-slate-800" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPass">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPass" type="password" placeholder="••••••••" className="bg-slate-950 border-slate-800" />
                  </div>
                </div>
                <Button className="bg-slate-800 hover:bg-slate-700 text-white mt-2">Actualizar Contraseña</Button>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-rose-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" /> Zona de Peligro
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">Eliminar permanentemente tu cuenta y todos tus datos.</p>
                  </div>
                  <Button variant="destructive" className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400">
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
