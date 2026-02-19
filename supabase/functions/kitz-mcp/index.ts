import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(supabaseUrl, serviceRoleKey);
}

const mcpServer = new McpServer({
  name: "kitz-services",
  version: "2.0.0",
});

// Helper for text responses
const txt = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const ok = (data: unknown) => txt(JSON.stringify(data, null, 2));
const err = (e: { message: string }) => txt(`Error: ${e.message}`);

// ═══════════════════════════════════════════════════════════════════
// AGENTS
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_agents", {
  description: "List all AI agents configured for a business.",
  schema: { business_id: { type: "string", description: "Business UUID" } },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase()
      .from("agent_configurations")
      .select("id, name, agent_type, model, is_active, nhi_identifier, system_prompt, permissions, token_ttl_minutes, created_at, updated_at")
      .eq("business_id", business_id).order("created_at");
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("get_agent", {
  description: "Get detailed configuration for a specific agent.",
  schema: { agent_id: { type: "string", description: "Agent UUID" } },
  handler: async ({ agent_id }: { agent_id: string }) => {
    const { data, error } = await getSupabase()
      .from("agent_configurations").select("*").eq("id", agent_id).single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_agent", {
  description: "Create a new AI agent. Agent types: ceo, coo, cfo, cto, cpo, cro, sales, ops, marketing, support, onboarding, analytics, growth, content, retention, crm, followup, custom.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    name: { type: "string", description: "Agent name" },
    agent_type: { type: "string", description: "Agent role type" },
    model: { type: "string", description: "LLM model identifier (optional)" },
    system_prompt: { type: "string", description: "System prompt (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, name, agent_type, model, system_prompt } = args as {
      business_id: string; name: string; agent_type: string; model?: string; system_prompt?: string;
    };
    const { data, error } = await getSupabase()
      .from("agent_configurations")
      .insert({ business_id, name, agent_type, model: model || undefined, system_prompt: system_prompt || null })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_agent", {
  description: "Update an existing agent's configuration.",
  schema: {
    agent_id: { type: "string", description: "Agent UUID" },
    name: { type: "string", description: "New name (optional)" },
    model: { type: "string", description: "New model (optional)" },
    system_prompt: { type: "string", description: "New system prompt (optional)" },
    is_active: { type: "boolean", description: "Enable/disable agent (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { agent_id, ...updates } = args as { agent_id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase()
      .from("agent_configurations").update(clean).eq("id", agent_id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_agent", {
  description: "Delete an agent configuration permanently.",
  schema: { agent_id: { type: "string", description: "Agent UUID" } },
  handler: async ({ agent_id }: { agent_id: string }) => {
    const { error } = await getSupabase()
      .from("agent_configurations").delete().eq("id", agent_id);
    return error ? err(error) : txt("Agent deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_knowledge", {
  description: "List knowledge base entries for a business.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    category: { type: "string", description: "Filter by category (optional)" },
    limit: { type: "number", description: "Max entries (default 50)" },
  },
  handler: async ({ business_id, category, limit }: { business_id: string; category?: string; limit?: number }) => {
    let q = getSupabase().from("agent_knowledge")
      .select("id, category, title, content, source, created_by, created_at, updated_at")
      .eq("business_id", business_id).order("updated_at", { ascending: false }).limit(limit || 50);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("add_knowledge", {
  description: "Add a new knowledge base entry.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    category: { type: "string", description: "Category (optional)" },
    title: { type: "string", description: "Title" },
    content: { type: "string", description: "Content" },
  },
  handler: async ({ business_id, category, title, content }: { business_id: string; category?: string; title: string; content: string }) => {
    const { data, error } = await getSupabase().from("agent_knowledge")
      .insert({ business_id, category: category || "general", title, content, source: "mcp", created_by: "claude-code" })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_knowledge", {
  description: "Update an existing knowledge base entry.",
  schema: {
    id: { type: "string", description: "Knowledge entry UUID" },
    title: { type: "string", description: "New title (optional)" },
    content: { type: "string", description: "New content (optional)" },
    category: { type: "string", description: "New category (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("agent_knowledge").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_knowledge", {
  description: "Delete a knowledge base entry.",
  schema: { id: { type: "string", description: "Knowledge entry UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("agent_knowledge").delete().eq("id", id);
    return error ? err(error) : txt("Knowledge entry deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// GOALS
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_goals", {
  description: "List strategic goals for a business.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    goal_type: { type: "string", description: "Filter: annual, quarterly, weekly (optional)" },
  },
  handler: async ({ business_id, goal_type }: { business_id: string; goal_type?: string }) => {
    let q = getSupabase().from("agent_goals")
      .select("id, goal_type, title, description, status, progress, period_start, period_end, parent_goal_id, created_at")
      .eq("business_id", business_id).order("goal_type").order("created_at");
    if (goal_type) q = q.eq("goal_type", goal_type);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_goal", {
  description: "Create a new strategic goal.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    goal_type: { type: "string", description: "annual, quarterly, or weekly" },
    title: { type: "string", description: "Goal title" },
    description: { type: "string", description: "Goal description (optional)" },
    period_start: { type: "string", description: "Start date YYYY-MM-DD (optional)" },
    period_end: { type: "string", description: "End date YYYY-MM-DD (optional)" },
    parent_goal_id: { type: "string", description: "Parent goal UUID (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, goal_type, title, description, period_start, period_end, parent_goal_id } = args as {
      business_id: string; goal_type: string; title: string; description?: string;
      period_start?: string; period_end?: string; parent_goal_id?: string;
    };
    const { data, error } = await getSupabase().from("agent_goals")
      .insert({ business_id, goal_type, title, description: description || null, period_start: period_start || null, period_end: period_end || null, parent_goal_id: parent_goal_id || null })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_goal", {
  description: "Update a goal's title, description, status, or progress.",
  schema: {
    id: { type: "string", description: "Goal UUID" },
    title: { type: "string", description: "New title (optional)" },
    description: { type: "string", description: "New description (optional)" },
    status: { type: "string", description: "active, completed, cancelled (optional)" },
    progress: { type: "number", description: "Progress 0-100 (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("agent_goals").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_goal", {
  description: "Delete a goal.",
  schema: { id: { type: "string", description: "Goal UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("agent_goals").delete().eq("id", id);
    return error ? err(error) : txt("Goal deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// CONTACTS (CRM)
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_contacts", {
  description: "List CRM contacts for a business.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    pipeline_stage: { type: "string", description: "Filter by stage (optional)" },
    limit: { type: "number", description: "Max contacts (default 100)" },
  },
  handler: async ({ business_id, pipeline_stage, limit }: { business_id: string; pipeline_stage?: string; limit?: number }) => {
    let q = getSupabase().from("contacts")
      .select("id, name, email, phone, pipeline_stage, lead_score, total_revenue, tags, created_at")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(limit || 100);
    if (pipeline_stage) q = q.eq("pipeline_stage", pipeline_stage);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_contact", {
  description: "Create a new CRM contact.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    name: { type: "string", description: "Contact name" },
    email: { type: "string", description: "Email (optional)" },
    phone: { type: "string", description: "Phone (optional)" },
    pipeline_stage: { type: "string", description: "new, qualified, proposal, won, lost (optional)" },
    tags: { type: "string", description: "Comma-separated tags (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, name, email, phone, pipeline_stage, tags } = args as {
      business_id: string; name: string; email?: string; phone?: string; pipeline_stage?: string; tags?: string;
    };
    const { data, error } = await getSupabase().from("contacts")
      .insert({ business_id, name, email: email || null, phone: phone || null, pipeline_stage: pipeline_stage || "new", tags: tags ? tags.split(",").map(t => t.trim()) : [] })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_contact", {
  description: "Update an existing contact.",
  schema: {
    id: { type: "string", description: "Contact UUID" },
    name: { type: "string", description: "Name (optional)" },
    email: { type: "string", description: "Email (optional)" },
    phone: { type: "string", description: "Phone (optional)" },
    pipeline_stage: { type: "string", description: "Pipeline stage (optional)" },
    lead_score: { type: "number", description: "Lead score (optional)" },
    notes: { type: "string", description: "Notes (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("contacts").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_contact", {
  description: "Delete a CRM contact.",
  schema: { id: { type: "string", description: "Contact UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("contacts").delete().eq("id", id);
    return error ? err(error) : txt("Contact deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_orders", {
  description: "List orders for a business.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    status: { type: "string", description: "Filter by status (optional)" },
    limit: { type: "number", description: "Max orders (default 100)" },
  },
  handler: async ({ business_id, status, limit }: { business_id: string; status?: string; limit?: number }) => {
    let q = getSupabase().from("orders")
      .select("id, order_number, status, total, currency, payment_status, items, contact_id, created_at")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(limit || 100);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_order", {
  description: "Create a new order.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    order_number: { type: "string", description: "Order number" },
    total: { type: "number", description: "Order total" },
    contact_id: { type: "string", description: "Contact UUID (optional)" },
    items: { type: "string", description: "JSON array of items (optional)" },
    currency: { type: "string", description: "Currency code (default USD)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, order_number, total, contact_id, items, currency } = args as {
      business_id: string; order_number: string; total: number; contact_id?: string; items?: string; currency?: string;
    };
    const { data, error } = await getSupabase().from("orders")
      .insert({ business_id, order_number, total, contact_id: contact_id || null, items: items ? JSON.parse(items) : [], currency: currency || "USD" })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_order", {
  description: "Update an order's status or payment status.",
  schema: {
    id: { type: "string", description: "Order UUID" },
    status: { type: "string", description: "pending, processing, shipped, delivered, cancelled" },
    payment_status: { type: "string", description: "unpaid, paid, refunded" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("orders").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_order", {
  description: "Delete an order.",
  schema: { id: { type: "string", description: "Order UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("orders").delete().eq("id", id);
    return error ? err(error) : txt("Order deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// FEEDBACK
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_feedback", {
  description: "List feedback entries for a business.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    status: { type: "string", description: "Filter: new, in_progress, resolved, dismissed (optional)" },
    limit: { type: "number", description: "Max entries (default 50)" },
  },
  handler: async ({ business_id, status, limit }: { business_id: string; status?: string; limit?: number }) => {
    let q = getSupabase().from("feedback")
      .select("id, title, content, category, sentiment, priority, status, source, fix_type, created_at, resolved_at")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(limit || 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_feedback", {
  description: "Create a new feedback entry.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    title: { type: "string", description: "Feedback title" },
    content: { type: "string", description: "Feedback content" },
    category: { type: "string", description: "Category (optional)" },
    priority: { type: "string", description: "low, medium, high, critical (optional)" },
    sentiment: { type: "string", description: "positive, neutral, negative (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, title, content, category, priority, sentiment } = args as {
      business_id: string; title: string; content: string; category?: string; priority?: string; sentiment?: string;
    };
    const { data, error } = await getSupabase().from("feedback")
      .insert({ business_id, title, content, category: category || "general", priority: priority || "medium", sentiment: sentiment || "neutral", source: "mcp" })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_feedback", {
  description: "Update a feedback entry (e.g. resolve it).",
  schema: {
    id: { type: "string", description: "Feedback UUID" },
    status: { type: "string", description: "new, in_progress, resolved, dismissed (optional)" },
    resolution_notes: { type: "string", description: "Resolution notes (optional)" },
    priority: { type: "string", description: "Priority (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    if (clean.status === "resolved") clean.resolved_at = new Date().toISOString();
    const { data, error } = await getSupabase().from("feedback").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_feedback", {
  description: "Delete a feedback entry.",
  schema: { id: { type: "string", description: "Feedback UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("feedback").delete().eq("id", id);
    return error ? err(error) : txt("Feedback deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// SKILLS
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_skills", {
  description: "List skill library entries for a business.",
  schema: { business_id: { type: "string", description: "Business UUID" } },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase().from("skill_library")
      .select("id, title, description, skill_type, tags, is_active, usage_count, assigned_agent_ids, created_at")
      .eq("business_id", business_id).order("created_at", { ascending: false });
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_skill", {
  description: "Create a new skill in the library.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    title: { type: "string", description: "Skill title" },
    description: { type: "string", description: "Skill description (optional)" },
    content: { type: "string", description: "Skill content/prompt (optional)" },
    skill_type: { type: "string", description: "prompt, template, playbook (optional)" },
    tags: { type: "string", description: "Comma-separated tags (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, title, description, content, skill_type, tags } = args as {
      business_id: string; title: string; description?: string; content?: string; skill_type?: string; tags?: string;
    };
    const { data, error } = await getSupabase().from("skill_library")
      .insert({ business_id, title, description: description || "", content: content || "", skill_type: skill_type || "prompt", tags: tags ? tags.split(",").map(t => t.trim()) : [], created_by: "claude-code" })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_skill", {
  description: "Update a skill library entry.",
  schema: {
    id: { type: "string", description: "Skill UUID" },
    title: { type: "string", description: "Title (optional)" },
    description: { type: "string", description: "Description (optional)" },
    content: { type: "string", description: "Content (optional)" },
    is_active: { type: "boolean", description: "Enable/disable (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("skill_library").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_skill", {
  description: "Delete a skill from the library.",
  schema: { id: { type: "string", description: "Skill UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("skill_library").delete().eq("id", id);
    return error ? err(error) : txt("Skill deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// TOOL REGISTRY
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_tools", {
  description: "List registered tools for a business.",
  schema: { business_id: { type: "string", description: "Business UUID" } },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase().from("tool_registry")
      .select("id, name, description, risk_level, is_active, is_verified, max_calls_per_minute, total_invocations, data_scope, created_at")
      .eq("business_id", business_id).order("name");
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_tool_entry", {
  description: "Register a new tool in the tool registry.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    name: { type: "string", description: "Tool name" },
    description: { type: "string", description: "Description (optional)" },
    risk_level: { type: "string", description: "low, medium, high, critical (optional)" },
    max_calls_per_minute: { type: "number", description: "Rate limit (optional, default 60)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, name, description, risk_level, max_calls_per_minute } = args as {
      business_id: string; name: string; description?: string; risk_level?: string; max_calls_per_minute?: number;
    };
    const { data, error } = await getSupabase().from("tool_registry")
      .insert({ business_id, name, description: description || null, risk_level: risk_level || "low", max_calls_per_minute: max_calls_per_minute || 60 })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_tool_entry", {
  description: "Update a tool registry entry.",
  schema: {
    id: { type: "string", description: "Tool UUID" },
    name: { type: "string", description: "Name (optional)" },
    description: { type: "string", description: "Description (optional)" },
    risk_level: { type: "string", description: "Risk level (optional)" },
    is_active: { type: "boolean", description: "Enable/disable (optional)" },
    is_verified: { type: "boolean", description: "Verified status (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("tool_registry").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_tool_entry", {
  description: "Delete a tool from the registry.",
  schema: { id: { type: "string", description: "Tool UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("tool_registry").delete().eq("id", id);
    return error ? err(error) : txt("Tool deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// DRIP CAMPAIGNS
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_campaigns", {
  description: "List drip campaigns for a business.",
  schema: { business_id: { type: "string", description: "Business UUID" } },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase().from("drip_campaigns")
      .select("id, name, status, trigger_type, trigger_config, created_at, updated_at")
      .eq("business_id", business_id).order("created_at", { ascending: false });
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_campaign", {
  description: "Create a new drip campaign.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    name: { type: "string", description: "Campaign name" },
    trigger_type: { type: "string", description: "manual, contact_created, pipeline_change (optional)" },
    trigger_config: { type: "string", description: "JSON trigger config (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, name, trigger_type, trigger_config } = args as {
      business_id: string; name: string; trigger_type?: string; trigger_config?: string;
    };
    const { data, error } = await getSupabase().from("drip_campaigns")
      .insert({ business_id, name, trigger_type: trigger_type || "manual", trigger_config: trigger_config ? JSON.parse(trigger_config) : {} })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("update_campaign", {
  description: "Update a drip campaign.",
  schema: {
    id: { type: "string", description: "Campaign UUID" },
    name: { type: "string", description: "Name (optional)" },
    status: { type: "string", description: "draft, active, paused, archived (optional)" },
  },
  handler: async (args: Record<string, unknown>) => {
    const { id, ...updates } = args as { id: string; [k: string]: unknown };
    const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null));
    const { data, error } = await getSupabase().from("drip_campaigns").update(clean).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("delete_campaign", {
  description: "Delete a drip campaign.",
  schema: { id: { type: "string", description: "Campaign UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { error } = await getSupabase().from("drip_campaigns").delete().eq("id", id);
    return error ? err(error) : txt("Campaign deleted.");
  },
});

// ═══════════════════════════════════════════════════════════════════
// EVENT LOGS & AUDIT (read-only)
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_events", {
  description: "List recent event logs for a business.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    event_type: { type: "string", description: "Filter by event type (optional)" },
    limit: { type: "number", description: "Max events (default 50)" },
  },
  handler: async ({ business_id, event_type, limit }: { business_id: string; event_type?: string; limit?: number }) => {
    let q = getSupabase().from("event_logs")
      .select("id, event_type, actor_type, actor_id, channel, payload, created_at")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(limit || 50);
    if (event_type) q = q.eq("event_type", event_type);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("list_audit_log", {
  description: "List agent audit trail.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    agent_id: { type: "string", description: "Filter by agent UUID (optional)" },
    limit: { type: "number", description: "Max entries (default 50)" },
  },
  handler: async ({ business_id, agent_id, limit }: { business_id: string; agent_id?: string; limit?: number }) => {
    let q = getSupabase().from("agent_audit_log")
      .select("id, action, agent_id, agent_nhi, tool_used, cost_units, risk_flag, human_approval, payload, created_at")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(limit || 50);
    if (agent_id) q = q.eq("agent_id", agent_id);
    const { data, error } = await q;
    return error ? err(error) : ok(data);
  },
});

// ═══════════════════════════════════════════════════════════════════
// EMERGENCY CONTROLS
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_emergency_controls", {
  description: "List emergency controls (kill switches) for a business.",
  schema: { business_id: { type: "string", description: "Business UUID" } },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase().from("emergency_controls")
      .select("id, control_type, is_engaged, target_agent_id, triggered_by, triggered_at, config, created_at")
      .eq("business_id", business_id).order("created_at");
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("engage_emergency_control", {
  description: "Engage (activate) an emergency kill switch.",
  schema: {
    id: { type: "string", description: "Emergency control UUID" },
    triggered_by: { type: "string", description: "Who triggered it (default: claude-code)" },
  },
  handler: async ({ id, triggered_by }: { id: string; triggered_by?: string }) => {
    const { data, error } = await getSupabase().from("emergency_controls")
      .update({ is_engaged: true, triggered_at: new Date().toISOString(), triggered_by: triggered_by || "claude-code" })
      .eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("disengage_emergency_control", {
  description: "Disengage (deactivate) an emergency kill switch.",
  schema: { id: { type: "string", description: "Emergency control UUID" } },
  handler: async ({ id }: { id: string }) => {
    const { data, error } = await getSupabase().from("emergency_controls")
      .update({ is_engaged: false }).eq("id", id).select().single();
    return error ? err(error) : ok(data);
  },
});

// ═══════════════════════════════════════════════════════════════════
// HUDDLES
// ═══════════════════════════════════════════════════════════════════

mcpServer.tool("list_huddles", {
  description: "List agent huddles for a business.",
  schema: { business_id: { type: "string", description: "Business UUID" } },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase().from("agent_huddles")
      .select("id, topic, huddle_type, status, created_at, updated_at")
      .eq("business_id", business_id).order("created_at", { ascending: false });
    return error ? err(error) : ok(data);
  },
});

mcpServer.tool("create_huddle", {
  description: "Start a new agent huddle discussion.",
  schema: {
    business_id: { type: "string", description: "Business UUID" },
    topic: { type: "string", description: "Huddle topic" },
    huddle_type: { type: "string", description: "concern, strategy, review (optional)" },
  },
  handler: async ({ business_id, topic, huddle_type }: { business_id: string; topic: string; huddle_type?: string }) => {
    const { data, error } = await getSupabase().from("agent_huddles")
      .insert({ business_id, topic, huddle_type: huddle_type || "concern" })
      .select().single();
    return error ? err(error) : ok(data);
  },
});

// ═══════════════════════════════════════════════════════════════════
// TRANSPORT
// ═══════════════════════════════════════════════════════════════════

const transport = new StreamableHttpTransport();

const handler = async (req: Request): Response | Promise<Response> => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-api-key, content-type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  }

  // Auth middleware — skip for GET /mcp (SSE endpoint)
  if (!(req.method === "GET" && url.pathname.endsWith("/mcp"))) {
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const expected = Deno.env.get("API_BRIDGE_KEY");
    if (!expected || !apiKey || apiKey !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized — provide x-api-key header" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
  }

  return await transport.handleRequest(req, mcpServer);
};

Deno.serve(handler);
