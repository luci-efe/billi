import { useState, useRef, useEffect, useMemo } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  ArrowRight,
  Loader2,
  Trash2,
  CheckCircle2,
  ImagePlus,
  X
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCapture } from "@/hooks/use-capture";
import CaptureProposalReview from "@/components/CaptureProposalReview";
import { useChat } from "@/hooks/use-chat";
import { toast } from "sonner";

const suggestedQuestions = [
  { label: "¿Cuánto gasté en comida este mes?", action: "chat" as const },
  { label: "¿Cómo puedo ahorrar más?", action: "chat" as const },
  { label: "¿Qué es el SAT?", action: "chat" as const },
  { label: "Registra que gasté 200 pesos en gasolina", action: "capture" as const },
];

const MAX_CAPTURE_IMAGE_BYTES = 5 * 1024 * 1024;

type PendingCaptureImage = {
  dataUrl: string;
  name: string;
  size: number;
};

function isNearBottom(element: HTMLElement, threshold: number = 48): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

export default function Chat() {
  const { messages, isLoading, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const capture = useCapture();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [shouldStickToBottom, setShouldStickToBottom] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [pendingImage, setPendingImage] = useState<PendingCaptureImage | null>(null);

  const isBusy = isLoading || capture.isLoading;

  const scrollToBottom = () => {
    const scrollContainer = scrollRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!scrollContainer) return;
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    setShouldStickToBottom(true);
    setShowScrollButton(false);
  };

  useEffect(() => {
    const scrollContainer = scrollRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const pinned = isNearBottom(scrollContainer);
      setShouldStickToBottom(pinned);
      setShowScrollButton(!pinned);
    };

    handleScroll();
    scrollContainer.addEventListener("scroll", handleScroll);
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (shouldStickToBottom) {
      requestAnimationFrame(scrollToBottom);
    } else {
      setShowScrollButton(true);
    }
  }, [messages, isLoading, shouldStickToBottom]);

  const composerHint = useMemo(() => {
    if (pendingImage) return "Adjuntaste una imagen. Usa Analizar y registrar para extraer el movimiento.";
    return "Billi puede cometer errores. Verifica la información importante.";
  }, [pendingImage]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isBusy) return;
    try {
      await sendMessage(prompt);
      setInput("");
    } catch {
      // useChat already appends a friendly assistant error message
    }
  };

  const handleClearChat = () => {
    setConfirmClearOpen(true);
  };

  const handleConfirmClearChat = () => {
    clearChat();
    toast.success("Conversación reiniciada");
    setPendingImage(null);
    setConfirmClearOpen(false);
  };

  const handleOpenCapture = async (seedMessage?: string) => {
    const prompt = (seedMessage ?? input).trim();
    if (!prompt && !pendingImage) {
      toast.info("Escribe lo que quieres registrar o adjunta una imagen para analizarla.");
      return;
    }
    setCaptureOpen(true);
    const result = await capture.submitCapture({
      message: prompt || undefined,
      imageUrl: pendingImage?.dataUrl,
      sourceHint: pendingImage ? 'image' : 'chat',
    });
    if (result.error || !result.proposal) {
      toast.error("No pudimos generar una propuesta. Revisa el mensaje o la imagen.");
    }
  };

  const handleConfirmCapture = async (next: typeof capture.proposal) => {
    if (!next) return;
    try {
      await capture.confirmProposal(next);
      toast.success("Movimiento registrado con éxito");
      setCaptureOpen(false);
      setInput("");
      setPendingImage(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrar");
    }
  };

  const handleCaptureImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Solo puedes adjuntar imágenes JPG, PNG o WebP.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_CAPTURE_IMAGE_BYTES) {
      toast.error("La imagen excede el límite de 5MB.");
      e.target.value = "";
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo leer la imagen.");
      return null;
    });

    if (!dataUrl) {
      e.target.value = "";
      return;
    }

    setPendingImage({ dataUrl, name: file.name, size: file.size });
    toast.success("Imagen lista para analizar.");
    e.target.value = "";
  };

  const handleSuggestedQuestion = async (question: string, action: "chat" | "capture") => {
    if (action === "capture") {
      setInput(question);
      await handleOpenCapture(question);
      return;
    }
    setInput("");
    await sendMessage(question);
  };


  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Chat Billi <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Borrar chat
          </Button>
        </div>
        <p className="text-muted-foreground">IA especializada en tus finanzas y contexto mexicano.</p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        <Card className="relative flex flex-1 flex-col border-border bg-card overflow-hidden min-h-0">
          <CardHeader className="border-b border-border bg-muted/30 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium text-foreground">Billi AI</CardTitle>
                <CardDescription className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <div className={cn(
                    "h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400",
                    isLoading ? "animate-pulse" : ""
                  )} />
                  {isLoading ? "Billi está pensando..." : "En línea"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <ScrollArea className="flex-1 p-4 min-h-0" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => {
                const isTransactionSuccess =
                  message.role === "assistant" &&
                  (message.content.includes("éxito") || message.content.includes("registrada"));

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex max-w-[80%] flex-col gap-2 rounded-2xl p-4 text-sm",
                      message.role === "assistant"
                        ? "bg-muted text-foreground rounded-tl-none"
                        : "ml-auto bg-indigo-600 text-white rounded-tr-none",
                      isTransactionSuccess ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100" : ""
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {message.role === "assistant" ? (
                        <Bot className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <User className="h-3 w-3 text-indigo-100" />
                      )}
                      <span className="text-[10px] font-medium opacity-70">
                        {message.role === "assistant" ? "Billi" : "Tú"} • {message.timestamp}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {isTransactionSuccess && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                      <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex self-start rounded-2xl rounded-tl-none bg-muted p-4 text-sm text-foreground items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs text-muted-foreground">Billi está procesando...</span>
                </div>
              )}
            </div>
          </ScrollArea>
          {showScrollButton && (
            <div className="pointer-events-none absolute bottom-28 right-8 z-10 flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={scrollToBottom}
                className="pointer-events-auto bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Ver mensajes recientes
              </Button>
            </div>
          )}

          <CardFooter className="border-t border-border bg-muted/30 p-4 shrink-0">
            <div className="flex w-full flex-col gap-3">
              {pendingImage && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-900 dark:text-indigo-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={pendingImage.dataUrl}
                      alt={pendingImage.name}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{pendingImage.name}</p>
                      <p className="text-[10px] text-indigo-700/80 dark:text-indigo-200/80">
                        Imagen lista para extraer el movimiento ({(pendingImage.size / 1024).toFixed(1)} KB)
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-indigo-800 hover:bg-indigo-500/20 hover:text-indigo-950 dark:text-indigo-100 dark:hover:text-white"
                    onClick={() => setPendingImage(null)}
                    aria-label="Quitar imagen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Pregunta algo a Billi..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  disabled={isBusy}
                  className="border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-indigo-500"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={(e) => void handleCaptureImageChange(e)}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  aria-label="Adjuntar imagen"
                  title="Adjuntar imagen"
                >
                  <ImagePlus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleOpenCapture()}
                  disabled={capture.isLoading || (!input.trim() && !pendingImage)}
                  aria-label="Analizar y registrar movimiento"
                  title="Analizar y registrar movimiento"
                  variant="outline"
                  className="border-border bg-background text-indigo-600 hover:bg-muted hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {capture.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={isBusy || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex-1" />
                <span>{composerHint}</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        {/* Sidebar for suggested questions */}
        <div className="hidden w-72 flex-col gap-4 lg:flex shrink-0">
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Preguntas sugeridas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((item) => (
                <button
                  key={item.label}
                  disabled={isBusy}
                  onClick={() => void handleSuggestedQuestion(item.label, item.action)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background/60 p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  {item.label}
                  <ArrowRight className="h-3 w-3" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-gradient-to-br from-indigo-500/10 to-card dark:from-indigo-900/40 dark:to-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground">Knowledge Base</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tengo acceso a las últimas normativas del SAT, leyes de ahorro para el retiro y mejores prácticas financieras en México.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Borrar conversación</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esta acción eliminará los mensajes guardados en este dispositivo. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setConfirmClearOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={handleConfirmClearChat}
            >
              Borrar chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
