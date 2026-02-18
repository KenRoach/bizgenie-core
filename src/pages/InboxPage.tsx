import { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Instagram,
  Phone,
  Search,
  User,
  Tag,
  Clock,
  Activity,
  Bot,
  Link2,
  ChevronRight,
  Plug,
  Star,
  DollarSign,
  Filter,
  MoreHorizontal,
  Shield,
  Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  pipeline_stage: string | null;
  lead_score: number | null;
  total_revenue: number | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
}

interface EventLog {
  id: string;
  event_type: string;
  channel: string | null;
  actor_type: string | null;
  actor_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  agent_nhi: string | null;
  tool_used: string | null;
  risk_flag: string | null;
  created_at: string;
}

type ChannelTab = "all" | "email" | "whatsapp" | "instagram";

const channelConfig = {
  email: { label: "Email", icon: Mail, color: "text-info", bg: "bg-info/10 border-info/20" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "text-success", bg: "bg-success/10 border-success/20" },
  instagram: { label: "Instagram", icon: Instagram, color: "text-accent", bg: "bg-accent/10 border-accent/20" },
};

const stageColors: Record<string, string> = {
  new: "bg-info/10 text-info",
  contacted: "bg-warning/10 text-warning",
  qualified: "bg-primary/10 text-primary",
  proposal: "bg-accent/10 text-accent",
  won: "bg-success/10 text-success",
  lost: "bg-destructive/10 text-destructive",
};

