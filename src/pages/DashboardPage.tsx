import { useState, useEffect, useRef, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Activity,
  Clock,
  ArrowUpRight,
  Plus,
  UserPlus,
  Package,
  Zap,
  Play,
  Pause,
  Bot,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type EventLog = Tables<"event_logs">;
type AgentConfig = Tables<"agent_configurations">;

/* ─── Swipeable Section (mobile cards) ─── */
function SwipeableCards({ children }: { children: React.ReactNode[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveIdx(idx);
  }, []);

  const scrollTo = (idx: number) => {
    scrollRef.current?.scrollTo({ left: idx * (scrollRef.current?.offsetWidth || 0), behavior: "smooth" });
  };

  return (
    <div className="lg:hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide -mx-4 px-4 gap-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {children.map((child, i) => (
          <div key={i} className="snap-center shrink-0 w-[85vw] max-w-sm">
            {child}
          </div>
        ))}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {children.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollTo(i)}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === activeIdx ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <div className="kitz-stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <div className="h-8 mt-1 flex items-center">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <p className="text-2xl font-bold font-mono text-foreground mt-1">{value}</p>
          )}
        </div>
        <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      {!loading && (
        <div className="flex items-center gap-1 mt-2">
          {trend === "up" && <TrendingUp className="w-3 h-3 text-success" />}
          {trend === "down" && <TrendingDown className="w-3 h-3 text-destructive" />}
          {trend === "neutral" && <Activity className="w-3 h-3 text-muted-foreground" />}
          <span
            className={`text-xs font-mono font-medium ${
              trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            {change}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Format helpers ─── */
function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const eventLabel: Record<string, { text: string; badge: string }> = {
  order_created: { text: "ORDER", badge: "kitz-badge-info" },
  payment_received: { text: "PAYMENT", badge: "kitz-badge-live" },
  message_received: { text: "MESSAGE", badge: "kitz-badge-warning" },
  delivery_update: { text: "DELIVERY", badge: "kitz-badge-live" },
  contact_created: { text: "LEAD", badge: "kitz-badge-info" },
  agent_action: { text: "AGENT", badge: "kitz-badge-info" },
};

export default function DashboardPage() {
  const { business } = useBusiness();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    leads: 0,
    openOrders: 0,
    deliveredOrders: 0,
  });
  const [events, setEvents] = useState<EventLog[]>([]);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [togglingAgent, setTogglingAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;

    const load = async () => {
      setLoading(true);

      const [contactsRes, ordersRes, eventsRes, agentsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, total_revenue, pipeline_stage")
          .eq("business_id", business.id),
        supabase
          .from("orders")
          .select("id, total, status, payment_status")
          .eq("business_id", business.id),
        supabase
          .from("event_logs")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("agent_configurations")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: true }),
      ]);

      const contacts = contactsRes.data || [];
      const orders = ordersRes.data || [];

      const revenue = contacts.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
      const activeLeads = contacts.filter(
        (c) => c.pipeline_stage && !["closed"].includes(c.pipeline_stage)
      ).length;
      const openOrders = orders.filter(
        (o) => o.status && !["delivered", "cancelled"].includes(o.status)
      ).length;
      const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

      setMetrics({ revenue, leads: activeLeads, openOrders, deliveredOrders });
      setEvents(eventsRes.data || []);
      setAgents(agentsRes.data || []);
      setLoading(false);
    };

    load();

    // Realtime subscriptions
    const channel = supabase
      .channel(`dashboard-${business.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_logs", filter: `business_id=eq.${business.id}` },
        () => {
          // Refetch events on any change
          supabase
            .from("event_logs")
            .select("*")
            .eq("business_id", business.id)
            .order("created_at", { ascending: false })
            .limit(20)
            .then(({ data }) => { if (data) setEvents(data); });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `business_id=eq.${business.id}` },
        () => {
          supabase
            .from("contacts")
            .select("id, total_revenue, pipeline_stage")
            .eq("business_id", business.id)
            .then(({ data }) => {
              if (data) {
                const revenue = data.reduce((sum, c) => sum + Number(c.total_revenue || 0), 0);
                const leads = data.filter((c) => c.pipeline_stage && !["closed"].includes(c.pipeline_stage)).length;
                setMetrics((prev) => ({ ...prev, revenue, leads }));
              }
            });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `business_id=eq.${business.id}` },
        () => {
          supabase
            .from("orders")
            .select("id, total, status, payment_status")
            .eq("business_id", business.id)
            .then(({ data }) => {
              if (data) {
                const openOrders = data.filter((o) => o.status && !["delivered", "cancelled"].includes(o.status)).length;
                const deliveredOrders = data.filter((o) => o.status === "delivered").length;
                setMetrics((prev) => ({ ...prev, openOrders, deliveredOrders }));
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [business]);

  const toggleAgent = async (agent: AgentConfig) => {
    setTogglingAgent(agent.id);
    const { data, error } = await supabase
      .from("agent_configurations")
      .update({ is_active: !agent.is_active })
      .eq("id", agent.id)
      .select()
      .maybeSingle();
    if (!error && data) {
      setAgents((prev) => prev.map((a) => (a.id === data.id ? (data as AgentConfig) : a)));
    }
    setTogglingAgent(null);
  };

  /* ─── Quick Actions ─── */
  const quickActions = [
    { label: "New Contact", icon: UserPlus, action: () => navigate("/crm") },
    { label: "New Order", icon: Package, action: () => navigate("/orders") },
    { label: "Inbox", icon: Zap, action: () => navigate("/inbox") },
    { label: "Insights", icon: Activity, action: () => navigate("/insights") },
  ];

  /* ─── KPI cards data ─── */
  const kpis = [
    {
      label: "Total Revenue",
      value: `$${metrics.revenue.toLocaleString()}`,
      change: `${metrics.leads} leads`,
      trend: "up" as const,
      icon: DollarSign,
    },
    {
      label: "Active Leads",
      value: metrics.leads.toString(),
      change: "in pipeline",
      trend: "neutral" as const,
      icon: Users,
    },
    {
      label: "Open Orders",
      value: metrics.openOrders.toString(),
      change: `${metrics.deliveredOrders} delivered`,
      trend: metrics.openOrders > 0 ? "up" as const : "neutral" as const,
      icon: ShoppingCart,
    },
    {
      label: "Delivered",
      value: metrics.deliveredOrders.toString(),
      change: "completed",
      trend: "up" as const,
      icon: Activity,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Command Center</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {business?.name || "—"} • Admin
          </p>
        </div>
        <span className="kitz-badge-live text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
          LIVE
        </span>
      </div>

      {/* Quick Actions — always visible, thumb-friendly */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={qa.action}
            className="flex flex-col items-center gap-1.5 py-3 px-2 bg-card border border-border rounded-md hover:border-primary/40 hover:bg-secondary/50 transition-all active:scale-95"
          >
            <qa.icon className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-mono text-muted-foreground leading-tight text-center">
              {qa.label}
            </span>
          </button>
        ))}
      </div>

      {/* KPI Cards — swipeable on mobile, grid on desktop */}
      <SwipeableCards>
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} loading={loading} />
        ))}
      </SwipeableCards>

      {/* Desktop KPI grid (hidden on mobile) */}
      <div className="hidden lg:grid grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Main content — two columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Event Feed */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Event Feed</h2>
            <span className="text-[10px] font-mono text-muted-foreground">
              {events.length > 0 ? "LIVE" : "NO EVENTS"}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No events yet. Activity will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {events.map((event) => {
                const config = eventLabel[event.event_type] || { text: event.event_type.toUpperCase(), badge: "kitz-badge-info" };
                const payload = event.payload as Record<string, unknown> | null;
                const detail = (payload?.detail as string) || (payload?.message as string) || event.event_type;
                const actor = (event.actor_type ? `${event.actor_type}` : "") + (event.actor_id ? ` ${event.actor_id}` : "");

                return (
                  <div key={event.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                    <span className={config.badge}>
                      {config.text}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{detail}</p>
                      {actor && <p className="text-[11px] text-muted-foreground truncate">{actor}</p>}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(event.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Agent Controls */}
        <div className="bg-card border border-border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Agents</h2>
            <button
              onClick={() => navigate("/settings")}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-8 px-4">
              <Bot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No agents configured yet.</p>
              <button
                onClick={() => navigate("/settings")}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3 h-3" />
                Add Agent
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-secondary/40 border border-border/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          agent.is_active ? "bg-success animate-pulse-glow" : "bg-muted-foreground/40"
                        }`}
                      />
                      <span className="text-sm font-medium text-foreground truncate">{agent.name}</span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5 ml-4">
                      {agent.agent_type} • {agent.model?.split("/").pop() || "default"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleAgent(agent)}
                    disabled={togglingAgent === agent.id}
                    className={`shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
                      agent.is_active
                        ? "bg-success/15 text-success hover:bg-success/25"
                        : "bg-muted text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {togglingAgent === agent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : agent.is_active ? (
                      <Pause className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
