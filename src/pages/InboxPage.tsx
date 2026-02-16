import { MessageSquare, Mail, Send, Clock } from "lucide-react";

const conversations = [
  { id: 1, name: "Ahmed Rashid", channel: "whatsapp", preview: "Hi, what's the pricing for the growth plan?", time: "15m ago", unread: true },
  { id: 2, name: "James Park", channel: "email", preview: "Following up on our conversation last week...", time: "1h ago", unread: true },
  { id: 3, name: "Sarah Kim", channel: "whatsapp", preview: "Order confirmed, thanks!", time: "2h ago", unread: false },
  { id: 4, name: "Fatima Al-Sayed", channel: "instagram", preview: "Can I get a bulk discount?", time: "4h ago", unread: false },
  { id: 5, name: "Maria Lopez", channel: "email", preview: "Please send the updated proposal", time: "1d ago", unread: false },
];

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-4 h-4 text-success" />,
  email: <Mail className="w-4 h-4 text-info" />,
  instagram: <MessageSquare className="w-4 h-4 text-accent" />,
};

export default function InboxPage() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-foreground">Inbox</h1>
        <p className="text-xs font-mono text-muted-foreground">Omnichannel messages — 2 unread</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)]">
        {/* Conversation list */}
        <div className="bg-card border border-border rounded-md overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border">
            <input
              type="text"
              placeholder="Search messages..."
              className="w-full px-3 py-1.5 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1 overflow-auto divide-y divide-border">
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors ${c.unread ? "bg-secondary/20" : ""}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {channelIcons[c.channel]}
                  <span className="text-sm font-medium text-foreground flex-1">{c.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{c.time}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.preview}</p>
                {c.unread && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mt-1" />}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="lg:col-span-2 bg-card border border-border rounded-md flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">Ahmed Rashid</p>
              <p className="text-[10px] font-mono text-muted-foreground">WhatsApp · GreenLeaf Co.</p>
            </div>
            <span className="ml-auto kitz-badge-live">SALES AGENT ACTIVE</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-auto">
            <div className="flex justify-start">
              <div className="bg-secondary rounded-md px-3 py-2 max-w-sm">
                <p className="text-sm text-foreground">Hi, what's the pricing for the growth plan?</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 15m ago
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-primary/10 border border-primary/20 rounded-md px-3 py-2 max-w-sm">
                <p className="text-[10px] font-mono text-primary mb-1">↳ Sales Agent</p>
                <p className="text-sm text-foreground">
                  Hi Ahmed! The Growth Plan is $2,200/month and includes 5 user seats,
                  priority support, and all integrations. Want me to send a detailed breakdown?
                </p>
                <p className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 14m ago · auto-reply
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
