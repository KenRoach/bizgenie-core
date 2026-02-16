import { Search, Filter, Plus, Phone, Mail, MessageSquare, MoreHorizontal } from "lucide-react";
import { useState } from "react";

const contacts = [
  { id: 1, name: "Sarah Kim", company: "TechFlow Inc.", email: "sarah@techflow.io", phone: "+1 555-0123", channel: "whatsapp", stage: "qualified", value: "$12,500", lastContact: "2h ago" },
  { id: 2, name: "Ahmed Rashid", company: "GreenLeaf Co.", email: "ahmed@greenleaf.co", phone: "+971 50-123", channel: "whatsapp", stage: "negotiation", value: "$8,200", lastContact: "15m ago" },
  { id: 3, name: "Maria Lopez", company: "Bright Studios", email: "maria@bright.studio", phone: "+34 612-345", channel: "email", stage: "proposal", value: "$24,000", lastContact: "1d ago" },
  { id: 4, name: "James Park", company: "DataWorks", email: "james@dataworks.io", phone: "+44 7700-900", channel: "email", stage: "lead", value: "$5,000", lastContact: "3h ago" },
  { id: 5, name: "Fatima Al-Sayed", company: "Luxe Retail", email: "fatima@luxe.ae", phone: "+971 55-987", channel: "instagram", stage: "qualified", value: "$18,000", lastContact: "30m ago" },
  { id: 6, name: "Tom Chen", company: "CloudBase", email: "tom@cloudbase.dev", phone: "+86 138-0000", channel: "web", stage: "closed", value: "$32,000", lastContact: "5d ago" },
];

const stageColors: Record<string, string> = {
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

export default function CrmPage() {
  const [search, setSearch] = useState("");
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase())
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

      {/* Table */}
      <div className="bg-card border border-border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden md:table-cell">Channel</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">Stage</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden sm:table-cell">Value</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium hidden lg:table-cell">Last Contact</th>
                <th className="w-10 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((contact) => (
                <tr key={contact.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-foreground">{contact.name}</p>
                      <p className="text-[11px] text-muted-foreground">{contact.company}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {channelIcon[contact.channel]}
                      <span className="text-xs font-mono capitalize">{contact.channel}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={stageColors[contact.stage]}>
                      {contact.stage.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-mono text-foreground">{contact.value}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="text-xs font-mono text-muted-foreground">{contact.lastContact}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
