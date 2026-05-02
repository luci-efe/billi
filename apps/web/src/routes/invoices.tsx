import { HardHat, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export default function Invoices() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 lg:pb-0">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Facturas y Recibos</h2>
          <p className="text-slate-400">Gestión inteligente de comprobantes fiscales.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="outline" className="border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Regresar al Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
            <HardHat className="h-10 w-10 text-amber-400" />
          </div>
          <CardTitle className="text-2xl text-white mb-2">En construcción</CardTitle>
          <CardDescription className="text-slate-400 max-w-md mx-auto mb-6">
            Estamos trabajando en la gestión de facturas y recibos. Pronto podrás subir tus comprobantes (XML/PDF)
            y dejar que la IA los categorice automáticamente.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/">
              <Button variant="outline" className="border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
