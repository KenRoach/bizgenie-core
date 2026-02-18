import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Core tools available to all agents
const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "query_contacts",
      description: "Search contacts in the CRM. Returns matching contacts with name, email, phone, pipeline stage, tags, lead score, and revenue.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search term to filter by name or email (optional)" },
          pipeline_stage: { type: "string", description: "Filter by pipeline stage: new, contacted, qualified, proposal, won, lost (optional)" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_orders",
      description: "Search orders. Returns order details with number, status, total, payment status, and contact info.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status: pending, processing, shipped, delivered, cancelled (optional)" },
          payment_status: { type: "string", description: "Filter by payment: unpaid, paid, refunded (optional)" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_goals",
      description: "Get current business goals (AOP, quarterly, weekly). Shows title, progress, status, and dates.",
      parameters: {
        type: "object",
        properties: {
          goal_type: { type: "string", enum: ["annual", "quarterly", "weekly"], description: "Filter by goal tier (optional)" },
          status: { type: "string", enum: ["active", "completed", "paused"], description: "Filter by status (optional)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_knowledge",
      description: "Search the knowledge base for company insights, playbooks, market intel, and learnings.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["company", "product", "market", "playbook", "competitor", "general"], description: "Filter by category (optional)" },
          search: { type: "string", description: "Search term to filter by title or content (optional)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_feedback",
      description: "Search business feedback (complaints, praise, feature requests).",
      parameters: {
        type: "object",
        properties: {
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"], description: "Filter by sentiment (optional)" },
          category: { type: "string", description: "Filter by category (optional)" },
          status: { type: "string", enum: ["new", "in_progress", "resolved"], description: "Filter by status (optional)" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_knowledge",
      description: "Save an important insight, learning, or fact to the knowledge base.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", enum: ["company", "product", "market", "playbook", "competitor", "general"], description: "Knowledge category" },
          title: { type: "string", description: "Short title" },
          content: { type: "string", description: "The knowledge content" },
        },
        required: ["category", "title", "content"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_feedback",
      description: "Log a piece of business feedback.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Feedback title" },
          content: { type: "string", description: "Feedback details" },
          category: { type: "string", enum: ["activation", "retention", "pricing", "feature_gap", "ux", "trust", "performance", "security", "general"], description: "Friction category" },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"], description: "Feedback sentiment" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Priority level" },
        },
        required: ["title", "content", "category", "sentiment", "priority"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal_progress",
      description: "Update the progress percentage of an existing goal.",
      parameters: {
        type: "object",
        properties: {
          goal_id: { type: "string", description: "UUID of the goal" },
          progress: { type: "number", description: "Progress 0-100" },
        },
        required: ["goal_id", "progress"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Update a contact's information (pipeline stage, lead score, tags, notes).",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "UUID of the contact" },
          pipeline_stage: { type: "string", description: "New pipeline stage (optional)" },
          lead_score: { type: "number", description: "New lead score 0-100 (optional)" },
          notes: { type: "string", description: "Append to notes (optional)" },
          tags: { type: "array", items: { type: "string" }, description: "Set tags (optional)" },
        },
        required: ["contact_id"],
        additionalProperties: false,
      },
    },
  },
  // === NEW TOOLS ===
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a new contact in the CRM.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact full name" },
          email: { type: "string", description: "Email address (optional)" },
          phone: { type: "string", description: "Phone number (optional)" },
          pipeline_stage: { type: "string", description: "Pipeline stage: new, contacted, qualified, proposal, won, lost (default: new)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags (optional)" },
          notes: { type: "string", description: "Notes about this contact (optional)" },
          instagram: { type: "string", description: "Instagram handle (optional)" },
          whatsapp: { type: "string", description: "WhatsApp number (optional)" },
        },
        required: ["name"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_order",
      description: "Create a new order for a contact.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "Order number/ID" },
          contact_id: { type: "string", description: "UUID of the contact (optional)" },
          total: { type: "number", description: "Order total amount" },
          currency: { type: "string", description: "Currency code (default: USD)" },
          status: { type: "string", description: "Order status: pending, processing, shipped, delivered (default: pending)" },
          payment_status: { type: "string", description: "Payment status: unpaid, paid, refunded (default: unpaid)" },
          items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, qty: { type: "number" }, price: { type: "number" } } }, description: "Line items (optional)" },
        },
        required: ["order_number", "total"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_scrape",
      description: "Scrape a web page and extract its text content, title, description, and links. Use for research, competitor analysis, or gathering information from URLs.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to scrape" },
          extract_links: { type: "boolean", description: "Also extract links from the page (default false)" },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_to_agent",
      description: "Send a message to another agent and get their response. Use for inter-agent collaboration — e.g., ask the sales agent about pipeline or the marketing agent about campaigns.",
      parameters: {
        type: "object",
        properties: {
          target_agent_type: { type: "string", description: "Type of agent to delegate to: sales, ops, cfo, marketing, support, analytics, growth, content, retention, custom" },
          message: { type: "string", description: "The message/question to send to the other agent" },
        },
        required: ["target_agent_type", "message"],
        additionalProperties: false,
      },
    },
  },
];

