import { useState, useEffect } from "react";
import {
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  Loader2,
  Mail,
  MessageSquare,
  Zap,
  Users,
  ArrowLeft,
  GripVertical,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

/* ─── Types ─── */
interface Campaign {
  id: string;
  business_id: string;
  name: string;
  status: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Step {
  id: string;
  campaign_id: string;
  business_id: string;
  step_order: number;
  delay_minutes: number;
  channel: string;
  subject: string | null;
  body: string;
  created_at: string;
}

interface Enrollment {
  id: string;
  campaign_id: string;
  contact_id: string;
  business_id: string;
  current_step: number;
  status: string;
  enrolled_at: string;
  next_step_at: string | null;
  completed_at: string | null;
}

/* ─── Channel config ─── */
const channelConfig: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  email: { label: "Email", icon: Mail, badge: "kitz-badge-info" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, badge: "kitz-badge-live" },
  internal: { label: "Internal", icon: Zap, badge: "kitz-badge-warning" },
};

const triggerLabels: Record<string, string> = {
  manual: "Manual Enrollment",
  contact_created: "New Contact Created",
  pipeline_change: "Pipeline Stage Change",
  api_event: "API Event",
};

/* ─── Delay helpers ─── */
function formatDelay(minutes: number): string {
  if (minutes === 0) return "Immediately";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function delayPresets() {
  return [
    { label: "Immediately", value: 0 },
    { label: "5 min", value: 5 },
    { label: "30 min", value: 30 },
    { label: "1 hour", value: 60 },
    { label: "4 hours", value: 240 },
    { label: "1 day", value: 1440 },
    { label: "3 days", value: 4320 },
    { label: "7 days", value: 10080 },
  ];
}

/* ════════════════════════════════════════════════════════════════ */
export default function CampaignsPage() {
  const { business } = useBusiness();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Load campaigns
  useEffect(() => {
    if (!business) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("drip_campaigns")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      setCampaigns((data as Campaign[]) || []);
      setLoading(false);
    };
    load();
  }, [business]);

  const createCampaign = async () => {
    if (!business) return;
    const { data, error } = await supabase
      .from("drip_campaigns")
      .insert({ business_id: business.id, name: "New Campaign" })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    const camp = data as Campaign;
    setCampaigns((prev) => [camp, ...prev]);
    setSelectedCampaign(camp);
    toast.success("Campaign created");
  };

  const toggleCampaign = async (c: Campaign) => {
    const newStatus = c.status === "active" ? "paused" : "active";
    const { error } = await supabase
      .from("drip_campaigns")
      .update({ status: newStatus })
      .eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    setCampaigns((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: newStatus } : x)));
    if (selectedCampaign?.id === c.id) setSelectedCampaign({ ...c, status: newStatus });
    toast.success(newStatus === "active" ? "Campaign activated" : "Campaign paused");
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from("drip_campaigns").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setCampaigns((prev) => prev.filter((x) => x.id !== id));
    if (selectedCampaign?.id === id) setSelectedCampaign(null);
    toast.success("Campaign deleted");
  };

  if (selectedCampaign) {
    return (
      <CampaignEditor
        campaign={selectedCampaign}
        onBack={() => setSelectedCampaign(null)}
        onUpdate={(updated) => {
          setCampaigns((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          setSelectedCampaign(updated);
        }}
        onToggle={() => toggleCampaign(selectedCampaign)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Drip Campaigns</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            Automated multi-step sequences
          </p>
        </div>
        <button
          onClick={createCampaign}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 bg-card border border-border rounded-md">
          <Mail className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No campaigns yet.</p>
          <button
            onClick={createCampaign}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            Create your first campaign
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-md hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => setSelectedCampaign(c)}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  c.status === "active" ? "bg-success animate-pulse" : c.status === "paused" ? "bg-warning" : "bg-muted-foreground/40"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                  {triggerLabels[c.trigger_type] || c.trigger_type} • {c.status.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); toggleCampaign(c); }}
                  className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                    c.status === "active"
                      ? "bg-success/15 text-success hover:bg-success/25"
                      : "bg-muted text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {c.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }}
                  className="w-7 h-7 rounded flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
/* Campaign Editor */
/* ════════════════════════════════════════════════════════════════ */
function CampaignEditor({
  campaign,
  onBack,
  onUpdate,
  onToggle,
}: {
  campaign: Campaign;
  onBack: () => void;
  onUpdate: (c: Campaign) => void;
  onToggle: () => void;
}) {
  const { business } = useBusiness();
  const [name, setName] = useState(campaign.name);
  const [triggerType, setTriggerType] = useState(campaign.trigger_type);
  const [triggerStage, setTriggerStage] = useState((campaign.trigger_config as Record<string, string>)?.stage || "");
  const [triggerEvent, setTriggerEvent] = useState((campaign.trigger_config as Record<string, string>)?.event_type || "");
  const [steps, setSteps] = useState<Step[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingSteps(true);
      const [stepsRes, enrollRes] = await Promise.all([
        supabase
          .from("drip_steps")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("step_order", { ascending: true }),
        supabase
          .from("drip_enrollments")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("enrolled_at", { ascending: false })
          .limit(50),
      ]);
      setSteps((stepsRes.data as Step[]) || []);
      setEnrollments((enrollRes.data as Enrollment[]) || []);
      setLoadingSteps(false);
    };
    load();
  }, [campaign.id]);

  const saveCampaign = async () => {
    setSaving(true);
    const triggerConfig: Record<string, string> = {};
    if (triggerType === "pipeline_change" && triggerStage) triggerConfig.stage = triggerStage;
    if (triggerType === "api_event" && triggerEvent) triggerConfig.event_type = triggerEvent;

    const { data, error } = await supabase
      .from("drip_campaigns")
      .update({ name, trigger_type: triggerType, trigger_config: triggerConfig })
      .eq("id", campaign.id)
      .select()
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    onUpdate(data as Campaign);
    toast.success("Campaign saved");
    setSaving(false);
  };

  const addStep = async () => {
    if (!business) return;
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.step_order)) + 1 : 1;
    const { data, error } = await supabase
      .from("drip_steps")
      .insert({
        campaign_id: campaign.id,
        business_id: business.id,
        step_order: nextOrder,
        delay_minutes: nextOrder === 1 ? 0 : 1440,
        channel: "internal",
        body: "",
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setSteps((prev) => [...prev, data as Step]);
  };

  const updateStep = async (stepId: string, updates: Partial<Step>) => {
    const { error } = await supabase.from("drip_steps").update(updates).eq("id", stepId);
    if (error) { toast.error(error.message); return; }
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s)));
  };

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase.from("drip_steps").delete().eq("id", stepId);
    if (error) { toast.error(error.message); return; }
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
  };

  const activeEnrollments = enrollments.filter((e) => e.status === "active").length;
  const completedEnrollments = enrollments.filter((e) => e.status === "completed").length;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold text-foreground bg-transparent border-none outline-none w-full"
            placeholder="Campaign name..."
          />
          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
            {campaign.status.toUpperCase()} • {steps.length} steps • {enrollments.length} enrollments
          </p>
        </div>
        <button
          onClick={onToggle}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            campaign.status === "active"
              ? "bg-warning/15 text-warning hover:bg-warning/25"
              : "bg-success/15 text-success hover:bg-success/25"
          }`}
        >
          {campaign.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {campaign.status === "active" ? "Pause" : "Activate"}
        </button>
        <button
          onClick={saveCampaign}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Save
        </button>
      </div>

      {/* Config + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Trigger Config */}
        <div className="md:col-span-2 bg-card border border-border rounded-md p-4 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Trigger</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(triggerLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTriggerType(key)}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                  triggerType === key
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {triggerType === "pipeline_change" && (
            <input
              value={triggerStage}
              onChange={(e) => setTriggerStage(e.target.value)}
              placeholder="Pipeline stage (e.g. qualified)"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
            />
          )}
          {triggerType === "api_event" && (
            <input
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              placeholder="Event type (e.g. signup)"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
            />
          )}
        </div>

        {/* Stats */}
        <div className="bg-card border border-border rounded-md p-4 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Enrollments</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active</span>
              <span className="text-sm font-mono font-bold text-success">{activeEnrollments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Completed</span>
              <span className="text-sm font-mono font-bold text-foreground">{completedEnrollments}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-sm font-mono font-bold text-foreground">{enrollments.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-card border border-border rounded-md">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Steps</h3>
          <button
            onClick={addStep}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Step
          </button>
        </div>

        {loadingSteps ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : steps.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">No steps yet. Add your first step to build the sequence.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {steps.map((step, idx) => {
              const ch = channelConfig[step.channel] || channelConfig.internal;
              const ChIcon = ch.icon;
              return (
                <div key={step.id} className="px-4 py-3 space-y-2">
                  {/* Step header */}
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                    <span className="text-[10px] font-mono text-muted-foreground w-6">#{step.step_order}</span>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <select
                        value={step.delay_minutes}
                        onChange={(e) => updateStep(step.id, { delay_minutes: Number(e.target.value) })}
                        className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground outline-none"
                      >
                        {delayPresets().map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      <ChIcon className="w-3 h-3 text-muted-foreground" />
                      <select
                        value={step.channel}
                        onChange={(e) => updateStep(step.id, { channel: e.target.value })}
                        className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground outline-none"
                      >
                        <option value="internal">Internal</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                    <div className="flex-1" />
                    <button
                      onClick={() => deleteStep(step.id)}
                      className="w-6 h-6 rounded flex items-center justify-center text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subject (email only) */}
                  {step.channel === "email" && (
                    <input
                      value={step.subject || ""}
                      onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                      placeholder="Email subject..."
                      className="w-full px-3 py-1.5 bg-secondary border border-border rounded text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40"
                    />
                  )}

                  {/* Body */}
                  <textarea
                    value={step.body}
                    onChange={(e) => updateStep(step.id, { body: e.target.value })}
                    placeholder="Message body..."
                    rows={2}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/40 resize-none"
                  />

                  {/* Visual connector */}
                  {idx < steps.length - 1 && (
                    <div className="flex items-center gap-2 pl-8 pt-1">
                      <div className="w-px h-4 bg-border" />
                      <span className="text-[9px] font-mono text-muted-foreground">
                        then wait {formatDelay(steps[idx + 1]?.delay_minutes || 0)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
