import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import {
  Bot, Search, Shield, Zap, Clock, Crown, BarChart3,
  MessageSquare, ChevronRight, Activity, Power, PowerOff,
} from "lucide-react";

type Agent = {
  id: string;
  name: string;
  agent_type: string;
  model: string | null;
  is_active: boolean | null;
  nhi_identifier: string | null;
  system_prompt: string | null;
  token_ttl_minutes: number | null;
  last_token_at: string | null;
  created_at: string;
  updated_at: string;
};

type AgentStats = {
  agent_type: string;
  count: number;
  last_active: string | null;
};

const EXEC_TYPES = new Set(["ceo", "cfo", "cto", "cpo", "cro", "coo"]);

const TYPE_LABELS: Record<string, string> = {
  ceo: "CEO", cfo: "CFO", cto: "CTO", cpo: "CPO", cro: "CRO", coo: "COO",
  growth: "Growth", sales: "Sales", marketing: "Marketing", content: "Content",
  support: "Support", ops: "Operations", analytics: "Analytics", retention: "Retention",
  onboarding: "Onboarding", custom: "Custom", crm: "CRM", followup: "Follow-up",
};

const LEADER_MAP: Record<string, string> = {
  growth: "cro", sales: "cro", marketing: "cro",
  content: "cpo", retention: "cpo", onboarding: "cpo",
  ops: "coo", analytics: "coo",
  support: "cto",
  custom: "ceo",
  crm: "cro", followup: "cro",
};

interface AgentsPageProps {
  onChatAgent?: (agent: { id: string; name: string; agent_type: string; nhi_identifier: string | null }) => void;
}

