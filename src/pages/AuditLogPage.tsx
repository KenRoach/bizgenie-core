import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { ScrollText, Loader2, AlertTriangle, CheckCircle2, Clock, XCircle, Filter } from "lucide-react";

interface AuditEntry {
  id: string;
  agent_nhi: string | null;
  tool_used: string | null;
  action: string;
  cost_units: number;
  risk_flag: string;
  human_approval: string;
  payload: Record<string, unknown>;
  created_at: string;
  agent_configurations?: { name: string; agent_type: string } | null;
}

const RISK_STYLES: Record<string, string> = {
  none: "text-muted-foreground",
  low: "text-success",
  medium: "text-warning",
  high: "text-destructive",
  critical: "text-destructive font-bold",
};

const APPROVAL_ICONS: Record<string, typeof CheckCircle2> = {
  approved: CheckCircle2,
  denied: XCircle,
  pending: Clock,
  not_required: CheckCircle2,
};

export default function AuditLogPage() {
  const { business } = useBusiness();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const load = async () => {
    if (!business) return;
    let query = supabase
      .from("agent_audit_log")
      .select("*, agent_configurations(name, agent_type)")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (riskFilter !== "all") query = query.eq("risk_flag", riskFilter);

    const { data } = await query;
    setEntries((data as AuditEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (business) load(); }, [business, riskFilter]);

  const flaggedCount = entries.filter(e => e.risk_flag !== "none").length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" /> Agent Audit Log
          </h1>
          <p className="text-xs font-mono text-muted-foreground">Immutable · Every agent action tracked</p>
        </div>
        <div className="flex items-center gap-3">
          {flaggedCount > 0 && (
            <span className="kitz-badge-warning">
              <AlertTriangle className="w-3 h-3" /> {flaggedCount} flagged
            </span>
          )}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} className="px-2 py-1 bg-secondary border border-border rounded-md text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              <option value="all">All risks</option>
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No audit entries yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Agent</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">NHI</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Tool</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Cost</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Risk</th>
                  <th className="text-left px-3 py-2 font-mono font-medium text-muted-foreground uppercase tracking-wider">Approval</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => {
                  const ApprovalIcon = APPROVAL_ICONS[entry.human_approval] || CheckCircle2;
                  return (
                    <tr key={entry.id} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors ${entry.risk_flag === "critical" ? "bg-destructive/5" : entry.risk_flag === "high" ? "bg-destructive/[0.02]" : ""}`}>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5 text-foreground">{entry.agent_configurations?.name || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{entry.agent_nhi || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-primary">{entry.tool_used || "—"}</td>
                      <td className="px-3 py-2.5 text-foreground max-w-[200px] truncate">{entry.action}</td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">{entry.cost_units > 0 ? entry.cost_units.toFixed(2) : "—"}</td>
                      <td className="px-3 py-2.5">
                        <span className={`font-mono uppercase ${RISK_STYLES[entry.risk_flag] || ""}`}>{entry.risk_flag}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center gap-1 font-mono ${entry.human_approval === "denied" ? "text-destructive" : entry.human_approval === "approved" ? "text-success" : entry.human_approval === "pending" ? "text-warning" : "text-muted-foreground"}`}>
                          <ApprovalIcon className="w-3 h-3" /> {entry.human_approval}
                        </span>
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
