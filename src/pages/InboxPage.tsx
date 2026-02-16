import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Send,
  Clock,
  Instagram,
  Phone,
  AtSign,
  Check,
  Bot,
  Gift,
  User,
  Tag,
  ChevronRight,
  Sparkles,
  Eye,
  Zap,
  MoreHorizontal,
  Star,
  DollarSign,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: number;
  sender: "customer" | "agent" | "system";
  content: string;
  time: string;
  type?: "text" | "channel-prompt" | "offer-sent";
}

interface CustomerProfile {
  name: string;
  company: string;
  email: string;
  whatsapp: string;
  instagram: string;
  channel: string;
  leadScore: number;
  totalSpent: number;
  tags: string[];
  lastOrder: string;
  notes: string;
}

const conversations = [
  { id: 1, name: "Ahmed Rashid", channel: "whatsapp", preview: "Hi, what's the pricing for the growth plan?", time: "15m ago", unread: true, company: "GreenLeaf Co." },
  { id: 2, name: "James Park", channel: "email", preview: "Following up on our conversation last week...", time: "1h ago", unread: true, company: "Nexus Inc." },
  { id: 3, name: "Sarah Kim", channel: "whatsapp", preview: "Order confirmed, thanks!", time: "2h ago", unread: false, company: "BrightStar" },
  { id: 4, name: "Fatima Al-Sayed", channel: "instagram", preview: "Can I get a bulk discount?", time: "4h ago", unread: false, company: "Oasis Trading" },
  { id: 5, name: "Maria Lopez", channel: "email", preview: "Please send the updated proposal", time: "1d ago", unread: false, company: "Verde Group" },
];

const customerProfiles: Record<number, CustomerProfile> = {
  1: { name: "Ahmed Rashid", company: "GreenLeaf Co.", email: "ahmed@greenleaf.co", whatsapp: "+971 50 123 4567", instagram: "@greenleafco", channel: "whatsapp", leadScore: 82, totalSpent: 12400, tags: ["Hot Lead", "Enterprise"], lastOrder: "Order #1039 — $3,200", notes: "Interested in growth plan. Decision maker." },
  2: { name: "James Park", company: "Nexus Inc.", email: "james@nexusinc.com", whatsapp: "+1 415 555 0199", instagram: "@nexusinc", channel: "email", leadScore: 65, totalSpent: 4800, tags: ["Warm Lead", "SMB"], lastOrder: "Order #1021 — $1,600", notes: "Needs follow-up on proposal. Budget cycle in Q2." },
  3: { name: "Sarah Kim", company: "BrightStar", email: "sarah@brightstar.io", whatsapp: "+82 10 9876 5432", instagram: "@sarahk_biz", channel: "whatsapp", leadScore: 90, totalSpent: 28500, tags: ["VIP", "Repeat Buyer"], lastOrder: "Order #1042 — $1,250", notes: "Loyal customer. Consider loyalty offer." },
  4: { name: "Fatima Al-Sayed", company: "Oasis Trading", email: "fatima@oasistrading.ae", whatsapp: "+971 55 678 9012", instagram: "@oasis.trading", channel: "instagram", leadScore: 55, totalSpent: 2200, tags: ["Warm Lead", "Bulk"], lastOrder: "Order #982 — $2,200", notes: "Asking about bulk pricing. Price sensitive." },
  5: { name: "Maria Lopez", company: "Verde Group", email: "maria@verdegroup.mx", whatsapp: "+52 55 1234 5678", instagram: "@verdegroupmx", channel: "email", leadScore: 70, totalSpent: 9600, tags: ["Hot Lead", "Mid-Market"], lastOrder: "Order #1035 — $4,800", notes: "Waiting for updated proposal. High potential." },
};

const offers = [
  { id: "growth-20", label: "20% Off Growth Plan", description: "Limited-time discount on Growth Plan", value: "$440 savings" },
  { id: "bundle-deal", label: "Starter Bundle", description: "3-month starter pack with onboarding", value: "$1,800" },
  { id: "loyalty-reward", label: "Loyalty Reward", description: "Exclusive 15% loyalty discount", value: "15% off" },
  { id: "free-trial", label: "14-Day Free Trial", description: "Full access trial, no commitment", value: "Free" },
];

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-4 h-4 text-success" />,
  email: <Mail className="w-4 h-4 text-info" />,
  instagram: <Instagram className="w-4 h-4 text-accent" />,
};

