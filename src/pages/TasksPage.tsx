import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { Plus, Loader2, X, GripVertical } from "lucide-react";

interface Task {
  id: string;
  business_id: string;
  title: string;
  status: string;
  created_at: string;
}

const COLUMNS = [
  { key: "todo", label: "Todo", color: "bg-info" },
  { key: "doing", label: "Doing", color: "bg-warning" },
  { key: "done", label: "Done", color: "bg-success" },
];

export default function TasksPage() {
  const { business } = useBusiness();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", status: "todo" });
  const [saving, setSaving] = useState(false);

  const fetchTasks = async () => {
    if (!business) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("tasks")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [business?.id]);

  const openCreate = (status = "todo") => {
    setEditing(null);
    setForm({ title: "", status });
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({ title: task.title, status: task.status });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!business || !form.title) return;
    setSaving(true);
    if (editing) {
      await (supabase as any).from("tasks").update({ title: form.title, status: form.status }).eq("id", editing.id);
    } else {
      await (supabase as any).from("tasks").insert({ title: form.title, status: form.status, business_id: business.id });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchTasks();
  };

  const cycleStatus = async (task: Task) => {
    const next = task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";
    await (supabase as any).from("tasks").update({ status: next }).eq("id", task.id);
    fetchTasks();
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">Manage your work</p>
        </div>
        <button onClick={() => openCreate()} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:opacity-90 transition-opacity">
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="bg-card border border-border rounded-md">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.color}`} />
                    <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                    <span className="text-[10px] font-mono text-muted-foreground">{colTasks.length}</span>
                  </div>
                  <button onClick={() => openCreate(col.key)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-2 space-y-1.5 min-h-[120px] max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                  {colTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No tasks</p>
                  ) : (
                    colTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => cycleStatus(task)}
                        onDoubleClick={() => openEdit(task)}
                        className="w-full text-left px-3 py-2.5 bg-secondary/50 border border-border/50 rounded-md hover:border-primary/30 transition-colors group"
                      >
                        <p className="text-sm text-foreground truncate">{task.title}</p>
                        <p className="text-[10px] font-mono text-muted-foreground mt-1">{formatDate(task.created_at)}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      {dialogOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setDialogOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-lg w-full max-w-sm p-5 space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">{editing ? "Edit Task" : "New Task"}</h2>
                <button onClick={() => setDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                </div>
                <div>
                  <label className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="todo">Todo</option>
                    <option value="doing">Doing</option>
                    <option value="done">Done</option>
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
