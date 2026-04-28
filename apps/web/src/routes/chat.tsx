import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Paperclip,
  Mic,
  ArrowRight,
  Loader2,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCapture } from "@/hooks/use-capture";
import CaptureProposalReview from "@/components/CaptureProposalReview";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";

const suggestedQuestions = [
  "¿Cuánto gasté en comida este mes?",
  "¿Cómo puedo ahorrar más?",
  "Explícame qué es el ISR",
  "Registra que gasté 200 pesos en gasolina",
];

export default function Chat() {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const capture = useCapture();
  const [captureOpen, setCaptureOpen] = useState(false);


  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  const handleClearChat = () => {
    if (confirm("¿Estás seguro de que quieres borrar la conversación?")) {
      clearChat();
      toast.success("Conversación reiniciada");
    }
  };

  const handleOpenCapture = async () => {
    const prompt = input.trim();
    if (!prompt) {
      toast.info("Escribe lo que quieres registrar (p. ej. 'gast\u00e9 200 en gasolina')");
      return;
    }
    setCaptureOpen(true);
    const result = await capture.submitCapture({ message: prompt });
    if (result.error || !result.proposal) {
      toast.error("No pudimos generar una propuesta. Revisa el mensaje.");
    }
  };

  const handleConfirmCapture = async (next: typeof capture.proposal) => {
    if (!next) return;
    try {
      await capture.confirmProposal(next);
      toast.success("Movimiento registrado con \u00e9xito");
      setCaptureOpen(false);
      setInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    }
  };


  return (
    <div className="flex h-[calc(100vh-160px)] flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            Chat Billi <Sparkles className="h-6 w-6 text-indigo-400" />
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearChat}
            className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Borrar chat
          </Button>
        </div>
        <p className="text-slate-400">IA especializada en tus finanzas y contexto mexicano.</p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        <Card className="flex flex-1 flex-col bg-slate-900 border-slate-800 overflow-hidden">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-white">Billi AI</CardTitle>
                <CardDescription className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full bg-emerald-400",
                    isLoading ? "animate-pulse" : ""
                  )} />
                  {isLoading ? "Billi está pensando..." : "En línea"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => {
                const isTransactionSuccess = message.role === 'assistant' && 
                  (message.content.includes('éxito') || message.content.includes('registrada'));

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex max-w-[80%] flex-col gap-2 rounded-2xl p-4 text-sm",
                      message.role === "assistant"
                        ? "self-start bg-slate-800 text-slate-100 rounded-tl-none"
                        : "self-end bg-indigo-600 text-white rounded-tr-none ml-auto",
                      isTransactionSuccess ? "border border-emerald-500/30 bg-emerald-500/5" : ""
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === "assistant" ? (
                        <Bot className="h-3 w-3 text-indigo-400" />
                      ) : (
                        <User className="h-3 w-3 text-indigo-200" />
                      )}
                      <span className="text-[10px] opacity-70 font-medium">
                        {message.role === "assistant" ? "Billi" : "Tú"} • {message.timestamp}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {isTransactionSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
                      <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex self-start bg-slate-800 text-slate-100 rounded-2xl rounded-tl-none p-4 text-sm items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  <span className="text-xs text-slate-400">Billi está procesando...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          <CardFooter className="border-t border-slate-800 bg-slate-900/50 p-4">
            <div className="flex w-full flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Pregunta algo a Billi..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={isLoading}
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
                <Button
                  type="button"
                  onClick={handleOpenCapture}
                  disabled={capture.isLoading || !input.trim()}
                  aria-label="Registrar movimiento"
                  title="Registrar movimiento"
                  variant="outline"
                  className="border-slate-800 bg-slate-950 text-indigo-300 hover:bg-slate-800 hover:text-indigo-200"
                >
                  {capture.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
                <Button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <Paperclip className="h-3 w-3 cursor-pointer hover:text-slate-300" />
                <Mic className="h-3 w-3 cursor-pointer hover:text-slate-300" />
                <span className="flex-1" />
                <span>Billi puede cometer errores. Verifica la información importante.</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Sidebar for suggested questions */}
        <div className="hidden w-72 flex-col gap-4 lg:flex">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">Preguntas sugeridas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((q) => (
                <button
                  key={q}
                  disabled={isLoading}
                  onClick={() => {
                    setInput(q);
                    sendMessage(q);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
                >
                  {q}
                  <ArrowRight className="h-3 w-3" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tengo acceso a las últimas normativas del SAT, leyes de ahorro para el retiro y mejores prácticas financieras en México.
              </p>
              <Button variant="link" className="px-0 text-indigo-400 text-xs h-auto mt-2">
                Explorar temas
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <CaptureProposalReview
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        proposal={capture.proposal}
        confidence={capture.confidence}
        lowConfidenceFields={capture.lowConfidenceFields}
        isLoading={capture.isLoading}
        error={capture.error}
        onConfirm={handleConfirmCapture}
      />
    </div>
  );
}
