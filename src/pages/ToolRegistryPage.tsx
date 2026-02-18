import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Plus, Trash2, Shield, ShieldAlert, ShieldCheck, ShieldX,
  ToggleLeft, ToggleRight, Loader2, Activity
} from "lucide-react";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  risk_level: string;
  max_calls_per_minute: number;
  data_scope: string[];
  is_verified: boolean;
  is_active: boolean;
  total_invocations: number;
  created_at: string;
}

const RISK_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string }> = {
  low: { icon: ShieldCheck, color: "text-success", bg: "bg-success/10" },
  medium: { icon: Shield, color: "text-warning", bg: "bg-warning/10" },
  high: { icon: ShieldAlert, color: "text-destructive", bg: "bg-destructive/10" },
  critical: { icon: ShieldX, color: "text-destructive", bg: "bg-destructive/20" },
};

export default function ToolRegistryPage() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", risk_level: "low", max_calls_per_minute: 60, data_scope: "" });

  const loadTools = async () => {
    if (!business) return;
    const { data } = await supabase.from("tool_registry").select("*").eq("business_id", business.id).order("created_at", { ascending: false });
    setTools((data as Tool[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (business) loadTools(); }, [business]);

  const handleAdd = async () => {
    if (!business || !form.name.trim()) return;
    const { error } = await supabase.from("tool_registry").insert({
      business_id: business.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      risk_level: form.risk_level,
      max_calls_per_minute: form.max_calls_per_minute,
      data_scope: form.data_scope ? form.data_scope.split(",").map(s => s.trim()) : [],
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Tool registered" });
    setForm({ name: "", description: "", risk_level: "low", max_calls_per_minute: 60, data_scope: "" });
    setShowAdd(false);
    loadTools();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await supabase.from("tool_registry").update({ is_active: !isActive }).eq("id", id);
    loadTools();
  };

  const handleVerify = async (id: string, isVerified: boolean) => {
    await supabase.from("tool_registry").update({ is_verified: !isVerified }).eq("id", id);
    loadTools();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tool_registry").delete().eq("id", id);
    loadTools();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" /> Tool Registry
          </h1>
          <p className="text-xs font-mono text-muted-foreground">Verified tools only · Risk tagged · Scoped access</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Register Tool
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-md p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="e.g. send_email" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Risk Level</label>
              <select value={form.risk_level} onChange={e => setForm({ ...form, risk_level: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="What this tool does" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Max Calls/min</label>
              <input type="number" value={form.max_calls_per_minute} onChange={e => setForm({ ...form, max_calls_per_minute: parseInt(e.target.value) || 60 })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Data Scope (comma-sep)</label>
              <input value={form.data_scope} onChange={e => setForm({ ...form, data_scope: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" placeholder="contacts.read, orders.read" />
            </div>
          </div>
          <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      )}

      {/* Tools list */}
      <div className="space-y-3">
        {tools.map(tool => {
          const risk = RISK_CONFIG[tool.risk_level] || RISK_CONFIG.low;
          const RiskIcon = risk.icon;
          return (
            <div key={tool.id} className="bg-card border border-border rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`p-1 rounded ${risk.bg}`}><RiskIcon className={`w-4 h-4 ${risk.color}`} /></span>
                  <span className="text-sm font-medium font-mono text-foreground">{tool.name}</span>
                  <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${risk.bg} ${risk.color}`}>{tool.risk_level}</span>
                  {tool.is_verified && <span className="kitz-badge-live text-[10px]">VERIFIED</span>}
                  {!tool.is_active && <span className="kitz-badge-error text-[10px]">DISABLED</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleVerify(tool.id, tool.is_verified)} className={`p-1.5 rounded-md text-xs font-mono transition-colors ${tool.is_verified ? "text-success hover:bg-success/10" : "text-muted-foreground hover:bg-secondary"}`} title={tool.is_verified ? "Revoke verification" : "Verify tool"}>
                    <ShieldCheck className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleToggle(tool.id, tool.is_active)} className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary transition-colors">
                    {tool.is_active ? <ToggleRight className="w-4 h-4 text-success" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(tool.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {tool.description && <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>}
              <div className="flex flex-wrap gap-3 text-[11px] font-mono text-muted-foreground">
                <span>Rate: {tool.max_calls_per_minute}/min</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {tool.total_invocations} calls</span>
                {(tool.data_scope as string[])?.length > 0 && <span>Scope: {(tool.data_scope as string[]).join(", ")}</span>}
              </div>
            </div>
          );
        })}
        {tools.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tools registered. Add one to get started.</p>}
      </div>
    </div>
  );
}
