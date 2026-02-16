import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  ArrowUpRight,
  Activity,
  Clock,
} from "lucide-react";

const stats = [
  {
    label: "Monthly Revenue",
    value: "$48,250",
    change: "+12.5%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    label: "Active Leads",
    value: "127",
    change: "+8",
    trend: "up" as const,
    icon: Users,
  },
  {
    label: "Open Orders",
    value: "34",
    change: "-3",
    trend: "down" as const,
    icon: ShoppingCart,
  },
  {
    label: "Cash Flow (30d)",
    value: "$22,180",
    change: "+5.2%",
    trend: "up" as const,
    icon: Activity,
  },
];

const recentEvents = [
  { type: "order_created", actor: "Sarah K.", detail: "Order #1042 — $1,250", time: "2m ago", badge: "info" as const },
  { type: "payment_received", actor: "System", detail: "Payment $850 confirmed", time: "8m ago", badge: "live" as const },
  { type: "message_received", actor: "Ahmed R.", detail: "WhatsApp — pricing inquiry", time: "15m ago", badge: "warning" as const },
  { type: "delivery_update", actor: "DHL", detail: "Order #1038 — delivered", time: "22m ago", badge: "live" as const },
  { type: "order_created", actor: "Maria L.", detail: "Order #1043 — $3,400", time: "35m ago", badge: "info" as const },
  { type: "message_received", actor: "James P.", detail: "Email — follow-up needed", time: "1h ago", badge: "warning" as const },
];

const badgeClass = {
  live: "kitz-badge-live",
  warning: "kitz-badge-warning",
  error: "kitz-badge-error",
  info: "kitz-badge-info",
};

const eventLabel: Record<string, string> = {
  order_created: "ORDER",
  payment_received: "PAYMENT",
  message_received: "MESSAGE",
  delivery_update: "DELIVERY",
};

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Command Center</h1>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">
          Real-time business overview — powered by xyz88.io agents
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="kitz-stat-card group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">{stat.value}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {stat.trend === "up" ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span
                className={`text-xs font-mono font-medium ${
                  stat.trend === "up" ? "text-success" : "text-destructive"
                }`}
              >
                {stat.change}
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">vs last period</span>
            </div>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Event Log */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Event Log</h2>
            <span className="text-[10px] font-mono text-muted-foreground">LIVE FEED</span>
          </div>
          <div className="divide-y divide-border">
            {recentEvents.map((event, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
                <span className={badgeClass[event.badge]}>
                  {eventLabel[event.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{event.detail}</p>
                  <p className="text-[11px] text-muted-foreground">{event.actor}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono shrink-0">
                  <Clock className="w-3 h-3" />
                  {event.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Activity */}
        <div className="bg-card border border-border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Agent Activity</h2>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="p-4 space-y-4">
            {[
              { name: "CRM Agent", tasks: 12, resolved: 9, status: "Qualifying lead — Ahmed R." },
              { name: "Follow Up Agent", tasks: 8, resolved: 7, status: "Tracking delivery #1038" },
              { name: "Support Agent", tasks: 5, resolved: 5, status: "Margin report generated" },
            ].map((agent) => (
              <div key={agent.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{agent.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {agent.resolved}/{agent.tasks}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(agent.resolved / agent.tasks) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">{agent.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
