import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/crm", label: "CRM", icon: Users },
  { path: "/orders", label: "Orders", icon: ShoppingCart },
  { path: "/campaigns", label: "Campaigns", icon: Mail },
  { path: "/insights", label: "Insights", icon: BarChart3 },
  { path: "/inbox", label: "Inbox", icon: MessageSquare },
  { path: "/settings", label: "Settings", icon: Settings },
];

const agents = [
  { name: "CRM Agent", status: "active" as const },
  { name: "Follow Up Agent", status: "active" as const },
  { name: "Support Agent", status: "idle" as const },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          <div className="px-3 pb-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 px-1">
              Agents
            </div>
            <div className="space-y-1">
              {agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs"
                >
                  <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-sidebar-foreground truncate flex-1">{agent.name}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      agent.status === "active"
                        ? "bg-success animate-pulse-glow"
                        : "bg-muted-foreground"
                    }`}
                  />
                </div>
              ))}
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
          <div className="ml-auto font-mono text-[11px] text-muted-foreground">
            xyz88.io
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto kitz-grid-bg">
          {children}
        </div>
      </main>
    </div>
  );
}