// Execute a tool call
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  toolName: string,
  args: Record<string, unknown>,
  context: { supabaseUrl: string; supabaseAnonKey: string; authHeader: string; agentNhi: string | null }
): Promise<{ success: boolean; result: string; data?: unknown }> {
  try {
    switch (toolName) {
      case "query_contacts": {
        let query = supabase.from("contacts").select("id, name, email, phone, pipeline_stage, tags, lead_score, total_revenue, notes").eq("business_id", businessId);
        if (args.pipeline_stage) query = query.eq("pipeline_stage", args.pipeline_stage);
        if (args.search) query = query.or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`);
        const { data, error } = await query.limit((args.limit as number) || 20).order("created_at", { ascending: false });
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        return { success: true, result: `Found ${data.length} contacts`, data };
      }
      case "query_orders": {
        let query = supabase.from("orders").select("id, order_number, status, payment_status, total, currency, items, created_at, contact_id").eq("business_id", businessId);
        if (args.status) query = query.eq("status", args.status);
        if (args.payment_status) query = query.eq("payment_status", args.payment_status);
        const { data, error } = await query.limit((args.limit as number) || 20).order("created_at", { ascending: false });
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        const totalRevenue = data.reduce((sum: number, o: { total: number }) => sum + o.total, 0);
        return { success: true, result: `Found ${data.length} orders (total: $${totalRevenue.toFixed(2)})`, data };
      }
      case "query_goals": {
        let query = supabase.from("agent_goals").select("id, goal_type, title, description, status, progress, period_start, period_end, parent_goal_id").eq("business_id", businessId);
        if (args.goal_type) query = query.eq("goal_type", args.goal_type);
        if (args.status) query = query.eq("status", args.status);
        const { data, error } = await query.order("goal_type").order("created_at");
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        return { success: true, result: `Found ${data.length} goals`, data };
      }
      case "query_knowledge": {
        let query = supabase.from("agent_knowledge").select("id, category, title, content, source, created_at").eq("business_id", businessId);
        if (args.category) query = query.eq("category", args.category);
        if (args.search) query = query.or(`title.ilike.%${args.search}%,content.ilike.%${args.search}%`);
        const { data, error } = await query.order("updated_at", { ascending: false }).limit(30);
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        return { success: true, result: `Found ${data.length} knowledge entries`, data };
      }
      case "query_feedback": {
        let query = supabase.from("feedback").select("id, title, content, category, sentiment, priority, status, source, created_at").eq("business_id", businessId);
        if (args.sentiment) query = query.eq("sentiment", args.sentiment);
        if (args.category) query = query.eq("category", args.category);
        if (args.status) query = query.eq("status", args.status);
        const { data, error } = await query.order("created_at", { ascending: false }).limit((args.limit as number) || 20);
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        return { success: true, result: `Found ${data.length} feedback entries`, data };
      }
      case "add_knowledge": {
        const { error } = await supabase.from("agent_knowledge").insert({
          business_id: businessId,
          category: args.category,
          title: args.title,
          content: args.content,
          source: "agent",
          created_by: context.agentNhi || "agent",
        });
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Knowledge saved: [${args.category}] "${args.title}"` };
      }
      case "log_feedback": {
        const { error } = await supabase.from("feedback").insert({
          business_id: businessId,
          title: args.title,
          content: args.content,
          category: args.category,
          sentiment: args.sentiment,
          priority: args.priority,
          source: "agent",
        });
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Feedback logged: "${args.title}"` };
      }
      case "update_goal_progress": {
        const progress = Math.min(100, Math.max(0, args.progress as number));
        const status = progress >= 100 ? "completed" : "active";
        const { error } = await supabase.from("agent_goals").update({ progress, status }).eq("id", args.goal_id).eq("business_id", businessId);
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Goal progress → ${progress}%` };
      }
      case "update_contact": {
        const updates: Record<string, unknown> = {};
        if (args.pipeline_stage) updates.pipeline_stage = args.pipeline_stage;
        if (args.lead_score !== undefined) updates.lead_score = args.lead_score;
        if (args.tags) updates.tags = args.tags;
        if (args.notes) updates.notes = args.notes;
        if (Object.keys(updates).length === 0) return { success: false, result: "No updates specified" };
        const { error } = await supabase.from("contacts").update(updates).eq("id", args.contact_id).eq("business_id", businessId);
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Contact updated` };
      }
      // === NEW TOOLS ===
      case "create_contact": {
        const { data, error } = await supabase.from("contacts").insert({
          business_id: businessId,
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          pipeline_stage: args.pipeline_stage || "new",
          tags: args.tags || [],
          notes: args.notes || null,
          instagram: args.instagram || null,
          whatsapp: args.whatsapp || null,
        }).select().single();
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Contact created: "${args.name}"`, data };
      }
      case "create_order": {
        const { data, error } = await supabase.from("orders").insert({
          business_id: businessId,
          order_number: args.order_number,
          contact_id: args.contact_id || null,
          total: args.total || 0,
          currency: args.currency || "USD",
          status: args.status || "pending",
          payment_status: args.payment_status || "unpaid",
          items: args.items || [],
        }).select().single();
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Order created: #${args.order_number} ($${args.total})`, data };
      }
      case "web_scrape": {
        try {
          const scrapeUrl = `${context.supabaseUrl}/functions/v1/web-scrape`;
          const resp = await fetch(scrapeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${context.supabaseAnonKey}` },
            body: JSON.stringify({ url: args.url, extract_links: args.extract_links || false }),
          });
          const scrapeData = await resp.json();
          if (!scrapeData.success) return { success: false, result: `Scrape failed: ${scrapeData.error}` };
          return { success: true, result: `✅ Scraped "${scrapeData.data.title}" (${scrapeData.data.content_length} chars)`, data: scrapeData.data };
        } catch (e) {
          return { success: false, result: `Scrape error: ${e instanceof Error ? e.message : "Unknown"}` };
        }
      }
      case "delegate_to_agent": {
        try {
          // Find the target agent
          const { data: targetAgent } = await supabase
            .from("agent_configurations")
            .select("id, name, agent_type, system_prompt, model, nhi_identifier")
            .eq("business_id", businessId)
            .eq("agent_type", args.target_agent_type)
            .eq("is_active", true)
            .maybeSingle();

          if (!targetAgent) {
            return { success: false, result: `No active ${args.target_agent_type} agent found. Create one first.` };
          }

          // Call agent-chat for the target agent (non-streaming, single turn)
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (!LOVABLE_API_KEY) return { success: false, result: "AI key not configured" };

          // Build a lightweight context for the delegated agent
          const delegateSystemPrompt = targetAgent.system_prompt || `You are a ${targetAgent.agent_type} agent named ${targetAgent.name}. Answer concisely.`;
          
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: targetAgent.model || "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: delegateSystemPrompt },
                { role: "user", content: args.message as string },
              ],
              stream: false,
            }),
          });

          if (!aiResp.ok) {
            return { success: false, result: `Delegation failed: HTTP ${aiResp.status}` };
          }

          const aiData = await aiResp.json();
          const response = aiData.choices?.[0]?.message?.content || "No response";

          // Log the delegation
          await supabase.from("agent_audit_log").insert({
            business_id: businessId,
            agent_id: targetAgent.id,
            agent_nhi: targetAgent.nhi_identifier,
            tool_used: "delegate_to_agent",
            action: "agent_delegation",
            risk_flag: "low",
            human_approval: "auto_approved",
            payload: { from_agent: context.agentNhi, message: args.message, response_preview: response.slice(0, 200) },
          });

          return { success: true, result: `📨 ${targetAgent.name} responded`, data: { agent: targetAgent.name, agent_type: targetAgent.agent_type, response } };
        } catch (e) {
          return { success: false, result: `Delegation error: ${e instanceof Error ? e.message : "Unknown"}` };
        }
      }
      default:
        return { success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, result: `Error: ${e instanceof Error ? e.message : "Unknown"}` };
  }
}

// Load dynamic tools from tool_registry
async function loadDynamicTools(supabase: ReturnType<typeof createClient>, businessId: string) {
  const { data: registryTools } = await supabase
    .from("tool_registry")
    .select("name, description, data_scope, risk_level")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .eq("is_verified", true);

  if (!registryTools || registryTools.length === 0) return [];

  // Return them as informational context (not executable — they're registered for awareness)
  return registryTools.map((t: { name: string; description: string | null; data_scope: unknown; risk_level: string }) => ({
    name: t.name,
    description: t.description || t.name,
    risk_level: t.risk_level,
    data_scope: t.data_scope,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages, agent_type, business_id, agent_id } = await req.json();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch agent config
    let systemPrompt = "You are a helpful AI business assistant. Be concise and action-oriented.";
    let model = "google/gemini-3-flash-preview";
    let agentNhi: string | null = null;
    let agentName = "Assistant";
    let resolvedAgentId: string | null = agent_id || null;

    if (business_id && (agent_type || agent_id)) {
      let query = supabase
        .from("agent_configurations")
        .select("system_prompt, model, id, nhi_identifier, name, agent_type")
        .eq("business_id", business_id)
        .eq("is_active", true);
      
      if (agent_id) {
        query = query.eq("id", agent_id);
      } else if (agent_type) {
        query = query.eq("agent_type", agent_type);
      }

      const { data: agentConfig } = await query.maybeSingle();

      if (agentConfig) {
        if (agentConfig.system_prompt) systemPrompt = agentConfig.system_prompt;
        if (agentConfig.model) model = agentConfig.model;
        resolvedAgentId = agentConfig.id;
        agentNhi = agentConfig.nhi_identifier;
        agentName = agentConfig.name;
      }
    }

    // Gather business context + dynamic tools in parallel
    const [businessRes, goalsRes, knowledgeRes, contactsCountRes, ordersCountRes, dynamicTools] = await Promise.all([
      supabase.from("businesses").select("name").eq("id", business_id).single(),
      supabase.from("agent_goals").select("id, goal_type, title, progress, status").eq("business_id", business_id).eq("status", "active").order("goal_type"),
      supabase.from("agent_knowledge").select("category, title, content").eq("business_id", business_id).order("updated_at", { ascending: false }).limit(30),
      supabase.from("contacts").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      loadDynamicTools(supabase, business_id),
    ]);

    const businessName = businessRes.data?.name || "Business";
    const activeGoals = goalsRes.data || [];
    const knowledge = knowledgeRes.data || [];
    const contactCount = contactsCountRes.count || 0;
    const orderCount = ordersCountRes.count || 0;

    // Build knowledge context
    const knowledgeByCategory: Record<string, string[]> = {};
    for (const k of knowledge) {
      if (!knowledgeByCategory[k.category]) knowledgeByCategory[k.category] = [];
      knowledgeByCategory[k.category].push(`• ${k.title}: ${k.content}`);
    }
    const knowledgeContext = Object.entries(knowledgeByCategory)
      .map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.join("\n")}`)
      .join("\n\n");

    // Dynamic tools context
    const dynamicToolsContext = dynamicTools.length > 0
      ? `\n## REGISTERED TOOLS (from Tool Registry)\n${dynamicTools.map((t: { name: string; description: string; risk_level: string }) => `- ${t.name} [${t.risk_level}]: ${t.description}`).join("\n")}\nNote: These are registered external tools. Mention them when relevant but you cannot execute them directly yet.`
      : "";

    // Augment the system prompt with business context
    const contextBlock = `

## BUSINESS CONTEXT (LIVE DATA)
- Company: ${businessName}
- Total Contacts: ${contactCount}
- Total Orders: ${orderCount}
- Active Goals: ${activeGoals.map(g => `${g.goal_type}: "${g.title}" (${g.progress}%) [id:${g.id}]`).join("; ") || "None"}

## KNOWLEDGE BASE
${knowledgeContext || "Empty"}

## YOUR TOOLS
You have access to real business data tools. Use them to answer questions with REAL data, not guesses:
- query_contacts: Search CRM contacts
- query_orders: Search orders & revenue
- query_goals: Get business goals & AOP progress
- query_knowledge: Search knowledge base
- query_feedback: Search feedback & complaints
- add_knowledge: Save insights you discover
- log_feedback: Log feedback items
- update_goal_progress: Update goal progress %
- update_contact: Update contact info
- create_contact: Create a new CRM contact
- create_order: Create a new order
- web_scrape: Scrape any web page for research, competitor analysis, data gathering
- delegate_to_agent: Ask another agent a question (inter-agent collaboration)
${dynamicToolsContext}

ALWAYS use tools to look up real data before answering data questions. Never guess or make up numbers.
When you discover something important, save it to the knowledge base with add_knowledge.
Use web_scrape for any research tasks — competitor analysis, pricing research, market data, etc.
Use delegate_to_agent when another specialist agent could better answer part of the question.`;

    const fullSystemPrompt = systemPrompt + contextBlock;

    // Agent Guard: policy enforcement
    const guardUrl = `${supabaseUrl}/functions/v1/agent-guard`;
    const lastUserMsg = messages?.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    const guardRes = await fetch(guardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({
        business_id,
        agent_id: resolvedAgentId,
        agent_nhi: agentNhi,
        tool_name: "ai_chat",
        action: `${agent_type || "general"}_chat`,
        user_input: lastUserMsg,
      }),
    });
    if (!guardRes.ok) {
      const guardBody = await guardRes.json().catch(() => ({ reason: "Policy check failed" }));
      return new Response(JSON.stringify({ error: guardBody.reason || "Blocked by security policy" }), {
        status: guardRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Agentic loop: call AI with tools, execute, feed results back
    const conversationMessages: Array<Record<string, unknown>> = [
      { role: "system", content: fullSystemPrompt },
      ...messages,
    ];
    const toolResults: Array<{ tool: string; args: Record<string, unknown>; result: string; success: boolean }> = [];
    let loopCount = 0;
    const MAX_LOOPS = 8; // Increased for complex multi-tool tasks

    const toolContext = { supabaseUrl, supabaseAnonKey, authHeader, agentNhi };

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: conversationMessages,
          tools: AGENT_TOOLS,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      const message = choice?.message;
      if (!message) break;

      conversationMessages.push(message);

      // Execute tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          const fnName = tc.function.name;
          let fnArgs: Record<string, unknown> = {};
          try { fnArgs = JSON.parse(tc.function.arguments); } catch { fnArgs = {}; }

          console.log(`Agent ${agentName} executing tool: ${fnName}`, fnArgs);
          const result = await executeTool(supabase, business_id, fnName, fnArgs, toolContext);
          toolResults.push({ tool: fnName, args: fnArgs, result: result.result, success: result.success });

          // Audit log
          await supabase.from("agent_audit_log").insert({
            business_id,
            agent_id: resolvedAgentId,
            agent_nhi: agentNhi,
            tool_used: fnName,
            action: `agent_tool_${fnName}`,
            risk_flag: fnName === "delegate_to_agent" ? "medium" : "low",
            human_approval: "auto_approved",
            payload: { args: fnArgs, result: result.result, success: result.success, data: result.data },
          });

          // Increment tool invocation count in registry
          if (fnName !== "delegate_to_agent" && fnName !== "web_scrape") {
            await supabase.rpc("is_business_owner", { _business_id: business_id }); // just a noop to keep auth context
          }

          conversationMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ success: result.success, result: result.result, data: result.data }),
          });
        }
        continue;
      }

      // No tool calls — final response ready
      break;
    }

    // Stream the final response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("Stream error:", streamResponse.status, t);
      return new Response(JSON.stringify({ error: "AI streaming error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Custom SSE: emit tool actions first, then stream AI
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        if (toolResults.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_actions", actions: toolResults })}\n\n`));
        }
        const reader = streamResponse.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error("Stream pipe error:", e);
        }
        controller.close();
      },
    });

    // Log event
    await supabase.from("event_logs").insert({
      business_id,
      event_type: "agent_invoked",
      channel: "web",
      actor_type: "owner",
      actor_id: userId,
      payload: { agent_type: agent_type || "general", agent_name: agentName, message_count: messages.length, tools_used: toolResults.map(t => t.tool) },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
