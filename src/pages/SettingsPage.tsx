import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import { Settings, Github, Bot, Cpu, Save, Loader2, Plus, Trash2, Power } from "lucide-react";

interface AgentConfig {
  id: string;
  agent_type: string;
  name: string;
  system_prompt: string | null;
  model: string;
  is_active: boolean;
}

interface GithubIntegration {
  id: string;
  repo_owner: string;
  repo_name: string;
  webhook_url: string | null;
  is_active: boolean;
}

interface OpenClawConfig {
  id: string;
  name: string;
  router_config: Record<string, unknown>;
  retry_policy: Record<string, unknown>;
  is_active: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { business, updateBusiness } = useBusiness();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [githubIntegrations, setGithubIntegrations] = useState<GithubIntegration[]>([]);
  const [openclawConfigs, setOpenclawConfigs] = useState<OpenClawConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"general" | "agents" | "github" | "openclaw">("general");

  useEffect(() => {
    if (business) {
      setBusinessName(business.name);
      loadAll();
    }
  }, [business]);

  const loadAll = async () => {
    if (!business) return;
    const [agentsRes, githubRes, openclawRes] = await Promise.all([
      supabase.from("agent_configurations").select("*").eq("business_id", business.id),
      supabase.from("github_integrations").select("*").eq("business_id", business.id),
      supabase.from("openclaw_configs").select("*").eq("business_id", business.id),
    ]);
    if (agentsRes.data) setAgents(agentsRes.data as AgentConfig[]);
    if (githubRes.data) setGithubIntegrations(githubRes.data as GithubIntegration[]);
    if (openclawRes.data) setOpenclawConfigs(openclawRes.data as OpenClawConfig[]);
  };

  const handleSaveBusiness = async () => {
    setSaving(true);
    await updateBusiness({ name: businessName });
    toast({ title: "Saved", description: "Business name updated." });
    setSaving(false);
  };

