import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  PiggyBank, 
  ArrowRight, 
  Shield, 
  Zap, 
  Smartphone,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ValueProp from "@/components/onboarding/value-prop";
import ConsentModal from "@/components/onboarding/consent-modal";
import { getConsent, setConsent, isConsentValid } from "@/lib/consent";

export default function Landing() {
  // Use lazy initializer to avoid setState in effect for initial value
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    const consent = getConsent();
    return isConsentValid(consent);
  });
  
  const [showModal, setShowModal] = useState<boolean>(() => {
    const consent = getConsent();
    return !isConsentValid(consent);
  });

  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);

  // Still need this for sync if localStorage changes externally (unlikely but good practice)
  // or if we need to trigger logic that can't be in the initializer.
  useEffect(() => {
    const consent = getConsent();
    const valid = isConsentValid(consent);
    setHasConsent(valid);
    if (!valid) {
      setShowModal(true);
    }
  }, []);

  const handleAccept = () => {
    setConsent();
    setHasConsent(true);
    setShowModal(false);
    setIsReadOnly(false);
  };

  const openPrivacyNotice = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsReadOnly(true);
    setShowModal(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50 overflow-hidden">
      {/* Consent Modal */}
      {showModal && (
        <ConsentModal 
          onAccept={handleAccept} 
          open={showModal} 
          onOpenChange={(open) => {
            if (!open && isReadOnly) {
              setShowModal(false);
              setIsReadOnly(false);
            }
          }}
        />
      )}

      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-8 w-8 text-indigo-500" />
          <span className="font-bold text-2xl tracking-tight text-white">Billi</span>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/sign-in" 
            data-testid="cta-sign-in"
            className={`text-sm font-medium transition-colors ${!hasConsent ? 'text-slate-600 pointer-events-none' : 'text-slate-400 hover:text-white'}`}
            aria-disabled={!hasConsent}
          >
            Login
          </Link>
          <Link to="/sign-up" className={!hasConsent ? 'pointer-events-none' : ''}>
            <Button 
              data-testid="cta-sign-up"
              disabled={!hasConsent}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-6"
            >
              Empieza Gratis
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 relative">
        {/* Decorative blobs */}
        <div className="absolute top-0 -left-20 w-72 h-72 bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />

        <section className="container mx-auto px-4 pt-20 pb-32 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-sm text-indigo-400 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Zap className="h-4 w-4" />
            <span>Finanzas inteligentes para México</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
            Tus finanzas, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">bajo control real.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
            La plataforma multimodal que entiende tu dinero. Registra, analiza y consulta con IA especializada en el contexto financiero mexicano.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/" className={!hasConsent ? 'pointer-events-none' : ''}>
              <Button 
                size="lg" 
                disabled={!hasConsent}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-8 h-14 text-lg font-semibold group"
              >
                Probar Dashboard
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-slate-800 bg-slate-900/50 text-white rounded-full px-8 h-14 text-lg">
              Ver Demo Video
            </Button>
          </div>
        </section>

        {/* Value Prop Section */}
        <ValueProp />

        {/* Features grid */}
        <section className="container mx-auto px-4 py-20 border-t border-slate-900">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Multimodal</h3>
              <p className="text-slate-400">Registra tus gastos por texto, voz o fotos de recibos. Billi categoriza todo automáticamente.</p>
            </div>
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">IA Contextual</h3>
              <p className="text-slate-400">Pregunta sobre el SAT, deducciones o tu presupuesto. Respuestas precisas para el mercado local.</p>
            </div>
            <div className="p-8 rounded-3xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/50 transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Privacidad Primero</h3>
              <p className="text-slate-400">Tus datos están encriptados. Tú decides qué compartir y cómo Billi te ayuda a mejorar.</p>
            </div>
          </div>
        </section>

        {/* Social proof / Trust */}
        <section className="container mx-auto px-4 py-20 text-center">
          <p className="text-slate-500 uppercase tracking-widest text-sm font-medium mb-12">Impulsando el futuro financiero de México</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale contrast-150">
            <span className="text-2xl font-black">FINTECH</span>
            <span className="text-2xl font-black">LATAM</span>
            <span className="text-2xl font-black">MX_BANKS</span>
            <span className="text-2xl font-black">STARTUP_LAB</span>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-12 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <PiggyBank className="h-6 w-6 text-indigo-500" />
          <span className="font-bold text-xl text-white">Billi</span>
        </div>
        <p className="text-slate-500 text-sm">© 2026 Billi Finance. Todos los derechos reservados.</p>
        <div className="flex gap-6">
          <a href="#" onClick={openPrivacyNotice} className="text-slate-500 hover:text-white transition-colors text-sm">Aviso de privacidad</a>
          <a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">Términos</a>
        </div>
      </footer>
    </div>
  );
}
