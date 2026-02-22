import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import {
  Plus, Copy, Pencil, Trash2, Loader2, Link as LinkIcon, X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CheckoutLink {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  amount: number;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "kitz-badge-info",
  sent: "kitz-badge-warning",
  paid: "kitz-badge-live",
  expired: "kitz-badge-error",
};

const emptyForm = {
  title: "",
  description: "",
  amount: 0,
  buyer_name: "",
  buyer_phone: "",
  buyer_email: "",
  status: "draft",
};

export default function CheckoutLinksPage() {
  const { business } = useBusiness();
  const { toast } = useToast();
  const [links, setLinks] = useState<CheckoutLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CheckoutLink | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchLinks = async () => {
    if (!business) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("checkout_links")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    setLinks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, [business?.id]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (link: CheckoutLink) => {
    setEditing(link);
    setForm({
      title: link.title,
      description: link.description || "",
      amount: link.amount,
      buyer_name: link.buyer_name || "",
      buyer_phone: link.buyer_phone || "",
      buyer_email: link.buyer_email || "",
      status: link.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!business || !form.title) return;
    setSaving(true);
    const payload = {
      title: form.title,
      description: form.description || null,
      amount: Number(form.amount),
      buyer_name: form.buyer_name || null,
      buyer_phone: form.buyer_phone || null,
      buyer_email: form.buyer_email || null,
      status: form.status,
    };

    if (editing) {
      await (supabase as any).from("checkout_links").update(payload).eq("id", editing.id);
    } else {
      await (supabase as any).from("checkout_links").insert({ ...payload, business_id: business.id });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchLinks();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("checkout_links").delete().eq("id", id);
    fetchLinks();
  };

  const copyLink = (link: CheckoutLink) => {
    const url = `${window.location.origin}/pay/${link.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: url });
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Checkout Links</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Create and manage payment links</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> New Link
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : links.length === 0 ? (
        <div className="text-center py-20">
          <LinkIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No checkout links yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div key={link.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-md hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{link.title}</span>
                  <span className={STATUS_COLORS[link.status] || "kitz-badge-info"}>{link.status.toUpperCase()}</span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                  ${Number(link.amount).toFixed(2)}
                  {link.buyer_name && ` • ${link.buyer_name}`}
                  {link.buyer_email && ` • ${link.buyer_email}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => copyLink(link)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Copy link">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openEdit(link)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(link.id)} className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-md p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{editing ? "Edit Link" : "New Checkout Link"}</h2>
                <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Amount</label>
                  <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Buyer Name</label>
                    <input value={form.buyer_name} onChange={(e) => setForm({ ...form, buyer_name: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Buyer Phone</label>
                    <input value={form.buyer_phone} onChange={(e) => setForm({ ...form, buyer_phone: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Buyer Email</label>
                  <input type="email" value={form.buyer_email} onChange={(e) => setForm({ ...form, buyer_email: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setDialogOpen(false)} className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.title} className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : editing ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
