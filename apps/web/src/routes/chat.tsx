import { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Paperclip,
  Mic,
  ArrowRight
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

const suggestedQuestions = [
  "¿Cuánto gasté en comida este mes?",
  "¿Cómo puedo ahorrar más?",
  "Explicame qué es el ISR",
  "¿Cuáles son mis gastos más recurrentes?",
];

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content: "¡Hola! Soy Billi, tu asistente financiero. ¿En qué puedo ayudarte hoy? Puedo analizar tus gastos o resolver dudas sobre finanzas en México.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      role: "user",
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, userMessage]);
    setInput("");

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: "Estoy analizando tu solicitud... Basado en tus datos, he notado que tu gasto en 'Comida' ha incrementado un 15% esta semana. ¿Te gustaría ver un desglose detallado?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <div className="flex h-[calc(100vh-160px)] flex-col gap-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
          Chat Billi <Sparkles className="h-6 w-6 text-indigo-400" />
        </h2>
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
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En línea
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex max-w-[80%] flex-col gap-2 rounded-2xl p-4 text-sm",
                    message.role === "assistant"
                      ? "self-start bg-slate-800 text-slate-100 rounded-tl-none"
                      : "self-end bg-indigo-600 text-white rounded-tr-none ml-auto"
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
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              ))}
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
                  className="bg-slate-950 border-slate-800 focus-visible:ring-indigo-500"
                />
                <Button onClick={handleSend} className="bg-indigo-600 hover:bg-indigo-500">
                  <Send className="h-4 w-4" />
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
                  onClick={() => setInput(q)}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-left text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
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
    </div>
  );
}
