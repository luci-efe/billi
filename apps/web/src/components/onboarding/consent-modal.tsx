import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConsentModalProps {
  onAccept: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ConsentModal({ onAccept, open = true, onOpenChange }: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold">Billi — Aviso de privacidad simplificado</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-6 pt-2 overflow-y-auto">
          <div className="space-y-4 text-sm leading-relaxed text-foreground">
            <section>
              <h3 className="font-bold text-base mb-1">¿Qué hace Billi?</h3>
              <p>Billi es un asistente financiero personal diseñado para profesionistas con deudas. Te ayuda a entender tu situación financiera, organizar tus gastos y crear un plan para mejorar tu salud económica.</p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">¿Qué datos recolectamos?</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Datos de identidad: nombre y correo electrónico que proporcionas al crear tu cuenta.</li>
                <li>Datos financieros: facturas, estados de cuenta y comprobantes que tú mismo subes o compartes con Billi.</li>
                <li>Datos de uso: interacciones dentro de la app para mejorar el servicio.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">Uso de inteligencia artificial</h3>
              <p>Billi utiliza modelos de inteligencia artificial (IA) proporcionados por OpenRouter para generar respuestas educativas sobre finanzas personales. Ningún dato financiero identificable se comparte directamente con los modelos de IA; los mensajes son procesados con técnicas de anonimización antes de enviarse.</p>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">¿Dónde se almacenan tus datos?</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><em>Datos de identidad:</em> son gestionados por Clerk Inc., empresa con sede en los Estados Unidos de América. Al aceptar este aviso, consientes la transferencia de tus datos de identidad a los servidores de Clerk en EE.UU., de conformidad con el artículo 36 de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP).</li>
                <li><em>Datos financieros:</em> se almacenan cifrados en Turso, una base de datos distribuida con cifrado en tránsito y en reposo. No son accesibles para terceros sin tu autorización explícita.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-base mb-1">Tus derechos</h3>
              <p>Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales (derechos ARCO). Para ejercerlos, escríbenos a: <strong>privacidad@billi.mx</strong></p>
            </section>

            <p className="font-medium mt-6 italic">Al hacer clic en <strong>"Acepto"</strong>, confirmas que leíste y entendiste este aviso y que consientes el tratamiento de tus datos en los términos descritos. Si no estás de acuerdo, cierra esta página.</p>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-2 bg-muted/30 border-t flex flex-row justify-end gap-2">
          <Button variant="default" onClick={onAccept} className="w-full sm:w-auto">
            Acepto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
