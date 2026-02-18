import { Zap, Bot, ShieldCheck, BarChart3, Mail, MessageSquare, ArrowRight, Crown, Target, Users } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  { icon: Bot, title: "AI Agents That Work", desc: "CRM, Follow-Up, Support, and CEO agents that execute — not just assist." },
  { icon: MessageSquare, title: "WhatsApp-Native Inbox", desc: "Omnichannel inbox with WhatsApp, Email, Instagram. Push offers in-chat." },
  { icon: Mail, title: "Drip Campaigns", desc: "Automated multi-step sequences triggered by events, stages, or API calls." },
  { icon: BarChart3, title: "CFO Insights", desc: "Revenue by channel, margin tracking, AR alerts. Data-driven decisions." },
  { icon: ShieldCheck, title: "Zero Trust Security", desc: "Every AI action audited. Kill switches, rate limits, injection detection." },
  { icon: Target, title: "Feedback Loop", desc: "Collect, categorize, and fix friction from 10+ sources. Data > ego." },
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-mono font-bold text-sm tracking-wider">xyz88</span>
          <span className="text-[10px] font-mono text-muted-foreground">.io</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
          <Link to="/auth" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-mono text-primary mb-6">
          <Crown className="w-3 h-3" /> AI-Native Business OS
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          Your startup runs on
          <span className="text-primary"> AI agents</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Kitz replaces 10+ SaaS tools with one intelligent platform. CRM, inbox, campaigns, insights, and a Virtual CEO — all powered by AI agents that execute, not just assist.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity">
            Launch Your AI Team <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="https://admin.kitz.services" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 border border-border text-foreground font-medium rounded-md hover:bg-secondary transition-colors">
            <Users className="w-4 h-4" /> admin.kitz.services
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.title} className="bg-card border border-border rounded-md p-5 hover:border-primary/30 transition-colors">
              <f.icon className="w-5 h-5 text-primary mb-3" />
              <h3 className="font-semibold text-sm text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-foreground">Built for LATAM. Powered by AI.</h2>
          <p className="text-sm text-muted-foreground mt-2">WhatsApp-native. Bilingual. Secure. Affordable.</p>
          <Link to="/auth" className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 transition-opacity">
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs text-muted-foreground">Kitz © 2026 — xyz88.io</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <a href="https://admin.kitz.services" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">admin.kitz.services</a>
            <a href="https://xyz88.io" className="hover:text-foreground transition-colors">xyz88.io</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
