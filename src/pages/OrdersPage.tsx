import { Search, Filter, Package, Clock, Truck, CheckCircle2, AlertCircle, MoreHorizontal, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

const statusConfig: Record<string, { icon: React.ReactNode; badge: string }> = {
  pending: { icon: <Clock className="w-3 h-3" />, badge: "kitz-badge-warning" },
  confirmed: { icon: <Package className="w-3 h-3" />, badge: "kitz-badge-info" },
  shipped: { icon: <Truck className="w-3 h-3" />, badge: "kitz-badge-info" },
  delivered: { icon: <CheckCircle2 className="w-3 h-3" />, badge: "kitz-badge-live" },
  cancelled: { icon: <AlertCircle className="w-3 h-3" />, badge: "kitz-badge-error" },
};

const paymentBadge: Record<string, string> = {
  paid: "kitz-badge-live",
  unpaid: "kitz-badge-error",
  partial: "kitz-badge-warning",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function OrdersPage() {
  const { business } = useBusiness();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!business) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      if (!error && data) setOrders(data);
      setLoading(false);
    };
    load();
  }, [business]);

  const filtered = orders.filter(
    (o) =>
      o.order_number.toLowerCase().includes(search.toLowerCase())
  );

  const statusCounts = {
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
  };

  const actionCount = statusCounts.pending;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Orders</h1>
          <p className="text-xs font-mono text-muted-foreground">
            {orders.length} orders{actionCount > 0 ? ` — ${actionCount} require action` : ""}
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: statusCounts.pending, color: "text-warning" },
          { label: "Confirmed", count: statusCounts.confirmed, color: "text-info" },
          { label: "Shipped", count: statusCounts.shipped, color: "text-primary" },
          { label: "Delivered", count: statusCounts.delivered, color: "text-success" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-md px-3 py-2">
            <p className="text-[10px] font-mono uppercase text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.count}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground text-sm rounded-md hover:bg-secondary/80 transition-colors">
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && orders.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No orders yet. Create one via the API or Settings.</p>
        </div>
      )}

      {/* Table */}
      {!loading && orders.length > 0 && (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Order</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Items</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Payment</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Total</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden lg:table-cell">Date</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((order) => {
                  const status = order.status || "pending";
                  const payment = order.payment_status || "unpaid";
                  const itemsSummary = Array.isArray(order.items) ? `${(order.items as unknown[]).length} item(s)` : "—";
                  return (
                    <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-mono font-medium text-foreground">{order.order_number}</p>
                        <p className="text-[11px] text-muted-foreground">{order.currency || "USD"}</p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{itemsSummary}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={statusConfig[status]?.badge || "kitz-badge-info"}>
                          {status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={paymentBadge[payment] || "kitz-badge-warning"}>
                          {payment.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-foreground">
                          ${Number(order.total).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatDate(order.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
