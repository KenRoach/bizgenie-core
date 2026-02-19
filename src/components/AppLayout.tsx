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
  Menu,
  Zap,
  Settings,
  LogOut,
  Wrench,
  ScrollText,
  ShieldAlert,
  Crown,
  MessageSquareWarning,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AgentChatPanel from "@/components/AgentChatPanel";
import HuddlePanel from "@/components/HuddlePanel";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/ceo", label: "Builder", icon: Crown },
  { path: "/crm", label: "CRM", icon: Users },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/campaigns", label: "Campaigns", icon: Mail },
  { path: "/insights", label: "Insights", icon: BarChart3 },
  { path: "/inbox", label: "Inbox", icon: MessageSquare },
  { path: "/tools", label: "Tool Registry", icon: Wrench },
  { path: "/audit", label: "Audit Log", icon: ScrollText },
  { path: "/security", label: "Security", icon: ShieldAlert },
  { path: "/feedback", label: "Feedback Loop", icon: MessageSquareWarning },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { business } = useBusiness();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [agents, setAgents] = useState<{ id: string; name: string; agent_type: string; nhi_identifier: string | null; is_active: boolean }[]>([]);
  const [chatAgent, setChatAgent] = useState<{ id: string; name: string; agent_type: string; nhi_identifier: string | null } | null>(null);
  const [huddleOpen, setHuddleOpen] = useState(false);

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
    fetchAgents();

    // Realtime subscription for live updates
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
              <Zap className="w-5 h-5 text-primary" />
              <span className="font-mono font-bold text-sm tracking-wider text-foreground">
                xyz88
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">.io</span>
            </div>
          )}
          {collapsed && <Zap className="w-5 h-5 text-primary mx-auto" />}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex items-center justify-center w-6 h-6 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? "bg-secondary text-foreground"
                    : "text-sidebar-foreground hover:bg-secondary hover:text-foreground"
                  }
                `}
              >
                <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Agent Status */}
        {!collapsed && (
          <div className="px-3 pb-4 min-h-0 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Agents
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
                const executives = [...agents]
                  .filter(a => executiveTypes.has(a.agent_type))
                  .sort((a, b) => (hierarchy[a.agent_type] ?? 99) - (hierarchy[b.agent_type] ?? 99));
                const functional = agents.filter(a => !executiveTypes.has(a.agent_type));

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
          ) : chatAgent ? (
            <AgentChatPanel agent={chatAgent} onClose={() => setChatAgent(null)} />
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
