import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import { Settings, Github, Bot, Cpu, Save, Loader2, Plus, Trash2, Power, Key, Eye, EyeOff, Copy, Check, Sparkles } from "lucide-react";

const LLM_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", tier: "Fast" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro", tier: "Premium" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "Premium" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "Balanced" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", tier: "Economy" },
  { value: "openai/gpt-5", label: "GPT-5", tier: "Premium" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", tier: "Balanced" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano", tier: "Economy" },
  { value: "openai/gpt-5.2", label: "GPT-5.2", tier: "Premium" },
];

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

interface ApiKey {
  id: string;
  service_name: string;
  key_label: string;
  key_value: string;
  category: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
}

const API_CATEGORIES = [
  { value: "llm", label: "LLM / AI" },
  { value: "messaging", label: "Messaging" },
  { value: "ads", label: "Ads & Marketing" },
  { value: "payments", label: "Payments" },
  { value: "analytics", label: "Analytics" },
  { value: "general", label: "General" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const { business, updateBusiness } = useBusiness();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [githubIntegrations, setGithubIntegrations] = useState<GithubIntegration[]>([]);
  const [openclawConfigs, setOpenclawConfigs] = useState<OpenClawConfig[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"general" | "agents" | "github" | "openclaw" | "apikeys">("general");

  // API Keys form state
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState({ service_name: "", key_label: "", key_value: "", category: "general", notes: "" });
  const [savingKey, setSavingKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (business) {
      setBusinessName(business.name);
      loadAll();
    }
  }, [business]);

  const loadAll = async () => {
    if (!business) return;
    const [agentsRes, githubRes, openclawRes, apiKeysRes] = await Promise.all([
      supabase.from("agent_configurations").select("*").eq("business_id", business.id),
      supabase.from("github_integrations").select("*").eq("business_id", business.id),
      supabase.from("openclaw_configs").select("*").eq("business_id", business.id),
      supabase.from("api_keys").select("*").eq("business_id", business.id).order("created_at", { ascending: false }),
    ]);
    if (agentsRes.data) setAgents(agentsRes.data as AgentConfig[]);
    if (githubRes.data) setGithubIntegrations(githubRes.data as GithubIntegration[]);
    if (openclawRes.data) setOpenclawConfigs(openclawRes.data as OpenClawConfig[]);
    if (apiKeysRes.data) setApiKeys(apiKeysRes.data as ApiKey[]);
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

  const handleUpdateAgent = async (id: string, updates: Partial<AgentConfig>) => {
    const { error } = await supabase.from("agent_configurations").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Agent updated" });
      loadAll();
    }
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

  // API Key handlers
  const handleAddApiKey = async () => {
    if (!business || !newKey.service_name.trim() || !newKey.key_label.trim() || !newKey.key_value.trim()) {
      toast({ title: "Missing fields", description: "Service name, label, and key value are required.", variant: "destructive" });
      return;
    }
    setSavingKey(true);
    const { error } = await supabase.from("api_keys").insert({
      business_id: business.id,
      service_name: newKey.service_name.trim(),
      key_label: newKey.key_label.trim(),
      key_value: newKey.key_value.trim(),
      category: newKey.category,
      notes: newKey.notes.trim() || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "API key added" });
      setNewKey({ service_name: "", key_label: "", key_value: "", category: "general", notes: "" });
      setShowAddKey(false);
      loadAll();
    }
    setSavingKey(false);
  };

  const handleToggleApiKey = async (id: string, isActive: boolean) => {
    await supabase.from("api_keys").update({ is_active: !isActive }).eq("id", id);
    loadAll();
  };

  const handleDeleteApiKey = async (id: string) => {
    await supabase.from("api_keys").delete().eq("id", id);
    toast({ title: "API key deleted" });
    loadAll();
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyKey = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const maskKey = (value: string) => {
    if (value.length <= 8) return "••••••••";
    return value.slice(0, 4) + "••••••••" + value.slice(-4);
  };

  const tabs = [
    { key: "general", label: "General", icon: Settings },
    { key: "agents", label: "Agents", icon: Bot },
    { key: "apikeys", label: "API Keys", icon: Key },
    { key: "github", label: "GitHub", icon: Github },
    { key: "openclaw", label: "OpenClaw", icon: Cpu },
  ] as const;

  const missingAgents = (["crm", "followup", "support"] as const).filter(
    (t) => !agents.some((a) => a.agent_type === t)
  );

  const groupedKeys = API_CATEGORIES.map((cat) => ({
    ...cat,
    keys: apiKeys.filter((k) => k.category === cat.value),
  })).filter((g) => g.keys.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        <p className="text-xs font-mono text-muted-foreground">Configure your business hub, agents, and integrations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-px overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md transition-colors whitespace-nowrap ${
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
                  <span className={`text-[10px] font-mono ${agent.is_active ? "text-success" : "text-muted-foreground"}`}>
                    {agent.is_active ? "● Active" : "○ Inactive"}
                  </span>
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

              {/* Model selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> LLM Model
                </label>
                <select
                  value={agent.model}
                  onChange={(e) => handleUpdateAgent(agent.id, { model: e.target.value })}
                  className="w-full max-w-md px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {LLM_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} — {m.tier}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {LLM_MODELS.find((m) => m.value === agent.model)?.tier || "Custom"} tier · {agent.model}
                </p>
              </div>

              {/* System prompt */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">System Prompt</label>
                <textarea
                  value={agent.system_prompt || ""}
                  onChange={(e) => {
                    setAgents((prev) => prev.map((a) => a.id === agent.id ? { ...a, system_prompt: e.target.value } : a));
                  }}
                  onBlur={(e) => handleUpdateAgent(agent.id, { system_prompt: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="Define this agent's behavior and personality..."
                />
              </div>
            </div>
          ))}
          {agents.length === 0 && missingAgents.length === 0 && (
            <p className="text-sm text-muted-foreground">All agents configured.</p>
          )}
        </div>
      )}

      {/* API Keys */}
      {tab === "apikeys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Store API keys for LLMs, WhatsApp, Meta Ads, payment providers, and more.</p>
            </div>
            <button
              onClick={() => setShowAddKey(true)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Key
            </button>
          </div>

          {/* Add key form */}
          {showAddKey && (
            <div className="bg-card border border-primary/20 rounded-md p-4 space-y-3">
              <p className="text-xs font-mono text-primary uppercase tracking-wider">New API Key</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Service Name</label>
                  <input
                    type="text"
                    value={newKey.service_name}
                    onChange={(e) => setNewKey({ ...newKey, service_name: e.target.value })}
                    placeholder="e.g. OpenAI, Meta, WhatsApp"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Key Label</label>
                  <input
                    type="text"
                    value={newKey.key_label}
                    onChange={(e) => setNewKey({ ...newKey, key_label: e.target.value })}
                    placeholder="e.g. Production API Key"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">API Key / Secret</label>
                <input
                  type="password"
                  value={newKey.key_value}
                  onChange={(e) => setNewKey({ ...newKey, key_value: e.target.value })}
                  placeholder="sk-••••••••••••"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Category</label>
                  <select
                    value={newKey.category}
                    onChange={(e) => setNewKey({ ...newKey, category: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {API_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Notes (optional)</label>
                  <input
                    type="text"
                    value={newKey.notes}
                    onChange={(e) => setNewKey({ ...newKey, notes: e.target.value })}
                    placeholder="e.g. Expires Dec 2026"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAddApiKey}
                  disabled={savingKey}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Save Key
                </button>
                <button
                  onClick={() => { setShowAddKey(false); setNewKey({ service_name: "", key_label: "", key_value: "", category: "general", notes: "" }); }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Grouped keys */}
          {groupedKeys.length > 0 ? (
            groupedKeys.map((group) => (
              <div key={group.value} className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground px-1">{group.label}</p>
                {group.keys.map((apiKey) => (
                  <div key={apiKey.id} className="bg-card border border-border rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Key className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">{apiKey.service_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{apiKey.key_label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title={visibleKeys.has(apiKey.id) ? "Hide key" : "Show key"}
                        >
                          {visibleKeys.has(apiKey.id) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleCopyKey(apiKey.id, apiKey.key_value)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Copy key"
                        >
                          {copiedId === apiKey.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleToggleApiKey(apiKey.id, apiKey.is_active)}
                          className={`p-1.5 rounded-md transition-colors ${apiKey.is_active ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary"}`}
                          title={apiKey.is_active ? "Disable" : "Enable"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteApiKey(apiKey.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded flex-1 truncate">
                        {visibleKeys.has(apiKey.id) ? apiKey.key_value : maskKey(apiKey.key_value)}
                      </code>
                    </div>
                    {apiKey.notes && (
                      <p className="text-[10px] text-muted-foreground mt-2">{apiKey.notes}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-[10px] font-mono ${apiKey.is_active ? "text-success" : "text-muted-foreground"}`}>
                        {apiKey.is_active ? "● Active" : "○ Disabled"}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        · Added {new Date(apiKey.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ))
          ) : !showAddKey ? (
            <div className="bg-card border border-border rounded-md p-8 text-center">
              <Key className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">No API keys yet</p>
              <p className="text-xs text-muted-foreground mb-4">Add keys for services like OpenAI, Meta, WhatsApp Business, Stripe, and more.</p>
              <button
                onClick={() => setShowAddKey(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Add Your First Key
              </button>
            </div>
          ) : null}
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