export default function InboxPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [channelTab, setChannelTab] = useState<ChannelTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; agent_type: string; is_active: boolean }[]>([]);
  const [showActivity, setShowActivity] = useState(true);
  const [loading, setLoading] = useState(true);

  // Load contacts
  useEffect(() => {
    if (!business?.id) return;
    const load = async () => {
      setLoading(true);
      const [contactsRes, agentsRes] = await Promise.all([
        supabase
          .from("contacts")
          .select("*")
          .eq("business_id", business.id)
          .order("updated_at", { ascending: false }),
        supabase
          .from("agent_configurations")
          .select("id, name, agent_type, is_active")
          .eq("business_id", business.id),
      ]);
      if (contactsRes.data) {
        setContacts(contactsRes.data);
        if (contactsRes.data.length > 0 && !selectedContactId) {
          setSelectedContactId(contactsRes.data[0].id);
        }
      }
      if (agentsRes.data) setAgents(agentsRes.data);
      setLoading(false);
    };
    load();
  }, [business?.id]);

  // Load activity for selected contact
  useEffect(() => {
    if (!business?.id || !selectedContactId) return;
    const loadActivity = async () => {
      const [eventsRes, auditRes] = await Promise.all([
        supabase
          .from("event_logs")
          .select("*")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("agent_audit_log")
          .select("id, action, agent_nhi, tool_used, risk_flag, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (eventsRes.data) setEventLogs(eventsRes.data as EventLog[]);
      if (auditRes.data) setAuditLogs(auditRes.data as AuditEntry[]);
    };
    loadActivity();
  }, [business?.id, selectedContactId]);

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  const filteredContacts = contacts.filter((c) => {
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getContactChannels = (contact: Contact) => {
    const channels: string[] = [];
    if (contact.email) channels.push("email");
    if (contact.whatsapp) channels.push("whatsapp");
    if (contact.instagram) channels.push("instagram");
    return channels;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Unified Inbox</h1>
          <p className="text-xs font-mono text-muted-foreground">
            All channels · All Kitz · One view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowActivity(!showActivity)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showActivity
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-secondary text-muted-foreground border border-border"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Activity
          </button>
        </div>
      </div>

      <div className={`grid gap-4 h-[calc(100%-3rem)] ${showActivity ? "grid-cols-1 lg:grid-cols-[280px_1fr_320px]" : "grid-cols-1 lg:grid-cols-[280px_1fr]"}`}>

        {/* ── LEFT: Contact List ── */}
        <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
          <div className="px-3 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Kitz..."
                className="w-full pl-8 pr-3 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-border">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center">
                <User className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No contacts found</p>
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const channels = getContactChannels(contact);
                const isSelected = selectedContactId === contact.id;
                return (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContactId(contact.id)}
                    className={`w-full text-left px-3 py-3 hover:bg-secondary/50 transition-colors ${
                      isSelected ? "bg-secondary/70 border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-primary">
                          {contact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground truncate">
                          {contact.email || contact.whatsapp || contact.instagram || "No channels"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 pl-9">
                      {channels.map((ch) => {
                        const cfg = channelConfig[ch as keyof typeof channelConfig];
                        const Icon = cfg.icon;
                        return <Icon key={ch} className={`w-3 h-3 ${cfg.color}`} />;
                      })}
                      {contact.pipeline_stage && (
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${stageColors[contact.pipeline_stage] || "bg-secondary text-muted-foreground"}`}>
                          {contact.pipeline_stage}
                        </span>
                      )}
                      {(contact.lead_score ?? 0) > 0 && (
                        <span className="text-[9px] font-mono text-muted-foreground ml-auto">
                          ★ {contact.lead_score}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <div className="px-3 py-2 border-t border-border">
            <p className="text-[10px] font-mono text-muted-foreground text-center">
              {filteredContacts.length} Kitz
            </p>
          </div>
        </div>

        {/* ── CENTER: Channel Tabs + Messages ── */}
        <div className="bg-card border border-border rounded-md flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              {/* Contact header */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {selectedContact.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{selectedContact.name}</p>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      {selectedContact.pipeline_stage && <span>{selectedContact.pipeline_stage}</span>}
                      {selectedContact.total_revenue != null && selectedContact.total_revenue > 0 && (
                        <span>· ${selectedContact.total_revenue.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Agent permissions indicators */}
                    {agents.filter((a) => a.is_active).map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/50 text-[10px] font-mono text-muted-foreground"
                        title={`${agent.name} has access`}
                      >
                        <Bot className="w-3 h-3" />
                        <span className="hidden sm:inline">{agent.name.split(" ")[0]}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Channel tabs */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-secondary/20">
                <button
                  onClick={() => setChannelTab("all")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    channelTab === "all"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  All
                </button>
                {(Object.keys(channelConfig) as Array<keyof typeof channelConfig>).map((ch) => {
                  const cfg = channelConfig[ch];
                  const Icon = cfg.icon;
                  const hasChannel = ch === "email"
                    ? !!selectedContact.email
                    : ch === "whatsapp"
                    ? !!selectedContact.whatsapp
                    : !!selectedContact.instagram;
                  return (
                    <button
                      key={ch}
                      onClick={() => setChannelTab(ch)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        channelTab === ch
                          ? `${cfg.bg} ${cfg.color} border`
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                      {!hasChannel && (
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" title="Not connected" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Channel content */}
              <div className="flex-1 overflow-auto">
                {channelTab === "all" ? (
                  <AllChannelsView contact={selectedContact} />
                ) : (
                  <ChannelView channel={channelTab} contact={selectedContact} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a Kitz to view communications</p>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Activity & Profile Panel ── */}
        {showActivity && selectedContact && (
          <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Profile & Activity</span>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-5">
              {/* Quick info */}
              <div className="space-y-3">
                {selectedContact.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="w-3.5 h-3.5 text-info shrink-0" />
                    <span className="text-foreground font-mono text-[11px] truncate">{selectedContact.email}</span>
                  </div>
                )}
                {selectedContact.whatsapp && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-foreground font-mono text-[11px]">{selectedContact.whatsapp}</span>
                  </div>
                )}
                {selectedContact.instagram && (
                  <div className="flex items-center gap-2 text-xs">
                    <Instagram className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="text-foreground font-mono text-[11px]">{selectedContact.instagram}</span>
                  </div>
                )}
              </div>

              {/* Lead score */}
              {(selectedContact.lead_score ?? 0) > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Lead Score</span>
                    <span className={`text-xs font-mono font-bold ${(selectedContact.lead_score ?? 0) >= 80 ? "text-success" : (selectedContact.lead_score ?? 0) >= 60 ? "text-warning" : "text-muted-foreground"}`}>
                      {selectedContact.lead_score}/100
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${(selectedContact.lead_score ?? 0) >= 80 ? "bg-success" : (selectedContact.lead_score ?? 0) >= 60 ? "bg-warning" : "bg-muted-foreground"}`}
                      style={{ width: `${selectedContact.lead_score}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedContact.tags && selectedContact.tags.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Tags
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedContact.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue */}
              {(selectedContact.total_revenue ?? 0) > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Revenue</span>
                  <p className="text-lg font-bold font-mono text-foreground">${(selectedContact.total_revenue ?? 0).toLocaleString()}</p>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Notes</span>
                  <p className="text-xs text-muted-foreground leading-relaxed">{selectedContact.notes}</p>
                </div>
              )}

              {/* Agent Access */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Agent Access
                </span>
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/50">
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-foreground flex-1">{agent.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                  </div>
                ))}
              </div>

              {/* Activity log */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Recent Activity
                </span>
                <div className="space-y-1.5">
                  {eventLogs.length === 0 && auditLogs.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-2">No activity yet</p>
                  ) : (
                    <>
                      {auditLogs.slice(0, 8).map((log) => (
                        <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 rounded-sm hover:bg-secondary/30">
                          <Bot className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-foreground truncate">{log.action}</p>
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                              {log.agent_nhi && <span>{log.agent_nhi}</span>}
                              {log.tool_used && <span>· {log.tool_used}</span>}
                              <span>· {formatTime(log.created_at)}</span>
                              {log.risk_flag && log.risk_flag !== "none" && (
                                <span className={`px-1 rounded ${log.risk_flag === "high" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                                  {log.risk_flag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {eventLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 rounded-sm hover:bg-secondary/30">
                          <Activity className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-foreground truncate">{log.event_type}</p>
                            <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground">
                              {log.channel && <span>{log.channel}</span>}
                              <span>· {formatTime(log.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── All Channels Overview ── */
function AllChannelsView({ contact }: { contact: Contact }) {
  const channels = [
    { key: "email", value: contact.email, ...channelConfig.email },
    { key: "whatsapp", value: contact.whatsapp, ...channelConfig.whatsapp },
    { key: "instagram", value: contact.instagram, ...channelConfig.instagram },
  ];

  return (
    <div className="p-4 space-y-4">
      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        Communication Channels for {contact.name}
      </p>
      <div className="grid gap-3">
        {channels.map((ch) => {
          const Icon = ch.icon;
          const connected = !!ch.value;
          return (
            <div
              key={ch.key}
              className={`rounded-md border p-4 transition-colors ${
                connected ? "border-border bg-secondary/20" : "border-dashed border-border/50 bg-secondary/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${connected ? ch.bg : "bg-secondary"} border`}>
                  <Icon className={`w-5 h-5 ${connected ? ch.color : "text-muted-foreground/50"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ch.label}</p>
                  {connected ? (
                    <p className="text-xs font-mono text-muted-foreground truncate">{ch.value}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">No {ch.label} configured for this contact</p>
                  )}
                </div>
                {connected ? (
                  <div className="flex items-center gap-1.5">
                    <span className="kitz-badge-live">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      Ready
                    </span>
                  </div>
                ) : (
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                    <Plug className="w-3.5 h-3.5" />
                    Connect
                  </button>
                )}
              </div>
              {connected && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-mono text-muted-foreground">
                      No messages yet — integration pending
                    </p>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Integration status */}
      <div className="mt-6 p-4 rounded-md border border-dashed border-border bg-secondary/10">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Channel Integrations</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Connect your WhatsApp Business, Email (SMTP/IMAP), and Instagram accounts to enable real-time messaging 
          directly from this unified inbox. Once connected, all conversations will appear here automatically.
        </p>
        <div className="flex gap-2 mt-3">
          <IntegrationBadge label="WhatsApp Business" status="pending" />
          <IntegrationBadge label="Email (SMTP)" status="pending" />
          <IntegrationBadge label="Instagram DM" status="pending" />
        </div>
      </div>
    </div>
  );
}

/* ── Single Channel View ── */
function ChannelView({ channel, contact }: { channel: "email" | "whatsapp" | "instagram"; contact: Contact }) {
  const cfg = channelConfig[channel];
  const Icon = cfg.icon;
  const value = channel === "email" ? contact.email : channel === "whatsapp" ? contact.whatsapp : contact.instagram;

  if (!value) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className={`w-14 h-14 rounded-lg ${cfg.bg} border flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-7 h-7 ${cfg.color}`} />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No {cfg.label} for {contact.name}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Add a {cfg.label} address to this contact to enable messaging through this channel.
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            <Plug className="w-4 h-4" />
            Add {cfg.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Channel info bar */}
      <div className="px-4 py-2.5 bg-secondary/20 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${cfg.color}`} />
          <span className="text-xs font-mono text-foreground">{value}</span>
          <span className="kitz-badge-live ml-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Ready
          </span>
        </div>
      </div>

      {/* Empty state - messages area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 rounded-xl ${cfg.bg} border flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-8 h-8 ${cfg.color} opacity-60`} />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {cfg.label} Integration Pending
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Connect your {cfg.label} account to start sending and receiving messages with {contact.name} directly from this inbox.
          </p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            <Link2 className="w-4 h-4" />
            Connect {cfg.label}
          </button>
        </div>
      </div>

      {/* Input bar (disabled until connected) */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            disabled
            placeholder={`Connect ${cfg.label} to start messaging...`}
            className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            disabled
            className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-md opacity-40 cursor-not-allowed"
          >
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Integration Badge ── */
function IntegrationBadge({ label, status }: { label: string; status: "connected" | "pending" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono border ${
      status === "connected"
        ? "bg-success/10 border-success/20 text-success"
        : "bg-secondary border-border text-muted-foreground"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === "connected" ? "bg-success" : "bg-muted-foreground/40"}`} />
      {label}
    </span>
  );
}
