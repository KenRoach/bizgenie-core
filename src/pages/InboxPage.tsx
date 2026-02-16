import { useState } from "react";
import { MessageSquare, Mail, Send, Clock, Instagram, Phone, AtSign, Check } from "lucide-react";

interface Message {
  id: number;
  sender: "customer" | "agent";
  content: string;
  time: string;
  type?: "text" | "channel-prompt";
}

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

const channelOptions = [
  { key: "email", label: "Email", icon: AtSign, placeholder: "you@company.com" },
  { key: "whatsapp", label: "WhatsApp", icon: Phone, placeholder: "+1 234 567 8900" },
  { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "@yourhandle" },
];

export default function InboxPage() {
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

  const handleSend = () => {
    if (!inputValue.trim()) return;
    const newMsg: Message = {
      id: messages.length + 100,
      sender: "customer",
      content: inputValue,
      time: "now",
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputValue("");

    // Simulate agent reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 101,
          sender: "agent",
          content: "Got it! I'll get back to you shortly with the details.",
          time: "now",
        },
      ]);
    }, 1200);
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
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`rounded-md px-3 py-2 max-w-sm ${
                      msg.sender === "agent"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-secondary"
                    }`}
                  >
                    {msg.sender === "agent" && (
                      <p className="text-[10px] font-mono text-primary mb-1">↳ Sales Agent</p>
                    )}
                    <p className="text-sm text-foreground">{msg.content}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {msg.time}
                      {msg.sender === "agent" && " · auto-reply"}
                    </p>
                  </div>
                </div>

                {/* Channel sharing prompt after agent asks */}
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
          </div>

          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                className="flex items-center justify-center w-9 h-9 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
