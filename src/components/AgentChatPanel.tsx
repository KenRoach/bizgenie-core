import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import { Bot, Send, Loader2, X, Zap, ArrowLeft } from "lucide-react";
import ManagerThinking from "@/components/ManagerThinking";

type ToolAction = { tool: string; args: Record<string, unknown>; result: string; success: boolean };
type Msg = { role: "user" | "assistant" | "actions"; content: string; streamId?: string; actions?: ToolAction[] };

const TOOL_ICONS: Record<string, string> = {
  query_contacts: "👥",
  query_orders: "📦",
  query_goals: "🎯",
  query_knowledge: "📚",
  query_feedback: "💬",
  add_knowledge: "📝",
  log_feedback: "💬",
  update_goal_progress: "📊",
  update_contact: "👤",
};

interface AgentChatPanelProps {
  agent: { id: string; name: string; agent_type: string; nhi_identifier: string | null };
  onClose: () => void;
}

export default function AgentChatPanel({ agent, onClose }: AgentChatPanelProps) {
  const { session } = useAuth();
  const { business } = useBusiness();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [userMessage, setUserMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!streaming) return;
    const interval = setInterval(() => setElapsed(p => p + 1), 1000);
    return () => clearInterval(interval);
  }, [streaming]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !business || !session || streaming) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput("");
    setStreaming(true);
    setElapsed(0);
    setUserMessage(input.trim());

    let assistantSoFar = "";
    const sendMessages = allMsgs.filter(m => m.role !== "actions").map(({ role, content }) => ({ role, content }));

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: sendMessages,
          business_id: business.id,
          agent_id: agent.id,
          agent_type: agent.agent_type,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Agent Error", description: err.error, variant: "destructive" });
        setStreaming(false);
        return;
      }

      setMessages(prev => [...prev, { role: "assistant", content: "", streamId: "active" }]);

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "tool_actions" && parsed.actions) {
              setMessages(prev => [...prev, { role: "actions", content: "", actions: parsed.actions }]);
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const captured = assistantSoFar;
              setMessages(prev =>
                prev.map(m => m.streamId === "active" && m.role === "assistant" ? { ...m, content: captured } : m)
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to reach agent", variant: "destructive" });
    }

    setMessages(prev => prev.map(m => m.streamId === "active" ? { ...m, streamId: undefined } : m));
    setStreaming(false);
  }, [input, business, session, streaming, messages, agent, toast]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Bot className="w-5 h-5 text-primary" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">{agent.name}</h2>
          <p className="text-[10px] font-mono text-muted-foreground">{agent.nhi_identifier || agent.agent_type}</p>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-mono text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" /> ONLINE
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-3">
            <Bot className="w-10 h-10 text-primary mx-auto opacity-50" />
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Chat with <strong>{agent.name}</strong> — this agent has full access to your business data, goals, knowledge base, and CRM.
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "actions" && msg.actions) {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[85%] space-y-1">
                  <div className="flex items-center gap-1.5 px-1">
                    <Zap className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Actions Executed</span>
                  </div>
                  {msg.actions.map((action, j) => (
                    <div key={j} className={`flex items-start gap-2 px-3 py-2 rounded-md border text-xs ${action.success ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                      <span className="text-base leading-none mt-0.5">{TOOL_ICONS[action.tool] || "⚡"}</span>
                      <span className="font-medium">{action.result}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          const isStreaming = msg.streamId === "active" && msg.role === "assistant";
          const isThinking = isStreaming && !msg.content;

          if (isThinking) {
            return <ManagerThinking key={i} userMessage={userMessage} elapsed={elapsed} />;
          }

          return (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                <div className="whitespace-pre-wrap">
                  {msg.content}
                  {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder={`Ask ${agent.name} anything...`}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            disabled={streaming}
          />
          <button onClick={sendMessage} disabled={streaming || !input.trim()} className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
