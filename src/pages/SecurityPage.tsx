import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert, Power, Gauge, Battery, Plus, Loader2,
  AlertOctagon, Zap, Bot, ToggleLeft, ToggleRight, Trash2
} from "lucide-react";

interface EmergencyControl {
  id: string;
  control_type: string;
  target_agent_id: string | null;
  is_engaged: boolean;
  config: Record<string, unknown>;
  triggered_by: string | null;
  triggered_at: string | null;
  agent_configurations?: { name: string } | null;
}

interface AgentConfig {
  id: string;
  name: string;
  agent_type: string;
  nhi_identifier: string | null;
  permissions: string[];
  token_ttl_minutes: number;
  is_active: boolean;
}

const CONTROL_ICONS: Record<string, typeof Power> = {
  kill_switch: Power,
  global_throttle: Gauge,
  ai_battery: Battery,
};

const CONTROL_LABELS: Record<string, string> = {
  kill_switch: "Kill Switch",
  global_throttle: "Global Throttle",
  ai_battery: "AI Battery",
};

export default function SecurityPage() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [controls, setControls] = useState<EmergencyControl[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"controls" | "agents">("controls");

  const load = async () => {
    if (!business) return;
    const [controlsRes, agentsRes] = await Promise.all([
      supabase.from("emergency_controls").select("*, agent_configurations(name)").eq("business_id", business.id).order("created_at"),
      supabase.from("agent_configurations").select("id, name, agent_type, nhi_identifier, permissions, token_ttl_minutes, is_active").eq("business_id", business.id),
    ]);
    setControls((controlsRes.data as EmergencyControl[]) || []);
    setAgents((agentsRes.data as AgentConfig[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (business) load(); }, [business]);

  const handleToggleControl = async (id: string, isEngaged: boolean) => {
    await supabase.from("emergency_controls").update({
      is_engaged: !isEngaged,
      triggered_at: !isEngaged ? new Date().toISOString() : null,
      triggered_by: !isEngaged ? "manual" : null,
    }).eq("id", id);

    // Log to audit
    if (business) {
      await supabase.from("agent_audit_log").insert({
        business_id: business.id,
        action: `Emergency control ${!isEngaged ? "ENGAGED" : "disengaged"}`,
        risk_flag: !isEngaged ? "high" : "none",
        human_approval: "approved",
        payload: { control_id: id },
      });
    }

    toast({ title: !isEngaged ? "⚠️ Control engaged" : "Control disengaged" });
    load();
  };

  const handleAddControl = async (type: string, agentId?: string) => {
    if (!business) return;
    const defaultConfig = type === "global_throttle"
      ? { max_rpm: 30 }
      : type === "ai_battery"
      ? { max_credits: 1000, used_credits: 0, auto_disable: true }
      : {};

    await supabase.from("emergency_controls").insert({
      business_id: business.id,
      control_type: type,
      target_agent_id: agentId || null,
      config: defaultConfig as unknown as Record<string, never>,
    } as any);
    load();
  };

  const handleDeleteControl = async (id: string) => {
    await supabase.from("emergency_controls").delete().eq("id", id);
    load();
  };

  const handleUpdateNhi = async (agentId: string, nhi: string) => {
    await supabase.from("agent_configurations").update({ nhi_identifier: nhi || null }).eq("id", agentId);
    load();
  };

  const handleUpdateTtl = async (agentId: string, ttl: number) => {
    await supabase.from("agent_configurations").update({ token_ttl_minutes: ttl }).eq("id", agentId);
    load();
  };

  const engagedCount = controls.filter(c => c.is_engaged).length;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-primary" /> Security Controls
        </h1>
        <p className="text-xs font-mono text-muted-foreground">Zero Trust · Least privilege · Assume breach</p>
      </div>

      {/* Status strip */}
      <div className="flex flex-wrap gap-2">
        <span className={engagedCount > 0 ? "kitz-badge-warning" : "kitz-badge-live"}>
          <span className={`w-1.5 h-1.5 rounded-full ${engagedCount > 0 ? "bg-warning animate-pulse" : "bg-success"}`} />
          {engagedCount > 0 ? `${engagedCount} CONTROL${engagedCount > 1 ? "S" : ""} ENGAGED` : "ALL CLEAR"}
        </span>
        <span className="kitz-badge-info">{agents.length} agents</span>
        <span className="kitz-badge-info">{controls.length} controls</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-px">
        {[
          { key: "controls" as const, label: "Emergency Controls", icon: AlertOctagon },
          { key: "agents" as const, label: "Agent Identities (NHI)", icon: Bot },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors ${tab === t.key ? "bg-card border border-border border-b-card text-foreground -mb-px" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Emergency Controls Tab */}
      {tab === "controls" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["kill_switch", "global_throttle", "ai_battery"] as const).map(type => (
              <button key={type} onClick={() => handleAddControl(type)} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-sm rounded-md hover:border-primary/30 transition-colors">
                <Plus className="w-4 h-4 text-primary" /> Add {CONTROL_LABELS[type]}
              </button>
            ))}
            {agents.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground mx-2">Per-agent kill:</span>
                {agents.map(a => (
                  <button key={a.id} onClick={() => handleAddControl("kill_switch", a.id)} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary border border-border text-xs rounded-md hover:border-destructive/30 transition-colors">
                    <Power className="w-3 h-3 text-destructive" /> {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {controls.map(ctrl => {
            const Icon = CONTROL_ICONS[ctrl.control_type] || Power;
            return (
              <div key={ctrl.id} className={`bg-card border rounded-md p-4 transition-colors ${ctrl.is_engaged ? "border-destructive/50 bg-destructive/[0.03]" : "border-border"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${ctrl.is_engaged ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className="text-sm font-medium text-foreground">{CONTROL_LABELS[ctrl.control_type] || ctrl.control_type}</span>
                    {ctrl.agent_configurations?.name && (
                      <span className="kitz-badge-info text-[10px]">{ctrl.agent_configurations.name}</span>
                    )}
                    {ctrl.is_engaged && <span className="kitz-badge-error text-[10px] animate-pulse">ENGAGED</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggleControl(ctrl.id, ctrl.is_engaged)} className={`p-2 rounded-md transition-colors ${ctrl.is_engaged ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {ctrl.is_engaged ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleDeleteControl(ctrl.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground space-y-1">
                  {ctrl.triggered_at && <p>Triggered: {new Date(ctrl.triggered_at).toLocaleString()} by {ctrl.triggered_by}</p>}
                  {Object.keys(ctrl.config).length > 0 && <pre className="bg-secondary/50 rounded p-2 mt-1">{JSON.stringify(ctrl.config, null, 2)}</pre>}
                </div>
              </div>
            );
          })}
          {controls.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No emergency controls configured.</p>}
        </div>
      )}

      {/* Agent NHI Tab */}
      {tab === "agents" && (
        <div className="space-y-4">
          {agents.map(agent => (
            <div key={agent.id} className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  <span className="kitz-badge-info text-[10px]">{agent.agent_type.toUpperCase()}</span>
                  {agent.is_active ? <span className="kitz-badge-live text-[10px]">ACTIVE</span> : <span className="kitz-badge-error text-[10px]">INACTIVE</span>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">NHI Identifier</label>
                  <input value={agent.nhi_identifier || ""} onChange={e => handleUpdateNhi(agent.id, e.target.value)} placeholder="agent-crm-prod-001" className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Token TTL (minutes)</label>
                  <input type="number" value={agent.token_ttl_minutes} onChange={e => handleUpdateTtl(agent.id, parseInt(e.target.value) || 15)} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                <span className="uppercase tracking-wider">Permissions:</span>{" "}
                {(agent.permissions as string[])?.length > 0
                  ? (agent.permissions as string[]).join(", ")
                  : "none (least privilege)"}
              </div>
            </div>
          ))}
          {agents.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No agents configured. Create agents in Settings first.</p>}
        </div>
      )}
    </div>
  );
}
