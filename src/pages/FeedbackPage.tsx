import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MessageSquareWarning, ThumbsUp, ThumbsDown, Minus, Plus, CheckCircle2, Clock,
  AlertTriangle, TrendingDown, Filter, BarChart3
} from "lucide-react";

const SOURCES = ["in-app", "support", "whatsapp", "churn", "feature-request", "usage-drop", "sales-objection", "refund", "online-mention", "internal", "manual"];
const CATEGORIES = ["activation_friction", "retention_friction", "pricing_resistance", "feature_gap", "ux_confusion", "trust_concern", "performance_complaint", "security_fear", "general"];
const SENTIMENTS = ["positive", "neutral", "negative"];
const PRIORITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["new", "investigating", "fix_planned", "in_progress", "resolved", "wont_fix"];
const FIX_TYPES = ["immediate", "short_term", "long_term"];

const categoryLabels: Record<string, string> = {
  activation_friction: "Activation Friction",
  retention_friction: "Retention Friction",
  pricing_resistance: "Pricing Resistance",
  feature_gap: "Feature Gap",
  ux_confusion: "UX Confusion",
  trust_concern: "Trust Concern",
  performance_complaint: "Performance",
  security_fear: "Security Fear",
  general: "General",
};

const sentimentIcon = (s: string) => {
  if (s === "positive") return <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (s === "negative") return <ThumbsDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
};

const priorityColor = (p: string) => {
  if (p === "critical") return "destructive";
  if (p === "high") return "default";
  return "secondary" as const;
};

export default function FeedbackPage() {
  const { business } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    source: "manual", category: "general", sentiment: "neutral",
    title: "", content: "", priority: "medium", fix_type: "",
  });

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["feedback", businessId, filterCategory, filterStatus],
    queryFn: async () => {
      if (!businessId) return [];
      let q = supabase.from("feedback").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(200);
      if (filterCategory !== "all") q = q.eq("category", filterCategory);
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!businessId || !form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("feedback").insert({
        business_id: businessId,
        source: form.source,
        category: form.category,
        sentiment: form.sentiment,
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        fix_type: form.fix_type || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      setForm({ source: "manual", category: "general", sentiment: "neutral", title: "", content: "", priority: "medium", fix_type: "" });
      setDialogOpen(false);
      toast.success("Feedback recorded");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "resolved") updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("feedback").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Status updated");
    },
  });

  // Dashboard stats
  const totalNew = feedback.filter(f => f.status === "new").length;
  const totalNeg = feedback.filter(f => f.sentiment === "negative").length;
  const totalPos = feedback.filter(f => f.sentiment === "positive").length;
  const totalResolved = feedback.filter(f => f.status === "resolved").length;

  // Top friction categories
  const catCounts = feedback.reduce((acc, f) => {
    if (f.sentiment === "negative" || f.priority === "critical" || f.priority === "high") {
      acc[f.category] = (acc[f.category] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);
  const topFriction = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 3);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-primary" />
            Feedback Loop
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-1">Listen fast. Fix fast. Ship fast.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Feedback</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-mono">Record Feedback</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              <Textarea placeholder="Details..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s.replace(/-/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.sentiment} onValueChange={v => setForm(f => ({ ...f, sentiment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENTIMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Select value={form.fix_type} onValueChange={v => setForm(f => ({ ...f, fix_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Fix type (optional)" /></SelectTrigger>
                <SelectContent>{FIX_TYPES.map(f => <SelectItem key={f} value={f}>{f === "immediate" ? "Immediate (7d)" : f === "short_term" ? "Short-term (30d)" : "Long-term"}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} className="w-full">
                {addMutation.isPending ? "Saving..." : "Save Feedback"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border"><CardContent className="p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <div className="text-2xl font-bold font-mono text-foreground">{totalNew}</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">New</div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 text-center">
          <ThumbsDown className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <div className="text-2xl font-bold font-mono text-foreground">{totalNeg}</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">Complaints</div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 text-center">
          <ThumbsUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <div className="text-2xl font-bold font-mono text-foreground">{totalPos}</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">Praises</div>
        </CardContent></Card>
        <Card className="border-border"><CardContent className="p-4 text-center">
          <CheckCircle2 className="w-5 h-5 text-primary mx-auto mb-1" />
          <div className="text-2xl font-bold font-mono text-foreground">{totalResolved}</div>
          <div className="text-[10px] text-muted-foreground font-mono uppercase">Resolved</div>
        </CardContent></Card>
      </div>

      {/* Top Friction */}
      {topFriction.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-mono flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" /> Top Friction Areas</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {topFriction.map(([cat, count]) => (
              <Badge key={cat} variant="outline" className="font-mono text-xs">
                {categoryLabels[cat] || cat}: {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{categoryLabels[c] || c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Feedback List */}
      <div className="space-y-2">
        {isLoading && <p className="text-xs text-muted-foreground font-mono">Loading...</p>}
        {!isLoading && feedback.length === 0 && (
          <Card className="border-border"><CardContent className="p-8 text-center text-muted-foreground text-sm font-mono">
            No feedback yet. Start collecting user insights.
          </CardContent></Card>
        )}
        {feedback.map(f => (
          <Card key={f.id} className="border-border hover:border-primary/30 transition-colors">
            <CardContent className="p-3 flex items-start gap-3">
              <div className="pt-0.5">{sentimentIcon(f.sentiment)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-foreground">{f.title}</span>
                  <Badge variant={priorityColor(f.priority)} className="text-[10px] h-4">{f.priority}</Badge>
                  <Badge variant="outline" className="text-[10px] h-4">{categoryLabels[f.category] || f.category}</Badge>
                  <Badge variant="outline" className="text-[10px] h-4">{f.source}</Badge>
                </div>
                {f.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.content}</p>}
                {f.resolution_notes && <p className="text-xs text-emerald-600 mt-1">✓ {f.resolution_notes}</p>}
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {new Date(f.created_at).toLocaleDateString()}
                  {f.fix_type && ` · ${f.fix_type.replace(/_/g, " ")} fix`}
                </div>
              </div>
              <Select value={f.status} onValueChange={v => updateStatus.mutate({ id: f.id, status: v })}>
                <SelectTrigger className="w-28 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