  const handleCreateAgent = async (agentType: string) => {
    if (!business) return;
    const { error } = await supabase.from("agent_configurations").insert({
      business_id: business.id,
      agent_type: agentType,
      name: agentType === "crm" ? "CRM Agent" : agentType === "followup" ? "Follow Up Agent" : "Support Agent",
      system_prompt: `You are a ${agentType === "crm" ? "CRM" : agentType === "followup" ? "Follow Up" : "Support"} agent for ${business.name}. Help the business owner manage their ${agentType === "crm" ? "contacts and customer relationships" : agentType === "followup" ? "follow-ups and re-engagement" : "customer support and issue resolution"}.`,
      model: "google/gemini-3-flash-preview",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent created" });
      loadAll();
    }
  };

  const handleToggleAgent = async (id: string, isActive: boolean) => {
    await supabase.from("agent_configurations").update({ is_active: !isActive }).eq("id", id);
    loadAll();
  };

  const handleDeleteAgent = async (id: string) => {
    await supabase.from("agent_configurations").delete().eq("id", id);
    loadAll();
  };

  const handleAddGithub = async () => {
    if (!business) return;
    const { error } = await supabase.from("github_integrations").insert({
      business_id: business.id,
      repo_owner: "your-org",
      repo_name: "your-repo",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      loadAll();
    }
  };

  const handleUpdateGithub = async (id: string, updates: Partial<GithubIntegration>) => {
    await supabase.from("github_integrations").update(updates).eq("id", id);
    loadAll();
  };

  const handleDeleteGithub = async (id: string) => {
    await supabase.from("github_integrations").delete().eq("id", id);
    loadAll();
  };

  const handleAddOpenclaw = async () => {
    if (!business) return;
    const { error } = await supabase.from("openclaw_configs").insert({
      business_id: business.id,
      name: "default",
      router_config: { default_agent: "crm", fallback_agent: "followup" },
      retry_policy: { max_retries: 3, backoff_ms: 1000 },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      loadAll();
    }
  };

  const tabs = [
    { key: "general", label: "General", icon: Settings },
    { key: "agents", label: "Agents", icon: Bot },
    { key: "github", label: "GitHub", icon: Github },
    { key: "openclaw", label: "OpenClaw", icon: Cpu },
  ] as const;

  const missingAgents = (["crm", "followup", "support"] as const).filter(
    (t) => !agents.some((a) => a.agent_type === t)
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-xs font-mono text-muted-foreground">Configure your business hub, agents, and integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors ${
                tab === t.key ? "bg-card border border-border border-b-card text-foreground -mb-px" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* General */}
      {tab === "general" && (
        <div className="bg-card border border-border rounded-md p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Business Name</label>
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full max-w-md px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Owner</label>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <button onClick={handleSaveBusiness} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      )}

      {/* Agents */}
      {tab === "agents" && (
        <div className="space-y-4">
          {missingAgents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {missingAgents.map((type) => (
                <button key={type} onClick={() => handleCreateAgent(type)} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-sm rounded-md hover:border-primary/30 transition-colors">
                  <Plus className="w-4 h-4 text-primary" />
                  Create {type.charAt(0).toUpperCase() + type.slice(1)} Agent
                </button>
              ))}
            </div>
          )}
          {agents.map((agent) => (
            <div key={agent.id} className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  <span className="kitz-badge-info">{agent.agent_type.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleAgent(agent.id, agent.is_active)} className={`p-1.5 rounded-md transition-colors ${agent.is_active ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary"}`}>
                    <Power className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteAgent(agent.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                Model: {agent.model} · {agent.is_active ? "Active" : "Inactive"}
              </div>
              {agent.system_prompt && (
                <p className="text-xs text-muted-foreground bg-secondary/50 rounded-md p-2 font-mono line-clamp-2">{agent.system_prompt}</p>
              )}
            </div>
          ))}
          {agents.length === 0 && missingAgents.length === 0 && (
            <p className="text-sm text-muted-foreground">All agents configured.</p>
          )}
        </div>
      )}

      {/* GitHub */}
      {tab === "github" && (
        <div className="space-y-4">
          <button onClick={handleAddGithub} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-sm rounded-md hover:border-primary/30 transition-colors">
            <Plus className="w-4 h-4 text-primary" />
            Connect Repository
          </button>
          {githubIntegrations.map((gh) => (
            <div key={gh.id} className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-foreground" />
                  <span className="text-sm font-mono text-foreground">{gh.repo_owner}/{gh.repo_name}</span>
                </div>
                <button onClick={() => handleDeleteGithub(gh.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Owner</label>
                  <input type="text" value={gh.repo_owner} onChange={(e) => handleUpdateGithub(gh.id, { repo_owner: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Repository</label>
                  <input type="text" value={gh.repo_name} onChange={(e) => handleUpdateGithub(gh.id, { repo_name: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
              </div>
              <div className={`text-xs font-mono ${gh.is_active ? "text-success" : "text-muted-foreground"}`}>
                {gh.is_active ? "● Connected" : "○ Not connected"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* OpenClaw */}
      {tab === "openclaw" && (
        <div className="space-y-4">
          <button onClick={handleAddOpenclaw} className="inline-flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-sm rounded-md hover:border-primary/30 transition-colors">
            <Plus className="w-4 h-4 text-primary" />
            Add Configuration
          </button>
          {openclawConfigs.map((oc) => (
            <div key={oc.id} className="bg-card border border-border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{oc.name}</span>
                </div>
                <span className={`text-xs font-mono ${oc.is_active ? "text-success" : "text-muted-foreground"}`}>
                  {oc.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Router Config</p>
                <pre className="text-xs font-mono text-foreground">{JSON.stringify(oc.router_config, null, 2)}</pre>
              </div>
              <div className="bg-secondary/50 rounded-md p-3">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Retry Policy</p>
                <pre className="text-xs font-mono text-foreground">{JSON.stringify(oc.retry_policy, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
