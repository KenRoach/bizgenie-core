import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  Send,
  Loader2,
  X,
  AlertCircle,
  HelpCircle,
  Compass,
  Megaphone,
  Bot,
} from "lucide-react";

type HuddleType = "concern" | "question" | "guidance" | "update";

const HUDDLE_TYPES: { value: HuddleType; label: string; icon: React.ElementType }[] = [
  { value: "concern", label: "Concern", icon: AlertCircle },
  { value: "question", label: "Question", icon: HelpCircle },
  { value: "guidance", label: "Guidance", icon: Compass },
  { value: "update", label: "Update", icon: Megaphone },
];

type HuddleMessage = {
  id?: string;
  sender_type: "user" | "agent";
  sender_name: string;
  agent_type?: string;
  content: string;
  streaming?: boolean;
};

interface HuddlePanelProps {
  onClose: () => void;
}

export default function HuddlePanel({ onClose }: HuddlePanelProps) {
  const { session } = useAuth();
  const { business } = useBusiness();
  const { toast } = useToast();
  const [huddleType, setHuddleType] = useState<HuddleType>("concern");
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<HuddleMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [huddleId, setHuddleId] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startHuddle = useCallback(async (text: string, existingHuddleId?: string) => {
    if (!text.trim() || !business || !session || streaming) return;
    setStreaming(true);

    if (!existingHuddleId) {
      setMessages([{ sender_type: "user", sender_name: "You", content: text.trim() }]);
    } else {
      setMessages(prev => [...prev, { sender_type: "user", sender_name: "You", content: text.trim() }]);
    }

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-huddle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          business_id: business.id,
          topic: text.trim(),
          huddle_type: huddleType,
          huddle_id: existingHuddleId || null,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Failed" }));
        toast({ title: "Huddle Error", description: err.error, variant: "destructive" });
        setStreaming(false);
        return;
      }

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
            if (parsed.type === "huddle_id") {
              setHuddleId(parsed.huddle_id);
            } else if (parsed.type === "agent_response") {
              setMessages(prev => [...prev, {
                sender_type: "agent",
                sender_name: parsed.agent_name,
                agent_type: parsed.agent_type,
                content: parsed.content,
              }]);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to start huddle", variant: "destructive" });
    }

    setStreaming(false);
  }, [business, session, streaming, huddleType, toast]);

  const handleStart = () => {
    if (!topic.trim()) return;
    startHuddle(topic);
    setTopic("");
  };

  const handleFollowUp = () => {
    if (!followUp.trim() || !huddleId) return;
    startHuddle(followUp, huddleId);
    setFollowUp("");
  };

  const AGENT_TYPE_COLORS: Record<string, string> = {
    ceo: "text-amber-400",
    cfo: "text-emerald-400",
    cto: "text-blue-400",
    cpo: "text-purple-400",
    cro: "text-rose-400",
    coo: "text-cyan-400",
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <Users className="w-5 h-5 text-primary" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Team Huddle</h2>
          <p className="text-[10px] font-mono text-muted-foreground">All C-Suite agents respond</p>
        </div>
        {streaming && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
            <Loader2 className="w-3 h-3 animate-spin" /> LIVE
          </span>
        )}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8 space-y-4">
            <Users className="w-10 h-10 text-primary mx-auto opacity-50" />
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start a huddle to broadcast a concern, question, guidance, or update to all your active C-suite agents. They'll each respond with their perspective.
            </p>
            {/* Type selector */}
            <div className="flex flex-wrap justify-center gap-2">
              {HUDDLE_TYPES.map(ht => {
                const Icon = ht.icon;
                const active = huddleType === ht.value;
                return (
                  <button
                    key={ht.value}
                    onClick={() => setHuddleType(ht.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {ht.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender_type === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.sender_type === "user" ? "" : ""}`}>
                {msg.sender_type === "agent" && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <Bot className={`w-3 h-3 ${AGENT_TYPE_COLORS[msg.agent_type || ""] || "text-muted-foreground"}`} />
                    <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${AGENT_TYPE_COLORS[msg.agent_type || ""] || "text-muted-foreground"}`}>
                      {msg.sender_name}
                    </span>
                  </div>
                )}
                <div className={`px-3 py-2 rounded-lg text-sm ${
                  msg.sender_type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            </div>
          ))
        )}
        {streaming && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              Agents are responding...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        {messages.length === 0 ? (
          <div className="flex gap-2">
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleStart()}
              placeholder="What's on your mind? Drop a concern, question, guidance, or update..."
              className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              disabled={streaming}
            />
            <button onClick={handleStart} disabled={streaming || !topic.trim()} className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleFollowUp()}
              placeholder="Follow up with more context or a new question..."
              className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              disabled={streaming}
            />
            <button onClick={handleFollowUp} disabled={streaming || !followUp.trim()} className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50">
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
