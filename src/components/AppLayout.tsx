import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Mail,
  BarChart3,
  MessageSquare,
  Bot,
  ChevronLeft,
  ChevronDown,
  Menu,
  Zap,
  Settings,
  LogOut,
  Wrench,
  ScrollText,
  ShieldAlert,
  Crown,
  MessageSquareWarning,
  BookMarked,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AgentChatPanel from "@/components/AgentChatPanel";
import HuddlePanel from "@/components/HuddlePanel";

const navSections = [
  {
    label: null,
    items: [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/ceo", label: "Builder", icon: Crown },
    ],
  },
  {
    label: "Business",
    items: [
      { path: "/crm", label: "CRM", icon: Users },
      { path: "/orders", label: "Orders", icon: ShoppingCart },
      { path: "/inbox", label: "Inbox", icon: MessageSquare },
    ],
  },
  {
    label: "Growth",
    items: [
      { path: "/campaigns", label: "Campaigns", icon: Mail },
      { path: "/insights", label: "Insights", icon: BarChart3 },
      { path: "/feedback", label: "Feedback", icon: MessageSquareWarning },
    ],
  },
  {
    label: "Agents",
    items: [
      { path: "/skills", label: "Skill Library", icon: BookMarked },
      { path: "/tools", label: "Tool Registry", icon: Wrench },
      { path: "/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
  {
    label: null,
    items: [
      { path: "/security", label: "Security", icon: ShieldAlert },
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { business } = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; agent_type: string; nhi_identifier: string | null; is_active: boolean }[]>([]);
  const [topAgentTypes, setTopAgentTypes] = useState<string[]>([]);
  const [chatAgent, setChatAgent] = useState<{ id: string; name: string; agent_type: string; nhi_identifier: string | null } | null>(null);
  const [huddleOpen, setHuddleOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!business?.id) return;
    const fetchAgents = async () => {
      const { data } = await supabase
        .from("agent_configurations")
        .select("id, name, agent_type, nhi_identifier, is_active")
        .eq("business_id", business.id)
        .order("created_at");
      if (data) setAgents(data);
    };

    const fetchTopAgents = async () => {
      // Get events from the last 15 minutes first (current heartbeat window)
      const recentCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: recentData } = await supabase
        .from("event_logs")
        .select("payload, created_at")
        .eq("business_id", business.id)
        .eq("event_type", "agent_invoked")
        .gte("created_at", recentCutoff)
        .order("created_at", { ascending: false });

      let types: string[] = [];

      if (recentData && recentData.length > 0) {
        // Show agents active RIGHT NOW (last 15 min)
        const seen = new Set<string>();
        recentData.forEach((e: any) => {
          const t = e.payload?.agent_type;
          if (t && !seen.has(t)) seen.add(t);
        });
        types = [...seen].slice(0, 3);
      } else {
        // Fallback: most recently invoked agents
        const { data: fallback } = await supabase
          .from("event_logs")
          .select("payload")
          .eq("business_id", business.id)
          .eq("event_type", "agent_invoked")
          .order("created_at", { ascending: false })
          .limit(20);
        if (fallback) {
          const seen = new Set<string>();
          fallback.forEach((e: any) => {
            const t = e.payload?.agent_type;
            if (t && !seen.has(t)) seen.add(t);
          });
          types = [...seen].slice(0, 3);
        }
      }
      setTopAgentTypes(types);
    };

    fetchAgents();
    fetchTopAgents();

    const channel = supabase
      .channel("sidebar-agents")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_configurations", filter: `business_id=eq.${business.id}` }, () => {
        fetchAgents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [business?.id]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 h-full flex flex-col border-r border-border bg-sidebar transition-all duration-200
          ${collapsed ? "w-16" : "w-56"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(185_80%_50%/0.6)]" />
              <span className="font-mono font-bold text-sm tracking-wider text-primary drop-shadow-[0_0_8px_hsl(185_80%_50%/0.4)]">
                xyz88
              </span>
              <span className="text-[10px] font-mono text-primary/50">.io</span>
            </div>
          )}
          {collapsed && <Wrench className="w-5 h-5 text-primary drop-shadow-[0_0_6px_hsl(185_80%_50%/0.6)] mx-auto" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {navSections.map((section, si) => {
            const sectionKey = section.label || "top";
            const hasActiveChild = section.items.some(item => location.pathname === item.path);
            const isOpen = openSections[sectionKey] ?? (hasActiveChild || !section.label);

            const toggleSection = () => {
              if (!section.label) return;
              setOpenSections(prev => ({ ...prev, [sectionKey]: !isOpen }));
            };

            return (
              <div key={si} className={si > 0 ? "mt-1" : ""}>
                {section.label && !collapsed && (
                  <button
                    onClick={toggleSection}
                    className="flex items-center justify-between w-full text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1 px-3 py-1 hover:text-foreground transition-colors rounded-sm"
                  >
                    <span>{section.label}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  </button>
                )}
                {si > 0 && collapsed && <div className="mx-3 my-2 border-t border-border" />}
                {(isOpen || collapsed) && section.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const isBuilder = item.path === "/ceo";
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${isBuilder
                          ? isActive
                            ? "bg-primary/15 text-primary drop-shadow-[0_0_8px_hsl(185_80%_50%/0.3)]"
                            : "text-primary/70 hover:bg-primary/10 hover:text-primary"
                          : isActive
                            ? "bg-secondary text-foreground"
                            : "text-sidebar-foreground hover:bg-secondary hover:text-foreground"
                        }
                      `}
                    >
                      <item.icon className={`w-4 h-4 shrink-0 ${isBuilder ? "text-primary drop-shadow-[0_0_6px_hsl(185_80%_50%/0.5)]" : isActive ? "text-primary" : ""}`} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Agent Status */}
        {!collapsed && (
          <div className="px-3 pb-4 min-h-0 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Live Agents
            </div>
            <div className="space-y-0.5 overflow-y-auto max-h-48" style={{ scrollbarWidth: "thin" }}>
              {(() => {
                const executiveTypes = new Set(["ceo", "cfo", "cto", "cpo", "cro", "coo"]);
                const leaderMap: Record<string, string> = {
                  growth: "cro", sales: "cro", marketing: "cro",
                  content: "cpo", retention: "cpo", onboarding: "cpo",
                  ops: "coo", analytics: "coo",
                  support: "cto",
                  custom: "ceo",
                };
                const hierarchy: Record<string, number> = {
                  ceo: 0, cfo: 1, coo: 2, cto: 3, cpo: 4, cro: 5,
                };
                const activeAgents = agents.filter(a => a.is_active);
                // Only show agents whose type is in the top 3 most active
                const topSet = new Set(topAgentTypes);
                const relevantAgents = topSet.size > 0
                  ? activeAgents.filter(a => topSet.has(a.agent_type))
                  : activeAgents.slice(0, 3);
                const executives = [...relevantAgents]
                  .filter(a => executiveTypes.has(a.agent_type))
                  .sort((a, b) => (hierarchy[a.agent_type] ?? 99) - (hierarchy[b.agent_type] ?? 99));
                const functional = relevantAgents.filter(a => !executiveTypes.has(a.agent_type));

                return executives.map(exec => {
                  const subs = functional.filter(a => leaderMap[a.agent_type] === exec.agent_type);
                  return (
                    <div key={exec.id}>
                      <button
                        onClick={() => exec.is_active && setChatAgent(exec)}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs w-full text-left transition-colors ${exec.is_active ? "hover:bg-secondary cursor-pointer" : "opacity-50 cursor-default"}`}
                      >
                        <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sidebar-foreground truncate flex-1 font-medium">{exec.name}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${exec.is_active ? "bg-success animate-pulse-glow" : "bg-muted-foreground"}`} />
                      </button>
                      {subs.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => sub.is_active && setChatAgent(sub)}
                          className={`flex items-center gap-2 pl-7 pr-2 py-1 rounded-sm text-[11px] w-full text-left transition-colors ${sub.is_active ? "hover:bg-secondary cursor-pointer" : "opacity-50 cursor-default"}`}
                        >
                          <span className="w-3 border-l border-b border-border h-3 -mt-2 shrink-0" />
                          <span className="text-muted-foreground truncate flex-1">{sub.name}</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${sub.is_active ? "bg-success animate-pulse-glow" : "bg-muted-foreground"}`} />
                        </button>
                      ))}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Sign out */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <button
              onClick={signOut}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-xs text-sidebar-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center h-14 px-4 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden mr-3 text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="kitz-badge-live">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
              SYSTEM ONLINE
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => { setChatAgent(null); setHuddleOpen(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Huddle
            </button>
            <span className="font-mono text-[11px] text-muted-foreground">xyz88.io</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto kitz-grid-bg relative">
          {huddleOpen ? (
            <HuddlePanel onClose={() => setHuddleOpen(false)} />
          ) : (
            children
          )}
        </div>

        {/* Agent Chat Slide-over */}
        {chatAgent && (
          <>
            <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-sm" onClick={() => setChatAgent(null)} />
            <AgentChatPanel agent={chatAgent} onClose={() => setChatAgent(null)} />
          </>
        )}
      </main>
    </div>
  );
}
