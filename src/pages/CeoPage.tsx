import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Crown, Send, Loader2, Target, BookOpen, Plus, Trash2,
  TrendingUp, Calendar, CheckCircle2, Circle, ArrowRight,
  Brain, Sparkles, ChevronDown, ChevronRight
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

interface Goal {
  id: string;
  goal_type: string;
  title: string;
  description: string | null;
  status: string;
  progress: number;
  period_start: string | null;
  period_end: string | null;
  parent_goal_id: string | null;
}

interface Knowledge {
  id: string;
  category: string;
  title: string;
  content: string;
  source: string;
  created_at: string;
}

const GOAL_COLORS: Record<string, string> = {
  annual: "border-l-primary",
  quarterly: "border-l-accent",
  weekly: "border-l-warning",
};

const CATEGORIES = ["company", "product", "market", "playbook", "competitor", "general"];

export default function CeoPage() {
  const { business } = useBusiness();
  const { session } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"chat" | "goals" | "knowledge">("chat");

  // Chat state
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalForm, setGoalForm] = useState({ goal_type: "weekly", title: "", description: "", period_start: "", period_end: "", parent_goal_id: "" });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [expandedGoalType, setExpandedGoalType] = useState<string | null>("annual");

  // Knowledge state
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [knowledgeForm, setKnowledgeForm] = useState({ category: "general", title: "", content: "" });
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);

  useEffect(() => { if (business) { loadGoals(); loadKnowledge(); } }, [business]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const loadGoals = async () => {
    if (!business) return;
    const { data } = await supabase.from("agent_goals").select("*").eq("business_id", business.id).order("goal_type").order("created_at");
    setGoals((data as Goal[]) || []);
  };

  const loadKnowledge = async () => {
    if (!business) return;
    const { data } = await supabase.from("agent_knowledge").select("*").eq("business_id", business.id).order("updated_at", { ascending: false });
    setKnowledge((data as Knowledge[]) || []);
  };

  // Streaming chat
  const sendMessage = async () => {
    if (!input.trim() || !business || streaming) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ceo-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: allMessages, business_id: business.id }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "CEO Agent Error", description: err.error, variant: "destructive" });
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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to reach CEO Agent", variant: "destructive" });
    }
    setStreaming(false);
  };

  // Goal CRUD
  const handleAddGoal = async () => {
    if (!business || !goalForm.title.trim()) return;
    await supabase.from("agent_goals").insert({
      business_id: business.id,
      goal_type: goalForm.goal_type,
      title: goalForm.title.trim(),
      description: goalForm.description.trim() || null,
      period_start: goalForm.period_start || null,
      period_end: goalForm.period_end || null,
      parent_goal_id: goalForm.parent_goal_id || null,
    } as any);
    setGoalForm({ goal_type: "weekly", title: "", description: "", period_start: "", period_end: "", parent_goal_id: "" });
    setShowGoalForm(false);
    loadGoals();
  };

  const handleUpdateGoalProgress = async (id: string, progress: number) => {
    const status = progress >= 100 ? "completed" : "active";
    await supabase.from("agent_goals").update({ progress: Math.min(100, Math.max(0, progress)), status }).eq("id", id);
    loadGoals();
  };

  const handleDeleteGoal = async (id: string) => {
    await supabase.from("agent_goals").delete().eq("id", id);
    loadGoals();
  };

  // Knowledge CRUD
  const handleAddKnowledge = async () => {
    if (!business || !knowledgeForm.title.trim() || !knowledgeForm.content.trim()) return;
    await supabase.from("agent_knowledge").insert({
      business_id: business.id,
      category: knowledgeForm.category,
      title: knowledgeForm.title.trim(),
      content: knowledgeForm.content.trim(),
      source: "manual",
      created_by: "owner",
    });
    setKnowledgeForm({ category: "general", title: "", content: "" });
    setShowKnowledgeForm(false);
    loadKnowledge();
  };

  const handleDeleteKnowledge = async (id: string) => {
    await supabase.from("agent_knowledge").delete().eq("id", id);
    loadKnowledge();
  };

  const annualGoals = goals.filter(g => g.goal_type === "annual");
  const quarterlyGoals = goals.filter(g => g.goal_type === "quarterly");
  const weeklyGoals = goals.filter(g => g.goal_type === "weekly");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Virtual CEO</h1>
            <span className="kitz-badge-live text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" /> ONLINE
            </span>
          </div>
          <div className="flex gap-1">
            {([
              { key: "chat" as const, label: "Chat", icon: Sparkles },
              { key: "goals" as const, label: "Goals", icon: Target },
              { key: "knowledge" as const, label: "Knowledge", icon: BookOpen },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <Crown className="w-12 h-12 text-primary mx-auto opacity-50" />
                <div>
                  <p className="text-sm font-medium text-foreground">Your Virtual CEO is ready</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                    Start by saying "Let's build the AOP" or "What should we focus on this quarter?" The CEO has full context of your business, contacts, orders, campaigns, and knowledge base.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {["Let's create the Annual Operating Plan", "What's our company status?", "What agents do we need next?", "Plan this week's sprint"].map(q => (
                    <button key={q} onClick={() => { setInput(q); }} className="px-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground hover:border-primary/30 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-4 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()} placeholder="Talk to your CEO..." className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" disabled={streaming} />
              <button onClick={sendMessage} disabled={streaming || !input.trim()} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goals Tab */}
      {tab === "goals" && (
        <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-muted-foreground">AOP → Quarterly → Weekly cascade</p>
            <button onClick={() => setShowGoalForm(!showGoalForm)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90">
              <Plus className="w-4 h-4" /> Add Goal
            </button>
          </div>

          {showGoalForm && (
            <div className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Type</label>
                  <select value={goalForm.goal_type} onChange={e => setGoalForm({ ...goalForm, goal_type: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="annual">Annual (AOP)</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Start</label>
                  <input type="date" value={goalForm.period_start} onChange={e => setGoalForm({ ...goalForm, period_start: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">End</label>
                  <input type="date" value={goalForm.period_end} onChange={e => setGoalForm({ ...goalForm, period_end: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Title</label>
                <input value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Reach $10K MRR" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Description</label>
                <input value={goalForm.description} onChange={e => setGoalForm({ ...goalForm, description: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Key results and metrics" />
              </div>
              {(goalForm.goal_type === "quarterly" || goalForm.goal_type === "weekly") && annualGoals.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Parent Goal</label>
                  <select value={goalForm.parent_goal_id} onChange={e => setGoalForm({ ...goalForm, parent_goal_id: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    <option value="">None</option>
                    {(goalForm.goal_type === "quarterly" ? annualGoals : quarterlyGoals).map(g => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <button onClick={handleAddGoal} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90">
                <Plus className="w-4 h-4" /> Create
              </button>
            </div>
          )}

          {/* Goal sections */}
          {([
            { type: "annual", label: "Annual Operating Plan (AOP)", icon: TrendingUp, items: annualGoals },
            { type: "quarterly", label: "Quarterly Goals", icon: Calendar, items: quarterlyGoals },
            { type: "weekly", label: "Weekly Sprint", icon: Target, items: weeklyGoals },
          ]).map(section => (
            <div key={section.type}>
              <button onClick={() => setExpandedGoalType(expandedGoalType === section.type ? null : section.type)} className="flex items-center gap-2 mb-3 group">
                {expandedGoalType === section.type ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <section.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{section.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground">({section.items.length})</span>
              </button>
              {expandedGoalType === section.type && (
                <div className="space-y-2 ml-6">
                  {section.items.map(goal => (
                    <div key={goal.id} className={`bg-card border border-border rounded-md p-3 border-l-2 ${GOAL_COLORS[goal.goal_type]}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {goal.status === "completed" ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                          <span className={`text-sm font-medium ${goal.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>{goal.title}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input type="range" min="0" max="100" value={goal.progress} onChange={e => handleUpdateGoalProgress(goal.id, parseInt(e.target.value))} className="w-20 h-1 accent-primary" />
                          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{goal.progress}%</span>
                          <button onClick={() => handleDeleteGoal(goal.id)} className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors ml-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {goal.description && <p className="text-xs text-muted-foreground ml-5">{goal.description}</p>}
                      {(goal.period_start || goal.period_end) && (
                        <p className="text-[10px] font-mono text-muted-foreground ml-5 mt-1">
                          {goal.period_start} <ArrowRight className="w-3 h-3 inline" /> {goal.period_end}
                        </p>
                      )}
                    </div>
                  ))}
                  {section.items.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2">No {section.type} goals yet. Ask your CEO to help define them.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Knowledge Tab */}
      {tab === "knowledge" && (
        <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono text-muted-foreground">{knowledge.length} entries · Evolves with your business</p>
            </div>
            <button onClick={() => setShowKnowledgeForm(!showKnowledgeForm)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90">
              <Plus className="w-4 h-4" /> Add Knowledge
            </button>
          </div>

          {showKnowledgeForm && (
            <div className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Category</label>
                  <select value={knowledgeForm.category} onChange={e => setKnowledgeForm({ ...knowledgeForm, category: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Title</label>
                  <input value={knowledgeForm.title} onChange={e => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. Target Customer Profile" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Content</label>
                <textarea rows={3} value={knowledgeForm.content} onChange={e => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y" placeholder="What the CEO needs to know..." />
              </div>
              <button onClick={handleAddKnowledge} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90">
                <Plus className="w-4 h-4" /> Save
              </button>
            </div>
          )}

          {/* Knowledge by category */}
          {CATEGORIES.filter(cat => knowledge.some(k => k.category === cat)).map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">{cat}</h3>
              <div className="space-y-2">
                {knowledge.filter(k => k.category === cat).map(k => (
                  <div key={k.id} className="bg-card border border-border rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{k.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{k.source}</span>
                        <button onClick={() => handleDeleteKnowledge(k.id)} className="p-1 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{k.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {knowledge.length === 0 && (
            <div className="text-center py-8">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">Knowledge base is empty. Add your first entries or chat with the CEO — it'll suggest what to capture.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
