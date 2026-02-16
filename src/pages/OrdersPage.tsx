import { Search, Filter, Package, Clock, Truck, CheckCircle2, AlertCircle, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const orders = [
  { id: "#1043", customer: "Maria Lopez", items: "3x Premium Bundle", total: "$3,400", status: "pending", payment: "unpaid", date: "Today, 10:24" },
  { id: "#1042", customer: "Sarah Kim", items: "1x Enterprise License", total: "$1,250", status: "confirmed", payment: "paid", date: "Today, 09:15" },
  { id: "#1041", customer: "Fatima Al-Sayed", items: "5x Retail Kit", total: "$4,500", status: "shipped", payment: "paid", date: "Yesterday" },
  { id: "#1040", customer: "James Park", items: "2x Starter Pack", total: "$800", status: "confirmed", payment: "partial", date: "Yesterday" },
  { id: "#1039", customer: "Tom Chen", items: "10x Custom Module", total: "$12,000", status: "delivered", payment: "paid", date: "Feb 14" },
  { id: "#1038", customer: "Ahmed Rashid", items: "1x Growth Plan", total: "$2,200", status: "delivered", payment: "paid", date: "Feb 13" },
];

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

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const filtered = orders.filter(
    (o) =>
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Orders</h1>
          <p className="text-xs font-mono text-muted-foreground">{orders.length} orders — 2 require action</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", count: 1, color: "text-warning" },
          { label: "Confirmed", count: 2, color: "text-info" },
          { label: "Shipped", count: 1, color: "text-primary" },
          { label: "Delivered", count: 2, color: "text-success" },
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

      {/* Table */}
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
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono font-medium text-foreground">{order.id}</p>
                    <p className="text-[11px] text-muted-foreground">{order.customer}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{order.items}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={statusConfig[order.status].badge}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={paymentBadge[order.payment]}>
                      {order.payment.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-mono text-foreground">{order.total}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">{order.date}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