const channelOptions = [
  { key: "email", label: "Email", icon: AtSign, placeholder: "you@company.com" },
  { key: "whatsapp", label: "WhatsApp", icon: Phone, placeholder: "+1 234 567 8900" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@yourhandle" },
];

const agentOptions = [
  { key: "sales", label: "Sales Agent", icon: Star, status: "active" as const },
  { key: "ops", label: "Ops Agent", icon: Zap, status: "active" as const },
  { key: "cfo", label: "CFO Agent", icon: DollarSign, status: "idle" as const },
];

export default function InboxPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { toast } = useToast();
  const [selectedConvo, setSelectedConvo] = useState(1);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: "customer", content: "Hi, what's the pricing for the growth plan?", time: "15m ago" },
    { id: 2, sender: "agent", content: "Hi Ahmed! The Growth Plan is $2,200/month and includes 5 user seats, priority support, and all integrations. Want me to send a detailed breakdown?", time: "14m ago" },
    { id: 3, sender: "customer", content: "Yes please, send it over.", time: "13m ago" },
    { id: 4, sender: "agent", content: "Great! How would you like me to reach you? Share your preferred channel below so I can send the proposal directly 👇", time: "13m ago", type: "channel-prompt" },
  ]);

  const [inputValue, setInputValue] = useState("");
  const [sharedChannels, setSharedChannels] = useState<Record<string, string>>({});
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [channelInput, setChannelInput] = useState("");
  const [activeAgent, setActiveAgent] = useState("sales");
  const [showOffers, setShowOffers] = useState(false);
  const [showProfile, setShowProfile] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const profile = customerProfiles[selectedConvo];
  const convo = conversations.find((c) => c.id === selectedConvo);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;
    const userText = inputValue.trim();
    const newMsg: Message = {
      id: Date.now(),
      sender: "customer",
      content: userText,
      time: "now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");
    setIsStreaming(true);

    // Build chat history for AI
    const chatHistory = messages
      .filter((m) => m.sender !== "system")
      .map((m) => ({
        role: m.sender === "customer" ? "user" as const : "assistant" as const,
        content: m.content,
      }));
    chatHistory.push({ role: "user", content: userText });

    // Create placeholder assistant message
    const assistantId = Date.now() + 1;
    setMessages((prev) => [...prev, { id: assistantId, sender: "agent", content: "", time: "now" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: chatHistory,
          agent_type: activeAgent,
          business_id: business?.id,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        if (resp.status === 429) {
          toast({ variant: "destructive", title: "Rate limited", description: "Please try again shortly." });
        } else if (resp.status === 402) {
          toast({ variant: "destructive", title: "Usage limit reached", description: "Please add credits." });
        } else {
          toast({ variant: "destructive", title: "Error", description: err.error || "Failed to get response." });
        }
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        setIsStreaming(false);
        return;
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: snapshot } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Streaming error:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to connect to agent." });
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleShareChannel = (channelKey: string) => {
    if (!channelInput.trim()) return;
    setSharedChannels((prev) => ({ ...prev, [channelKey]: channelInput }));
    setEditingChannel(null);

    const label = channelOptions.find((c) => c.key === channelKey)?.label;
    const newMsg: Message = {
      id: messages.length + 200,
      sender: "customer",
      content: `📎 Shared ${label}: ${channelInput}`,
      time: "now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setChannelInput("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 201,
          sender: "agent",
          content: `✅ Got your ${label}! I'll send the proposal there shortly.`,
          time: "now",
        },
      ]);
    }, 1000);
  };

  const handlePushOffer = (offer: typeof offers[0]) => {
    const newMsg: Message = {
      id: messages.length + 300,
      sender: "agent",
      content: `🎁 Special offer for you: **${offer.label}** — ${offer.description} (${offer.value}). Want me to apply this to your account?`,
      time: "now",
      type: "offer-sent",
    };
    setMessages((prev) => [...prev, newMsg]);
    setShowOffers(false);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 301,
          sender: "system",
          content: `📊 Offer "${offer.label}" pushed to ${profile.name} via ${convo?.channel}. Awaiting response.`,
          time: "now",
        },
      ]);
    }, 800);
  };

  const handleSwitchAgent = (agentKey: string) => {
    setActiveAgent(agentKey);
    const agent = agentOptions.find((a) => a.key === agentKey);
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 400,
        sender: "system",
        content: `🔄 Conversation handed off to ${agent?.label}. Agent is now reviewing context...`,
        time: "now",
      },
    ]);
  };

  const currentAgent = agentOptions.find((a) => a.key === activeAgent);

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Command Inbox</h1>
          <p className="text-xs font-mono text-muted-foreground">
            Admin control · Agents · Profiles · Offers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showProfile
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-secondary text-muted-foreground border border-border"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Profile
          </button>
        </div>
      </div>

      <div className={`grid gap-4 h-[calc(100vh-12rem)] ${showProfile ? "grid-cols-1 lg:grid-cols-[280px_1fr_300px]" : "grid-cols-1 lg:grid-cols-[280px_1fr]"}`}>
        {/* Conversation list */}
        <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <input
              type="text"
              placeholder="Search contacts..."
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1 overflow-auto divide-y divide-border">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedConvo(c.id)}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors ${
                  selectedConvo === c.id ? "bg-secondary/70 border-l-2 border-l-primary" : ""
                } ${c.unread ? "bg-secondary/20" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {channelIcons[c.channel]}
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{c.time}</span>
                </div>
                <p className="text-[10px] font-mono text-muted-foreground/70">{c.company}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.preview}</p>
                {c.unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="bg-card border border-border rounded-md flex flex-col">
          {/* Chat header with agent control */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              {channelIcons[convo?.channel || "whatsapp"]}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{profile.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {convo?.channel} · {profile.company}
                </p>
              </div>

              {/* Agent switcher */}
              <div className="flex items-center gap-1.5">
                {agentOptions.map((agent) => {
                  const Icon = agent.icon;
                  const isActive = activeAgent === agent.key;
                  return (
                    <button
                      key={agent.key}
                      onClick={() => handleSwitchAgent(agent.key)}
                      title={agent.label}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "text-muted-foreground hover:bg-secondary border border-transparent"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="hidden sm:inline">{agent.label.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Push offer button */}
              <button
                onClick={() => setShowOffers(!showOffers)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showOffers
                    ? "bg-accent/20 text-accent border border-accent/30"
                    : "bg-secondary text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Push Offer</span>
              </button>
            </div>

            {/* Active agent banner */}
            <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-md bg-secondary/50">
              <Bot className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-mono text-muted-foreground flex-1">
                {currentAgent?.label} is handling this conversation
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${currentAgent?.status === "active" ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
            </div>

            {/* Offer panel */}
            {showOffers && (
              <div className="mt-2 p-3 bg-secondary/30 border border-border rounded-md space-y-2">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Select offer to push
                </p>
                {offers.map((offer) => (
                  <button
                    key={offer.id}
                    onClick={() => handlePushOffer(offer)}
                    className="w-full text-left px-3 py-2 rounded-md border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{offer.label}</span>
                      <span className="text-[10px] font-mono text-primary">{offer.value}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{offer.description}</p>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-3 h-3" /> Send to {profile.name}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 space-y-4 overflow-auto">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.sender === "system" ? (
                  <div className="flex justify-center">
                    <div className="px-3 py-1.5 bg-secondary/50 border border-border rounded-full">
                      <p className="text-[10px] font-mono text-muted-foreground">{msg.content}</p>
            </div>
                  </div>
                ) : (
                  <div className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-md px-3 py-2 max-w-sm ${
                        msg.sender === "agent"
                          ? msg.type === "offer-sent"
                            ? "bg-accent/10 border border-accent/20"
                            : "bg-primary/10 border border-primary/20"
                          : "bg-secondary"
                      }`}
                    >
                      {msg.sender === "agent" && (
                        <p className="text-[10px] font-mono text-primary mb-1">
                          ↳ {currentAgent?.label}
                          {msg.type === "offer-sent" && " · OFFER"}
                        </p>
                      )}
                      <p className="text-sm text-foreground">{msg.content}</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {msg.time}
                        {msg.sender === "agent" && " · auto-reply"}
                      </p>
                    </div>
                  </div>
                )}

                {msg.type === "channel-prompt" && (
                  <div className="flex justify-end mt-3">
                    <div className="bg-secondary/50 border border-border rounded-md p-3 max-w-sm w-full space-y-2">
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-2">
                        Share your contact
                      </p>
                      {channelOptions.map((ch) => {
                        const shared = sharedChannels[ch.key];
                        const isEditing = editingChannel === ch.key;
                        const Icon = ch.icon;

                        if (shared) {
                          return (
                            <div
                              key={ch.key}
                              className="flex items-center gap-2 px-3 py-2 rounded-md bg-success/10 border border-success/20 text-sm"
                            >
                              <Check className="w-4 h-4 text-success shrink-0" />
                              <span className="text-foreground flex-1">{ch.label}</span>
                              <span className="text-xs font-mono text-muted-foreground">{shared}</span>
                            </div>
                          );
                        }

                        if (isEditing) {
                          return (
                            <div key={ch.key} className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                              <input
                                autoFocus
                                value={channelInput}
                                onChange={(e) => setChannelInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleShareChannel(ch.key)}
                                placeholder={ch.placeholder}
                                className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                              <button
                                onClick={() => handleShareChannel(ch.key)}
                                className="px-2 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:opacity-90 transition-opacity"
                              >
                                Share
                              </button>
                              <button
                                onClick={() => { setEditingChannel(null); setChannelInput(""); }}
                                className="px-2 py-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={ch.key}
                            onClick={() => { setEditingChannel(ch.key); setChannelInput(""); }}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-border hover:bg-secondary hover:border-primary/30 transition-colors text-sm text-foreground"
                          >
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            <span>{ch.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={isStreaming ? "Agent is responding..." : "Type as admin or let agent handle..."}
                disabled={isStreaming}
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !inputValue.trim()}
                className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Profile & Admin Panel */}
        {showProfile && (
          <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Customer Profile</span>
              <MoreHorizontal className="w-4 h-4 text-muted-foreground ml-auto" />
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Identity */}
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{profile.name.split(" ").map(n => n[0]).join("")}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{profile.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{profile.company}</p>
                </div>
              </div>

              {/* Lead score */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Lead Score</span>
                  <span className={`text-xs font-mono font-bold ${profile.leadScore >= 80 ? "text-success" : profile.leadScore >= 60 ? "text-warning" : "text-muted-foreground"}`}>
                    {profile.leadScore}/100
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${profile.leadScore >= 80 ? "bg-success" : profile.leadScore >= 60 ? "bg-warning" : "bg-muted-foreground"}`}
                    style={{ width: `${profile.leadScore}%` }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </span>
                <div className="flex flex-wrap gap-1">
                  {profile.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-sm bg-primary/10 border border-primary/20 text-[10px] font-mono text-primary">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact channels */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Channels</span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <AtSign className="w-3.5 h-3.5 text-info" />
                    <span className="text-foreground font-mono text-[11px] truncate">{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="w-3.5 h-3.5 text-success" />
                    <span className="text-foreground font-mono text-[11px]">{profile.whatsapp}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Instagram className="w-3.5 h-3.5 text-accent" />
                    <span className="text-foreground font-mono text-[11px]">{profile.instagram}</span>
                  </div>
                </div>
              </div>

              {/* Revenue */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Revenue</span>
                <p className="text-lg font-bold font-mono text-foreground">${profile.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] font-mono text-muted-foreground">Last: {profile.lastOrder}</p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Agent Notes</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{profile.notes}</p>
              </div>

              {/* Quick actions */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Quick Actions</span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setShowOffers(true)}
                    className="flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Gift className="w-3 h-3" /> Push Offer
                  </button>
                  <button className="flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors">
                    <Mail className="w-3 h-3" /> Email
                  </button>
                  <button className="flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors">
                    <MessageSquare className="w-3 h-3" /> WhatsApp
                  </button>
                  <button className="flex items-center justify-center gap-1 px-2 py-2 rounded-md bg-secondary border border-border text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors">
                    <Instagram className="w-3 h-3" /> IG DM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
