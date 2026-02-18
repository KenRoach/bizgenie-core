import { Search, Filter, Plus, Mail, MessageSquare, MoreHorizontal, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import type { Tables } from "@/integrations/supabase/types";

type Contact = Tables<"contacts">;

const stageColors: Record<string, string> = {
  new: "kitz-badge-info",
  lead: "kitz-badge-info",
  qualified: "kitz-badge-live",
  proposal: "kitz-badge-warning",
  negotiation: "kitz-badge-warning",
  closed: "kitz-badge-live",
};

const channelIcon: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  instagram: <MessageSquare className="w-3 h-3" />,
  web: <MessageSquare className="w-3 h-3" />,
};

function getPrimaryChannel(contact: Contact): string {
  if (contact.whatsapp) return "whatsapp";
  if (contact.email) return "email";
  if (contact.instagram) return "instagram";
  return "web";
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function CrmPage() {
  const { business } = useBusiness();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!business) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("business_id", business.id)
        .order("updated_at", { ascending: false });
      if (!error && data) setContacts(data);
      setLoading(false);
    };
    load();
  }, [business]);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contacts</h1>
          <p className="text-xs font-mono text-muted-foreground">{contacts.length} contacts in pipeline</p>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
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
      {!loading && contacts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No contacts yet. Create one from Settings or via the API.</p>
        </div>
      )}

      {/* Table */}
      {!loading && contacts.length > 0 && (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Contact</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Channel</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Stage</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Revenue</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden lg:table-cell">Updated</th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((contact) => {
                  const channel = getPrimaryChannel(contact);
                  return (
                    <tr key={contact.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{contact.name}</p>
                          <p className="text-[11px] text-muted-foreground">{contact.email || "—"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {channelIcon[channel] || <MessageSquare className="w-3 h-3" />}
                          <span className="text-xs font-mono capitalize">{channel}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={stageColors[contact.pipeline_stage || "new"] || "kitz-badge-info"}>
                          {(contact.pipeline_stage || "new").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-foreground">
                          ${Number(contact.total_revenue || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono text-muted-foreground">
                          {formatTimeAgo(contact.updated_at)}
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
