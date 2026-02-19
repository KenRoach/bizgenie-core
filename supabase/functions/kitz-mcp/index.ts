import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * kitz.services MCP Server
 * 
 * Exposes the full kitz AI workforce platform to MCP clients like Claude Code.
 * Auth: x-api-key header must match API_BRIDGE_KEY secret.
 * All tools require a business_id parameter.
 */

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getSupabase() {
  return createClient(supabaseUrl, serviceRoleKey);
}

const app = new Hono();

// Auth middleware — validate API key on every request
app.use("*", async (c, next) => {
  const method = c.req.method;
  if (method === "OPTIONS") return next();
  if (method === "GET" && c.req.path.endsWith("/mcp")) return next();

  const apiKey = c.req.header("x-api-key") || c.req.header("authorization")?.replace("Bearer ", "");
  const expected = Deno.env.get("API_BRIDGE_KEY");
  if (!expected || !apiKey || apiKey !== expected) {
    return c.json({ error: "Unauthorized — provide x-api-key header" }, 401);
  }
  await next();
});

const mcpServer = new McpServer({
  name: "kitz-services",
  version: "1.0.0",
});

// ─── Agents ─────────────────────────────────────────────────────

mcpServer.tool({
  name: "list_agents",
  description: "List all AI agents configured for a business, including their type, model, status, and NHI identifier.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase()
      .from("agent_configurations")
      .select("id, name, agent_type, model, is_active, nhi_identifier, system_prompt, permissions, token_ttl_minutes, created_at, updated_at")
      .eq("business_id", business_id)
      .order("created_at");
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "get_agent",
  description: "Get detailed configuration for a specific agent by ID.",
  inputSchema: {
    type: "object",
    properties: {
      agent_id: { type: "string", description: "Agent UUID" },
    },
    required: ["agent_id"],
  },
  handler: async ({ agent_id }: { agent_id: string }) => {
    const { data, error } = await getSupabase()
      .from("agent_configurations")
      .select("*")
      .eq("id", agent_id)
      .single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Knowledge Base ─────────────────────────────────────────────

mcpServer.tool({
  name: "list_knowledge",
  description: "List all knowledge base entries for a business. Returns category, title, content, source, and timestamps.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      category: { type: "string", description: "Filter by category (company, product, market, playbook, competitor, general)" },
      limit: { type: "number", description: "Max entries to return (default 50)" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, category, limit }: { business_id: string; category?: string; limit?: number }) => {
    let q = getSupabase()
      .from("agent_knowledge")
      .select("id, category, title, content, source, created_by, created_at, updated_at")
      .eq("business_id", business_id)
      .order("updated_at", { ascending: false })
      .limit(limit || 50);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "add_knowledge",
  description: "Add a new entry to the knowledge base.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      category: { type: "string", description: "Category: company, product, market, playbook, competitor, general" },
      title: { type: "string", description: "Knowledge entry title" },
      content: { type: "string", description: "Knowledge content" },
    },
    required: ["business_id", "title", "content"],
  },
  handler: async ({ business_id, category, title, content }: { business_id: string; category?: string; title: string; content: string }) => {
    const { data, error } = await getSupabase()
      .from("agent_knowledge")
      .insert({ business_id, category: category || "general", title, content, source: "mcp", created_by: "claude-code" })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Created: ${JSON.stringify(data, null, 2)}` }] };
  },
});

// ─── Goals ───────────────────────────────────────────────────────

mcpServer.tool({
  name: "list_goals",
  description: "List strategic goals (annual, quarterly, weekly) for a business with progress and status.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      goal_type: { type: "string", description: "Filter: annual, quarterly, weekly" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, goal_type }: { business_id: string; goal_type?: string }) => {
    let q = getSupabase()
      .from("agent_goals")
      .select("id, goal_type, title, description, status, progress, period_start, period_end, parent_goal_id, created_at")
      .eq("business_id", business_id)
      .order("goal_type")
      .order("created_at");
    if (goal_type) q = q.eq("goal_type", goal_type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcpServer.tool({
  name: "create_goal",
  description: "Create a new strategic goal.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      goal_type: { type: "string", description: "annual, quarterly, or weekly" },
      title: { type: "string", description: "Goal title" },
      description: { type: "string", description: "Goal description" },
      period_start: { type: "string", description: "Start date (YYYY-MM-DD)" },
      period_end: { type: "string", description: "End date (YYYY-MM-DD)" },
      parent_goal_id: { type: "string", description: "Parent goal UUID for cascading" },
    },
    required: ["business_id", "goal_type", "title"],
  },
  handler: async (args: Record<string, unknown>) => {
    const { business_id, goal_type, title, description, period_start, period_end, parent_goal_id } = args as {
      business_id: string; goal_type: string; title: string; description?: string;
      period_start?: string; period_end?: string; parent_goal_id?: string;
    };
    const { data, error } = await getSupabase()
      .from("agent_goals")
      .insert({
        business_id, goal_type, title,
        description: description || null,
        period_start: period_start || null,
        period_end: period_end || null,
        parent_goal_id: parent_goal_id || null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: `Created: ${JSON.stringify(data, null, 2)}` }] };
  },
});

// ─── Contacts ────────────────────────────────────────────────────

mcpServer.tool({
  name: "list_contacts",
  description: "List CRM contacts for a business with lead scores, pipeline stage, and revenue.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      pipeline_stage: { type: "string", description: "Filter by stage: new, qualified, proposal, won, lost" },
      limit: { type: "number", description: "Max contacts (default 100)" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, pipeline_stage, limit }: { business_id: string; pipeline_stage?: string; limit?: number }) => {
    let q = getSupabase()
      .from("contacts")
      .select("id, name, email, phone, pipeline_stage, lead_score, total_revenue, tags, created_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(limit || 100);
    if (pipeline_stage) q = q.eq("pipeline_stage", pipeline_stage);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Orders ──────────────────────────────────────────────────────

mcpServer.tool({
  name: "list_orders",
  description: "List orders for a business with status, payment info, and totals.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      status: { type: "string", description: "Filter: pending, processing, shipped, delivered, cancelled" },
      limit: { type: "number", description: "Max orders (default 100)" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, status, limit }: { business_id: string; status?: string; limit?: number }) => {
    let q = getSupabase()
      .from("orders")
      .select("id, order_number, status, total, currency, payment_status, items, contact_id, created_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(limit || 100);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Event Logs ──────────────────────────────────────────────────

mcpServer.tool({
  name: "list_events",
  description: "List recent event logs for a business. Shows agent invocations, system events, and activity.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      event_type: { type: "string", description: "Filter by event type (e.g. agent_invoked)" },
      limit: { type: "number", description: "Max events (default 50)" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, event_type, limit }: { business_id: string; event_type?: string; limit?: number }) => {
    let q = getSupabase()
      .from("event_logs")
      .select("id, event_type, actor_type, actor_id, channel, payload, created_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(limit || 50);
    if (event_type) q = q.eq("event_type", event_type);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Audit Log ───────────────────────────────────────────────────

mcpServer.tool({
  name: "list_audit_log",
  description: "List agent audit trail — actions taken, tools used, cost, risk flags, and approval status.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      agent_id: { type: "string", description: "Filter by specific agent UUID" },
      limit: { type: "number", description: "Max entries (default 50)" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, agent_id, limit }: { business_id: string; agent_id?: string; limit?: number }) => {
    let q = getSupabase()
      .from("agent_audit_log")
      .select("id, action, agent_id, agent_nhi, tool_used, cost_units, risk_flag, human_approval, payload, created_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(limit || 50);
    if (agent_id) q = q.eq("agent_id", agent_id);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Feedback ────────────────────────────────────────────────────

mcpServer.tool({
  name: "list_feedback",
  description: "List customer/internal feedback entries with sentiment, priority, and resolution status.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
      status: { type: "string", description: "Filter: new, in_progress, resolved, dismissed" },
      limit: { type: "number", description: "Max entries (default 50)" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id, status, limit }: { business_id: string; status?: string; limit?: number }) => {
    let q = getSupabase()
      .from("feedback")
      .select("id, title, content, category, sentiment, priority, status, source, fix_type, created_at, resolved_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false })
      .limit(limit || 50);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Skills ──────────────────────────────────────────────────────

mcpServer.tool({
  name: "list_skills",
  description: "List skill library entries — prompts, templates, and playbooks available to agents.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase()
      .from("skill_library")
      .select("id, title, description, skill_type, tags, is_active, usage_count, assigned_agent_ids, created_at")
      .eq("business_id", business_id)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Tools Registry ──────────────────────────────────────────────

mcpServer.tool({
  name: "list_tools",
  description: "List registered tools available to agents — with risk levels, rate limits, and invocation counts.",
  inputSchema: {
    type: "object",
    properties: {
      business_id: { type: "string", description: "Business UUID" },
    },
    required: ["business_id"],
  },
  handler: async ({ business_id }: { business_id: string }) => {
    const { data, error } = await getSupabase()
      .from("tool_registry")
      .select("id, name, description, risk_level, is_active, is_verified, max_calls_per_minute, total_invocations, data_scope, created_at")
      .eq("business_id", business_id)
      .order("name");
    if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

// ─── Transport ───────────────────────────────────────────────────

const transport = new StreamableHttpTransport();

app.all("/*", async (c) => {
  return await transport.handleRequest(c.req.raw, mcpServer);
});

Deno.serve(app.fetch);