export default function AgentsPage({ onChatAgent }: AgentsPageProps) {
  const { business } = useBusiness();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "executive" | "functional">("all");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const loadAgents = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("agent_configurations")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at");
    setAgents((data as Agent[]) || []);
  }, [business]);

  const loadStats = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("event_logs")
      .select("payload, created_at")
      .eq("business_id", business.id)
      .eq("event_type", "agent_invoked")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) {
      const map: Record<string, { count: number; last_active: string | null }> = {};
      data.forEach((e: any) => {
        const t = e.payload?.agent_type;
        if (!t) return;
        if (!map[t]) map[t] = { count: 0, last_active: null };
        map[t].count++;
        if (!map[t].last_active) map[t].last_active = e.created_at;
      });
      setStats(Object.entries(map).map(([agent_type, v]) => ({ agent_type, ...v })));
    }
  }, [business]);

  useEffect(() => { loadAgents(); loadStats(); }, [loadAgents, loadStats]);

  const filtered = agents.filter(a => {
    if (filter === "executive" && !EXEC_TYPES.has(a.agent_type)) return false;
    if (filter === "functional" && EXEC_TYPES.has(a.agent_type)) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.name.toLowerCase().includes(q) || a.agent_type.includes(q) || (a.nhi_identifier || "").toLowerCase().includes(q);
    }
    return true;
  });

  const executives = filtered.filter(a => EXEC_TYPES.has(a.agent_type));
  const functional = filtered.filter(a => !EXEC_TYPES.has(a.agent_type));
  const activeCount = agents.filter(a => a.is_active).length;
  const getStats = (type: string) => stats.find(s => s.agent_type === type);

  const timeAgo = (ts: string | null) => {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const AgentCard = ({ agent }: { agent: Agent }) => {
    const agentStats = getStats(agent.agent_type);
    const isExec = EXEC_TYPES.has(agent.agent_type);
    const leader = !isExec ? agents.find(a => a.agent_type === LEADER_MAP[agent.agent_type]) : null;

    return (
      <button
        onClick={() => setSelectedAgent(agent)}
        className="text-left w-full bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-all group space-y-3"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${isExec ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-border"}`}>
              {isExec ? <Crown className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-foreground truncate">{agent.name}</h3>
              <p className="text-[10px] font-mono text-muted-foreground">{agent.nhi_identifier || agent.agent_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${agent.is_active ? "bg-success/10 text-success border border-success/20" : "bg-muted text-muted-foreground border border-border"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? "bg-success animate-pulse-glow" : "bg-muted-foreground"}`} />
              {agent.is_active ? "LIVE" : "OFF"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            {TYPE_LABELS[agent.agent_type] || agent.agent_type}
          </span>
          {agent.model && (
            <span className="truncate max-w-[120px]">{agent.model.split("/").pop()}</span>
          )}
          {agentStats && (
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {agentStats.count} calls
            </span>
          )}
        </div>

        {leader && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="text-primary/60">↳</span> Reports to <strong className="text-foreground/70">{leader.name}</strong>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last active: {timeAgo(agentStats?.last_active || null)}
          </span>
          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
        </div>
      </button>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bot className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(185_80%_50%/0.5)]" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Agent Workforce</h1>
            <p className="text-xs text-muted-foreground font-mono">{activeCount} active · {agents.length} total</p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Crown className="w-3 h-3 text-primary" /> C-Suite
          </div>
          <p className="text-lg font-bold text-foreground">{agents.filter(a => EXEC_TYPES.has(a.agent_type)).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Bot className="w-3 h-3 text-accent" /> Functional
          </div>
          <p className="text-lg font-bold text-foreground">{agents.filter(a => !EXEC_TYPES.has(a.agent_type)).length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Power className="w-3 h-3 text-success" /> Active
          </div>
          <p className="text-lg font-bold text-success">{activeCount}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground uppercase">
            <Activity className="w-3 h-3 text-warning" /> Invocations
          </div>
          <p className="text-lg font-bold text-foreground">{stats.reduce((s, e) => s + e.count, 0)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "executive", "functional"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? "All" : f === "executive" ? "C-Suite" : "Functional"}
            </button>
          ))}
        </div>
      </div>

      {/* Executives */}
      {executives.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">C-Suite Executives</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {executives.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>
        </div>
      )}

      {/* Functional */}
      {functional.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">Functional Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {functional.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <Bot className="w-10 h-10 text-primary mx-auto opacity-30" />
          <p className="text-sm text-muted-foreground">No agents match your search.</p>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setSelectedAgent(null)}>
          <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-md flex items-center justify-center ${EXEC_TYPES.has(selectedAgent.agent_type) ? "bg-primary/10 border border-primary/20" : "bg-secondary border border-border"}`}>
                  {EXEC_TYPES.has(selectedAgent.agent_type) ? <Crown className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{selectedAgent.name}</h2>
                  <p className="text-[10px] font-mono text-muted-foreground">{selectedAgent.nhi_identifier}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onChatAgent && (
                  <button
                    onClick={() => { onChatAgent(selectedAgent); setSelectedAgent(null); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90"
                  >
                    <MessageSquare className="w-3 h-3" /> Chat
                  </button>
                )}
                <button onClick={() => setSelectedAgent(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Type</span>
                  <p className="text-sm font-medium text-foreground">{TYPE_LABELS[selectedAgent.agent_type] || selectedAgent.agent_type}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Status</span>
                  <p className={`text-sm font-medium ${selectedAgent.is_active ? "text-success" : "text-muted-foreground"}`}>
                    {selectedAgent.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Model</span>
                  <p className="text-sm text-foreground truncate">{selectedAgent.model || "—"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Heartbeat</span>
                  <p className="text-sm text-foreground">{selectedAgent.token_ttl_minutes || 15}m</p>
                </div>
              </div>

              {selectedAgent.system_prompt && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">System Prompt</span>
                  <pre className="p-3 bg-secondary border border-border rounded-md text-xs text-foreground font-mono whitespace-pre-wrap max-h-48 overflow-auto leading-relaxed">
                    {selectedAgent.system_prompt}
                  </pre>
                </div>
              )}

              {(() => {
                const agentStats = getStats(selectedAgent.agent_type);
                return agentStats ? (
                  <div className="flex items-center gap-4 p-3 bg-secondary border border-border rounded-md">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Invocations</span>
                      <p className="text-sm font-bold text-foreground">{agentStats.count}</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">Last Active</span>
                      <p className="text-sm text-foreground">{timeAgo(agentStats.last_active)}</p>
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="text-[10px] font-mono text-muted-foreground">
                Created {new Date(selectedAgent.created_at).toLocaleDateString()} · Updated {new Date(selectedAgent.updated_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
