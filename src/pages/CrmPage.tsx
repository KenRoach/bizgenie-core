import { Search, Filter, Plus, Mail, MessageSquare, MoreHorizontal, Loader2, X, ChevronRight, ArrowLeft, Trash2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";
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

const PIPELINE_STAGES = ["new", "lead", "qualified", "proposal", "negotiation", "closed"];

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

/* ─── Add Contact Modal ─── */
function AddContactModal({ businessId, onClose, onCreated }: { businessId: string; onClose: () => void; onCreated: (c: Contact) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", whatsapp: "", instagram: "", pipeline_stage: "new", notes: "" });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        business_id: businessId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim() || null,
        pipeline_stage: form.pipeline_stage,
        notes: form.notes.trim() || null,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Contact created");
    onCreated(data as Contact);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Add Contact</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <Field label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="John Doe" />
          <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="john@example.com" />
          <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+1 234 567 890" />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="+1 234 567 890" />
          <Field label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="@handle" />
          <div className="space-y-1">
            <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Stage</label>
            <select value={form.pipeline_stage} onChange={(e) => setForm({ ...form, pipeline_stage: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Optional notes..." multiline />
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Contact Detail View ─── */
function ContactDetail({ contact, onBack, onUpdate, onDelete }: { contact: Contact; onBack: () => void; onUpdate: (c: Contact) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: contact.name,
    email: contact.email || "",
    phone: contact.phone || "",
    whatsapp: contact.whatsapp || "",
    instagram: contact.instagram || "",
    pipeline_stage: contact.pipeline_stage || "new",
    notes: contact.notes || "",
    lead_score: contact.lead_score || 0,
  });

  const handleSave = async () => {
    setSaving(true);
    const { data, error } = await supabase
      .from("contacts")
      .update({
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        instagram: form.instagram.trim() || null,
        pipeline_stage: form.pipeline_stage,
        notes: form.notes.trim() || null,
        lead_score: form.lead_score,
      })
      .eq("id", contact.id)
      .select()
      .single();
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success("Contact updated");
    onUpdate(data as Contact);
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this contact?")) return;
    const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Contact deleted");
    onDelete(contact.id);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-secondary/80"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">{contact.name}</h1>
          <p className="text-xs font-mono text-muted-foreground">{contact.email || "No email"} • {(contact.pipeline_stage || "new").toUpperCase()}</p>
        </div>
        <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 text-xs bg-secondary text-foreground rounded-md hover:bg-secondary/80">{editing ? "Cancel" : "Edit"}</button>
        <button onClick={handleDelete} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-md p-4 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Contact Info</h3>
          {editing ? (
            <>
              <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} />
              <Field label="Instagram" value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} />
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="Email" value={contact.email} />
              <InfoRow label="Phone" value={contact.phone} />
              <InfoRow label="WhatsApp" value={contact.whatsapp} />
              <InfoRow label="Instagram" value={contact.instagram} />
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-md p-4 space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Pipeline & Score</h3>
          {editing ? (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Stage</label>
                <select value={form.pipeline_stage} onChange={(e) => setForm({ ...form, pipeline_stage: e.target.value })} className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              <Field label="Lead Score" value={String(form.lead_score)} onChange={(v) => setForm({ ...form, lead_score: parseInt(v) || 0 })} />
              <Field label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline />
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stage</span>
                <span className={stageColors[contact.pipeline_stage || "new"]}>{(contact.pipeline_stage || "new").toUpperCase()}</span>
              </div>
              <InfoRow label="Lead Score" value={String(contact.lead_score || 0)} />
              <InfoRow label="Revenue" value={`$${Number(contact.total_revenue || 0).toLocaleString()}`} />
              <InfoRow label="Notes" value={contact.notes} />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save Changes
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-md p-4 space-y-2">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Timestamps</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Created: {new Date(contact.created_at).toLocaleString()}</p>
          <p>Updated: {new Date(contact.updated_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared UI components ─── */
function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const cls = "w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls + " resize-y"} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-mono text-xs">{value || "—"}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function CrmPage() {
  const { business } = useBusiness();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

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

  if (selectedContact) {
    return (
      <ContactDetail
        contact={selectedContact}
        onBack={() => setSelectedContact(null)}
        onUpdate={(updated) => {
          setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          setSelectedContact(updated);
        }}
        onDelete={(id) => {
          setContacts((prev) => prev.filter((c) => c.id !== id));
          setSelectedContact(null);
        }}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Contacts</h1>
          <p className="text-xs font-mono text-muted-foreground">{contacts.length} contacts in pipeline</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {showAdd && business && (
        <AddContactModal
          businessId={business.id}
          onClose={() => setShowAdd(false)}
          onCreated={(c) => setContacts((prev) => [c, ...prev])}
        />
      )}

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
          <p className="text-sm text-muted-foreground">No contacts yet.</p>
          <button onClick={() => setShowAdd(true)} className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90">
            <Plus className="w-3 h-3" /> Create your first contact
          </button>
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
                    <tr key={contact.id} className="hover:bg-secondary/30 transition-colors cursor-pointer" onClick={() => setSelectedContact(contact)}>
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
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
