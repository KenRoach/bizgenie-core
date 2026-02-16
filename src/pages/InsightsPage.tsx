import { TrendingUp, TrendingDown, ArrowUpRight, DollarSign, Percent, BarChart3 } from "lucide-react";

const kpis = [
  { label: "Gross Margin", value: "42.3%", change: "+1.8%", trend: "up" as const, icon: Percent },
  { label: "Revenue (MTD)", value: "$48,250", change: "+12.5%", trend: "up" as const, icon: DollarSign },
  { label: "Avg Order Value", value: "$2,840", change: "+$320", trend: "up" as const, icon: BarChart3 },
  { label: "Outstanding AR", value: "$6,200", change: "-$1,400", trend: "down" as const, icon: DollarSign },
];

const revenueByChannel = [
  { channel: "WhatsApp", revenue: "$22,400", pct: 46 },
  { channel: "Web", revenue: "$14,200", pct: 29 },
  { channel: "Email", revenue: "$8,100", pct: 17 },
  { channel: "Instagram", revenue: "$3,550", pct: 8 },
];

const alerts = [
  { severity: "warning" as const, message: "Cash flow projected negative in 14 days if AR not collected", action: "Review AR" },
  { severity: "info" as const, message: "Premium Bundle margin increased 3.2% after price adjustment", action: "View details" },
  { severity: "warning" as const, message: "2 invoices overdue by 7+ days — auto-reminder scheduled", action: "View invoices" },
];

const severityClass = {
  warning: "border-l-warning",
  info: "border-l-info",
  error: "border-l-destructive",
};

export default function InsightsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-foreground">CFO Insights</h1>
        <p className="text-xs font-mono text-muted-foreground">Financial health + margin intelligence</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kitz-stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">{kpi.value}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                <kpi.icon className="w-4 h-4 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {kpi.trend === "up" ? (
                <TrendingUp className="w-3 h-3 text-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-destructive" />
              )}
              <span className={`text-xs font-mono font-medium ${kpi.trend === "up" ? "text-success" : "text-destructive"}`}>
                {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue by channel */}
        <div className="bg-card border border-border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">Revenue by Channel</h2>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="p-4 space-y-3">
            {revenueByChannel.map((ch) => (
              <div key={ch.channel} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{ch.channel}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground">{ch.pct}%</span>
                    <span className="text-sm font-mono font-medium text-foreground w-20 text-right">{ch.revenue}</span>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${ch.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CFO Alerts */}
        <div className="bg-card border border-border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">CFO Agent Alerts</h2>
            <span className="kitz-badge-warning">{alerts.length} ACTIVE</span>
          </div>
          <div className="p-4 space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className={`border-l-2 ${severityClass[alert.severity]} bg-secondary/30 rounded-r-md px-3 py-2.5`}
              >
                <p className="text-sm text-foreground">{alert.message}</p>
                <button className="text-xs font-mono text-primary hover:underline mt-1">
                  {alert.action} →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
