export default function ValueProp() {
  return (
    <section className="py-12 px-6 bg-background">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl mb-6">
          Toma el control de tu futuro financiero
        </h1>
        <p className="text-lg leading-8 text-muted-foreground mb-10">
          Billi es el asistente inteligente diseñado específicamente para profesionistas que buscan salir de deudas y construir patrimonio.
        </p>
        
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <li className="flex flex-col gap-2 p-6 rounded-xl border bg-card">
            <span className="text-2xl" role="img" aria-label="Análisis">📊</span>
            <h3 className="font-semibold text-card-foreground">Análisis Inteligente</h3>
            <p className="text-sm text-muted-foreground">
              Entiende exactamente a dónde se va tu dinero con categorización automática.
            </p>
          </li>
          <li className="flex flex-col gap-2 p-6 rounded-xl border bg-card">
            <span className="text-2xl" role="img" aria-label="Plan">🎯</span>
            <h3 className="font-semibold text-card-foreground">Plan de Salida</h3>
            <p className="text-sm text-muted-foreground">
              Estrategias personalizadas para liquidar tus deudas de la forma más eficiente.
            </p>
          </li>
          <li className="flex flex-col gap-2 p-6 rounded-xl border bg-card">
            <span className="text-2xl" role="img" aria-label="Privacidad">🛡️</span>
            <h3 className="font-semibold text-card-foreground">Privacidad Total</h3>
            <p className="text-sm text-muted-foreground">
              Tus datos financieros están cifrados y tú mantienes el control absoluto.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}
