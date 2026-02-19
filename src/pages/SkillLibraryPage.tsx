import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useToast } from "@/hooks/use-toast";
import {
  BookMarked, Plus, Upload, Trash2, Search, Tag, Bot,
  FileText, Code, ClipboardList, Lightbulb, X, ChevronDown,
  Zap, Eye, Copy, Check
} from "lucide-react";

type Skill = {
  id: string;
  title: string;
  description: string;
  skill_type: string;
  content: string;
  tags: string[];
  assigned_agent_ids: string[];
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_active: boolean;
  usage_count: number;
  created_by: string;
  created_at: string;
};

type Agent = {
  id: string;
  name: string;
  agent_type: string;
  is_active: boolean;
};

const SKILL_TYPES = [
  { value: "prompt", label: "Prompt", icon: Lightbulb },
  { value: "script", label: "Script", icon: Code },
  { value: "sop", label: "SOP", icon: ClipboardList },
  { value: "document", label: "Document", icon: FileText },
];

const SUGGESTED_TAGS = [
  "onboarding", "sales", "support", "marketing", "retention",
  "analytics", "automation", "outreach", "follow-up", "closing",
  "content", "research", "reporting", "escalation", "pricing",
];

export default function SkillLibraryPage() {
  const { business } = useBusiness();
  const { toast } = useToast();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewSkill, setViewSkill] = useState<Skill | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    skill_type: "prompt",
    content: "",
    tags: [] as string[],
    assigned_agent_ids: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState("");

  const loadSkills = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("skill_library")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });
    setSkills((data as Skill[]) || []);
  }, [business]);

  const loadAgents = useCallback(async () => {
    if (!business) return;
    const { data } = await supabase
      .from("agent_configurations")
      .select("id, name, agent_type, is_active")
      .eq("business_id", business.id)
      .order("created_at");
    setAgents(data || []);
  }, [business]);

  useEffect(() => {
    loadSkills();
    loadAgents();
  }, [loadSkills, loadAgents]);

  const handleAddTag = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const toggleAgent = (agentId: string) => {
    setForm(prev => ({
      ...prev,
      assigned_agent_ids: prev.assigned_agent_ids.includes(agentId)
        ? prev.assigned_agent_ids.filter(id => id !== agentId)
        : [...prev.assigned_agent_ids, agentId],
    }));
  };

  const handleSubmit = async () => {
    if (!business || !form.title.trim()) return;
    setUploading(true);

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (file) {
      const ext = file.name.split(".").pop();
      const path = `${business.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("skill-files")
        .upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("skill-files").getPublicUrl(path);
      fileUrl = urlData.publicUrl;
      fileName = file.name;
      fileType = file.type;
    }

    const { error } = await supabase.from("skill_library").insert({
      business_id: business.id,
      title: form.title.trim(),
      description: form.description.trim(),
      skill_type: form.skill_type,
      content: form.content,
      tags: form.tags,
      assigned_agent_ids: form.assigned_agent_ids,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
    } as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Skill added", description: `"${form.title}" saved to library` });
      setForm({ title: "", description: "", skill_type: "prompt", content: "", tags: [], assigned_agent_ids: [] });
      setFile(null);
      setShowForm(false);
      loadSkills();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("skill_library").delete().eq("id", id);
    setViewSkill(null);
    loadSkills();
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: "Copied", description: "Content copied to clipboard" });
  };

  // Filter skills
  const filtered = skills.filter(s => {
    if (filterType && s.skill_type !== filterType) return false;
    if (filterTag && !s.tags.includes(filterTag)) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.tags.some(t => t.includes(q));
    }
    return true;
  });

  const allTags = [...new Set(skills.flatMap(s => s.tags))];
  const agentMap = Object.fromEntries(agents.map(a => [a.id, a]));

  const SkillIcon = SKILL_TYPES.find(t => t.value === (viewSkill?.skill_type || ""))?.icon || FileText;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookMarked className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Skill Library</h1>
            <p className="text-xs text-muted-foreground font-mono">Prompts · Scripts · SOPs · Documents</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Skill
        </button>
      </div>

      {/* Add Skill Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">New Skill</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type selector */}
          <div className="flex gap-2">
            {SKILL_TYPES.map(st => {
              const Icon = st.icon;
              const active = form.skill_type === st.value;
              return (
                <button
                  key={st.value}
                  onClick={() => setForm(prev => ({ ...prev, skill_type: st.value }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
                >
                  <Icon className="w-3.5 h-3.5" /> {st.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Cold Outreach Script"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What does this skill do?"
                className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Content (prompt, script, or SOP text)</label>
            <textarea
              value={form.content}
              onChange={e => setForm(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Paste your prompt, script, or SOP here..."
              rows={6}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Attach File (optional)</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-md text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5" />
                {file ? file.name : "Choose file..."}
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} accept=".pdf,.txt,.md,.js,.ts,.py,.json,.csv,.doc,.docx" />
              </label>
              {file && (
                <button onClick={() => setFile(null)} className="text-xs text-muted-foreground hover:text-destructive">
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddTag(tagInput))}
                placeholder="Add tag..."
                className="flex-1 px-3 py-1.5 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {SUGGESTED_TAGS.filter(t => !form.tags.includes(t)).slice(0, 8).map(tag => (
                <button key={tag} onClick={() => handleAddTag(tag)} className="px-2 py-0.5 bg-secondary border border-border rounded-full text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                  + {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Assign to agents */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Assign to Agents (optional)</label>
            <div className="flex flex-wrap gap-1.5">
              {agents.filter(a => a.is_active).map(agent => {
                const selected = form.assigned_agent_ids.includes(agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors ${selected ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
                  >
                    <Bot className="w-3 h-3" />
                    {agent.name}
                    {selected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.title.trim() || uploading}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? "Saving..." : "Save Skill"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterType(null)}
            className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${!filterType ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            All
          </button>
          {SKILL_TYPES.map(st => {
            const Icon = st.icon;
            return (
              <button
                key={st.value}
                onClick={() => setFilterType(filterType === st.value ? null : st.value)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${filterType === st.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="w-3 h-3" /> {st.label}
              </button>
            );
          })}
        </div>
        {allTags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {allTags.slice(0, 6).map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`px-2 py-1 rounded-full text-[10px] border transition-colors ${filterTag === tag ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground border-border hover:text-foreground"}`}
              >
                <Tag className="w-2.5 h-2.5 inline mr-0.5" />{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Skills Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <BookMarked className="w-10 h-10 text-primary mx-auto opacity-30" />
          <p className="text-sm text-muted-foreground">
            {skills.length === 0 ? "No skills yet. Add prompts, scripts, SOPs, or documents for your agents." : "No skills match your filters."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(skill => {
            const TypeIcon = SKILL_TYPES.find(t => t.value === skill.skill_type)?.icon || FileText;
            const assignedAgents = skill.assigned_agent_ids?.map(id => agentMap[id]).filter(Boolean) || [];
            return (
              <button
                key={skill.id}
                onClick={() => setViewSkill(skill)}
                className="text-left bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="w-4 h-4 text-primary shrink-0" />
                    <h3 className="text-sm font-medium text-foreground truncate">{skill.title}</h3>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">{skill.skill_type}</span>
                </div>
                {skill.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{skill.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {skill.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 bg-secondary rounded text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                  {skill.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{skill.tags.length - 3}</span>}
                </div>
                {assignedAgents.length > 0 && (
                  <div className="flex items-center gap-1 pt-1 border-t border-border">
                    <Bot className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {assignedAgents.map(a => a.name).join(", ")}
                    </span>
                  </div>
                )}
                {skill.file_name && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground truncate">{skill.file_name}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* View Skill Modal */}
      {viewSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setViewSkill(null)}>
          <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SkillIcon className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">{viewSkill.title}</h2>
                <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary px-2 py-0.5 rounded">{viewSkill.skill_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDelete(viewSkill.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewSkill(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {viewSkill.description && (
                <p className="text-sm text-muted-foreground">{viewSkill.description}</p>
              )}
              {viewSkill.content && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Content</span>
                    <button onClick={() => handleCopyContent(viewSkill.content)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="p-3 bg-secondary border border-border rounded-md text-xs text-foreground font-mono whitespace-pre-wrap max-h-64 overflow-auto">{viewSkill.content}</pre>
                </div>
              )}
              {viewSkill.file_name && (
                <div className="flex items-center gap-2 p-3 bg-secondary border border-border rounded-md">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="text-sm text-foreground">{viewSkill.file_name}</span>
                  {viewSkill.file_url && (
                    <a href={viewSkill.file_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-primary hover:underline">Download</a>
                  )}
                </div>
              )}
              {viewSkill.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {viewSkill.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">{tag}</span>
                  ))}
                </div>
              )}
              {viewSkill.assigned_agent_ids?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Assigned Agents</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewSkill.assigned_agent_ids.map(id => {
                      const agent = agentMap[id];
                      if (!agent) return null;
                      return (
                        <span key={id} className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-border rounded-md text-xs text-foreground">
                          <Bot className="w-3 h-3 text-primary" /> {agent.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="text-[10px] font-mono text-muted-foreground">
                Created {new Date(viewSkill.created_at).toLocaleDateString()} · Used {viewSkill.usage_count} times
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
