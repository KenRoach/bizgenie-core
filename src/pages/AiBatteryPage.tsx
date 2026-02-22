import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Loader2, Zap, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface UsageRow {
  id: string;
  business_id: string;
  action: string;
  credits: number;
  created_at: string;
}

export default function AiBatteryPage() {
  const { business } = useBusiness();
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("ai_battery_usage")
        .select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows(data || []);
      setLoading(false);
    };
    fetch();
  }, [business?.id]);

  const totalCredits = useMemo(() => rows.reduce((s, r) => s + Number(r.credits || 0), 0), [rows]);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days[key] = 0;
    }
    rows.forEach((r) => {
      const key = r.created_at.slice(0, 10);
      if (key in days) days[key] += Number(r.credits || 0);
    });
    return Object.entries(days).map(([date, credits]) => ({
      date: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
      credits,
    }));
  }, [rows]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-foreground">AI Battery</h1>
        <p className="text-xs font-mono text-muted-foreground mt-0.5">Credit usage overview</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Total */}
          <div className="kitz-stat-card max-w-xs">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Total Credits Used</p>
                <p className="text-2xl font-bold font-mono text-foreground mt-1">{totalCredits.toLocaleString()}</p>
              </div>
              <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-card border border-border rounded-md p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Last 7 Days</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(215 12% 50%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(215 12% 50%)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(220 18% 10%)",
                      border: "1px solid hsl(220 14% 18%)",
                      borderRadius: "6px",
                      fontSize: 12,
                      color: "hsl(210 20% 92%)",
                    }}
                  />
                  <Bar dataKey="credits" fill="hsl(185 80% 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History */}
          <div className="bg-card border border-border rounded-md">
            <div className="px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Usage History</h2>
            </div>
            {rows.length === 0 ? (
              <div className="text-center py-12"><p className="text-sm text-muted-foreground">No usage data yet.</p></div>
            ) : (
              <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{row.action}</p>
                    </div>
                    <span className="text-xs font-mono text-primary font-medium shrink-0">{row.credits} cr</span>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDate(row.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
