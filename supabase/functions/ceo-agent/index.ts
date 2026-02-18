import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool definitions for the CEO agent
const CEO_TOOLS = [
  {
    type: "function",
    function: {
      name: "create_goal",
      description: "Create a new business goal (annual AOP, quarterly, or weekly sprint). Use this whenever you define or commit to a goal.",
      parameters: {
        type: "object",
        properties: {
          goal_type: { type: "string", enum: ["annual", "quarterly", "weekly"], description: "The goal tier" },
          title: { type: "string", description: "Concise goal title" },
          description: { type: "string", description: "Key results and metrics" },
          period_start: { type: "string", description: "Start date YYYY-MM-DD (optional)" },
          period_end: { type: "string", description: "End date YYYY-MM-DD (optional)" },
          parent_goal_id: { type: "string", description: "UUID of parent goal for cascading (optional)" },
        },
        required: ["goal_type", "title"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "spawn_agent",
      description: "Create a new AI agent configuration. Use when you identify a capability gap that needs a dedicated agent. You can spawn multiple agents in sequence.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent display name" },
          agent_type: { type: "string", enum: ["sales", "ops", "cfo", "cto", "cpo", "cro", "coo", "marketing", "support", "onboarding", "analytics", "growth", "content", "retention", "custom"], description: "Agent type" },
          system_prompt: { type: "string", description: "The agent's system prompt defining its role, behavior, goals, and operating rules. Make it comprehensive." },
          nhi_identifier: { type: "string", description: "Non-human identity ID (e.g. coo-agent-001)" },
          model: { type: "string", description: "AI model to use. Default: google/gemini-3-flash-preview. Use google/gemini-2.5-flash for cost-sensitive agents." },
        },
        required: ["name", "agent_type", "system_prompt", "nhi_identifier"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_knowledge",
      description: "Save an important learning, insight, or fact to the knowledge base. Use whenever you discover or discuss something worth remembering.",
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
      name: "log_feedback",
      description: "Log a piece of business feedback (complaint, praise, feature request, etc).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Feedback title" },
          content: { type: "string", description: "Feedback details" },
          category: { type: "string", enum: ["activation", "retention", "pricing", "feature_gap", "ux", "trust", "performance", "security", "general"], description: "Friction category" },
          sentiment: { type: "string", enum: ["positive", "negative", "neutral"], description: "Feedback sentiment" },
          priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Priority level" },
          source: { type: "string", description: "Source of feedback (e.g. ceo-chat, internal)" },
        },
        required: ["title", "content", "category", "sentiment", "priority"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delegate_to_agent",
      description: "Send a message to another agent and get their response. Use for inter-agent collaboration — e.g., ask the CFO about margin, the CTO about infra, the CPO about feedback.",
      parameters: {
        type: "object",
        properties: {
          target_agent_type: { type: "string", description: "Type of agent to delegate to: sales, ops, cfo, cto, cpo, cro, coo, marketing, support, analytics, growth, content, retention, custom" },
          message: { type: "string", description: "The message/question to send to the other agent" },
        },
        required: ["target_agent_type", "message"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_scrape",
      description: "Scrape a web page and extract its text content. Use for research, competitor analysis, market intelligence.",
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
      name: "create_contact",
      description: "Create a new contact in the CRM.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Contact full name" },
          email: { type: "string", description: "Email address (optional)" },
          phone: { type: "string", description: "Phone number (optional)" },
          pipeline_stage: { type: "string", description: "Pipeline stage (default: new)" },
          tags: { type: "array", items: { type: "string" }, description: "Tags (optional)" },
          notes: { type: "string", description: "Notes (optional)" },
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
      description: "Create a new order.",
      parameters: {
        type: "object",
        properties: {
          order_number: { type: "string", description: "Order number/ID" },
          contact_id: { type: "string", description: "UUID of the contact (optional)" },
          total: { type: "number", description: "Order total amount" },
          currency: { type: "string", description: "Currency code (default: USD)" },
          status: { type: "string", description: "Order status (default: pending)" },
          payment_status: { type: "string", description: "Payment status (default: unpaid)" },
        },
        required: ["order_number", "total"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_contacts",
      description: "Search CRM contacts.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "Search by name or email (optional)" },
          pipeline_stage: { type: "string", description: "Filter by stage (optional)" },
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
      description: "Search orders.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by status (optional)" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
];

// Execute a tool call against the database
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  toolName: string,
  args: Record<string, unknown>,
  context: { supabaseUrl: string; supabaseAnonKey: string }
): Promise<{ success: boolean; result: string; data?: unknown }> {
  try {
    switch (toolName) {
      case "create_goal": {
        const { data, error } = await supabase.from("agent_goals").insert({
          business_id: businessId,
          goal_type: args.goal_type,
          title: args.title,
          description: args.description || null,
          period_start: args.period_start || null,
          period_end: args.period_end || null,
          parent_goal_id: args.parent_goal_id || null,
        }).select().single();
        if (error) return { success: false, result: `Failed to create goal: ${error.message}` };
        return { success: true, result: `✅ Goal created: "${args.title}" (${args.goal_type})`, data };
      }
      case "spawn_agent": {
        // Check if agent with same type already exists
        const { data: existing } = await supabase
          .from("agent_configurations")
          .select("id, name, nhi_identifier")
          .eq("business_id", businessId)
          .eq("agent_type", args.agent_type)
          .maybeSingle();

        // Also check if NHI is taken by a different agent
        if (args.nhi_identifier) {
          const { data: nhiConflict } = await supabase
            .from("agent_configurations")
            .select("id")
            .eq("business_id", businessId)
            .eq("nhi_identifier", args.nhi_identifier as string)
            .maybeSingle();
          if (nhiConflict && (!existing || nhiConflict.id !== existing.id)) {
            // NHI taken by another agent, append a suffix
            args.nhi_identifier = `${args.nhi_identifier}-${Date.now().toString(36).slice(-4)}`;
          }
        }

        if (existing) {
          // Update existing agent instead
          const updatePayload: Record<string, unknown> = {
            name: args.name as string,
            system_prompt: args.system_prompt as string,
            model: (args.model as string) || "google/gemini-3-flash-preview",
            is_active: true,
          };
          // Only update NHI if it changed
          if (args.nhi_identifier && args.nhi_identifier !== existing.nhi_identifier) {
            updatePayload.nhi_identifier = args.nhi_identifier as string;
          }
          const { error } = await supabase.from("agent_configurations").update(updatePayload).eq("id", existing.id);
          if (error) return { success: false, result: `Failed to update agent: ${error.message}` };
          return { success: true, result: `✅ Agent updated: "${args.name}" (${args.agent_type}) — NHI: ${args.nhi_identifier}`, data: { ...existing, updated: true } };
        }

        const { data, error } = await supabase.from("agent_configurations").insert({
          business_id: businessId,
          name: args.name as string,
          agent_type: args.agent_type as string,
          system_prompt: args.system_prompt as string,
          nhi_identifier: args.nhi_identifier as string,
          model: (args.model as string) || "google/gemini-3-flash-preview",
          is_active: true,
        }).select().single();
        if (error) return { success: false, result: `Failed to spawn agent: ${error.message}` };
        return { success: true, result: `✅ Agent spawned: "${args.name}" (${args.agent_type}) — NHI: ${args.nhi_identifier}`, data };
      }
      case "add_knowledge": {
        const { data, error } = await supabase.from("agent_knowledge").insert({
          business_id: businessId,
          category: args.category,
          title: args.title,
          content: args.content,
          source: "ceo-agent",
          created_by: "ceo-prime-001",
        }).select().single();
        if (error) return { success: false, result: `Failed to add knowledge: ${error.message}` };
        return { success: true, result: `✅ Knowledge saved: [${args.category}] "${args.title}"`, data };
      }
      case "update_goal_progress": {
        const progress = Math.min(100, Math.max(0, args.progress as number));
        const status = progress >= 100 ? "completed" : "active";
        const { error } = await supabase.from("agent_goals")
          .update({ progress, status })
          .eq("id", args.goal_id)
          .eq("business_id", businessId);
        if (error) return { success: false, result: `Failed to update goal: ${error.message}` };
        return { success: true, result: `✅ Goal progress updated to ${progress}%` };
      }
      case "log_feedback": {
        const { data, error } = await supabase.from("feedback").insert({
          business_id: businessId,
          title: args.title,
          content: args.content,
          category: args.category,
          sentiment: args.sentiment,
          priority: args.priority,
          source: args.source || "ceo-agent",
        }).select().single();
        if (error) return { success: false, result: `Failed to log feedback: ${error.message}` };
        return { success: true, result: `✅ Feedback logged: "${args.title}" (${args.priority})`, data };
      }
      case "delegate_to_agent": {
        try {
          const { data: targetAgent } = await supabase
            .from("agent_configurations")
            .select("id, name, agent_type, system_prompt, model, nhi_identifier")
            .eq("business_id", businessId)
            .eq("agent_type", args.target_agent_type)
            .eq("is_active", true)
            .maybeSingle();

          if (!targetAgent) {
            return { success: false, result: `No active ${args.target_agent_type} agent found. Spawn one first with spawn_agent.` };
          }

          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (!LOVABLE_API_KEY) return { success: false, result: "AI key not configured" };

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

          if (!aiResp.ok) return { success: false, result: `Delegation failed: HTTP ${aiResp.status}` };

          const aiData = await aiResp.json();
          const response = aiData.choices?.[0]?.message?.content || "No response";

          await supabase.from("agent_audit_log").insert({
            business_id: businessId,
            agent_id: targetAgent.id,
            agent_nhi: targetAgent.nhi_identifier,
            tool_used: "delegate_to_agent",
            action: "agent_delegation",
            risk_flag: "low",
            human_approval: "auto_approved",
            payload: { from_agent: "ceo-prime-001", message: args.message, response_preview: response.slice(0, 200) },
          });

          return { success: true, result: `📨 ${targetAgent.name} responded`, data: { agent: targetAgent.name, agent_type: targetAgent.agent_type, response } };
        } catch (e) {
          return { success: false, result: `Delegation error: ${e instanceof Error ? e.message : "Unknown"}` };
        }
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
      case "create_contact": {
        const { data, error } = await supabase.from("contacts").insert({
          business_id: businessId,
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          pipeline_stage: args.pipeline_stage || "new",
          tags: args.tags || [],
          notes: args.notes || null,
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
        }).select().single();
        if (error) return { success: false, result: `Failed: ${error.message}` };
        return { success: true, result: `✅ Order created: #${args.order_number} ($${args.total})`, data };
      }
      case "query_contacts": {
        let query = supabase.from("contacts").select("id, name, email, phone, pipeline_stage, tags, lead_score, total_revenue").eq("business_id", businessId);
        if (args.pipeline_stage) query = query.eq("pipeline_stage", args.pipeline_stage);
        if (args.search) query = query.or(`name.ilike.%${args.search}%,email.ilike.%${args.search}%`);
        const { data, error } = await query.limit((args.limit as number) || 20).order("created_at", { ascending: false });
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        return { success: true, result: `Found ${data.length} contacts`, data };
      }
      case "query_orders": {
        let query = supabase.from("orders").select("id, order_number, status, payment_status, total, currency, created_at").eq("business_id", businessId);
        if (args.status) query = query.eq("status", args.status);
        const { data, error } = await query.limit((args.limit as number) || 20).order("created_at", { ascending: false });
        if (error) return { success: false, result: `Query failed: ${error.message}` };
        const totalRevenue = data.reduce((sum: number, o: { total: number }) => sum + o.total, 0);
        return { success: true, result: `Found ${data.length} orders (total: $${totalRevenue.toFixed(2)})`, data };
      }
      default:
        return { success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, result: `Tool error: ${e instanceof Error ? e.message : "Unknown"}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages, business_id } = await req.json();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather full business context
    const [businessRes, knowledgeRes, goalsRes, contactsCountRes, ordersCountRes, agentsRes, campaignsRes, feedbackRes] = await Promise.all([
      supabase.from("businesses").select("name, settings").eq("id", business_id).single(),
      supabase.from("agent_knowledge").select("category, title, content").eq("business_id", business_id).order("updated_at", { ascending: false }).limit(50),
      supabase.from("agent_goals").select("*").eq("business_id", business_id).eq("status", "active").order("goal_type"),
      supabase.from("contacts").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("agent_configurations").select("name, agent_type, is_active, nhi_identifier").eq("business_id", business_id),
      supabase.from("drip_campaigns").select("name, status, trigger_type").eq("business_id", business_id),
      supabase.from("feedback").select("category, sentiment, priority, title, status, source, created_at").eq("business_id", business_id).order("created_at", { ascending: false }).limit(30),
    ]);

    const businessName = businessRes.data?.name || "Kitz";
    const knowledge = knowledgeRes.data || [];
    const activeGoals = goalsRes.data || [];
    const contactCount = contactsCountRes.count || 0;
    const orderCount = ordersCountRes.count || 0;
    const agents = agentsRes.data || [];
    const campaigns = campaignsRes.data || [];
    const recentFeedback = feedbackRes.data || [];

    // Build contexts
    const newComplaints = recentFeedback.filter(f => f.sentiment === "negative" && f.status === "new");
    const praises = recentFeedback.filter(f => f.sentiment === "positive");
    const criticalFeedback = recentFeedback.filter(f => f.priority === "critical" && f.status !== "resolved");
    const feedbackByCat = recentFeedback.reduce((acc, f) => { if (f.sentiment === "negative") acc[f.category] = (acc[f.category] || 0) + 1; return acc; }, {} as Record<string, number>);
    const topFrictionAreas = Object.entries(feedbackByCat).sort(([,a],[,b]) => b - a).slice(0, 5);

    const knowledgeByCategory: Record<string, string[]> = {};
    for (const k of knowledge) { if (!knowledgeByCategory[k.category]) knowledgeByCategory[k.category] = []; knowledgeByCategory[k.category].push(`• ${k.title}: ${k.content}`); }
    const knowledgeContext = Object.entries(knowledgeByCategory).map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.join("\n")}`).join("\n\n");

    const annualGoals = activeGoals.filter(g => g.goal_type === "annual");
    const quarterlyGoals = activeGoals.filter(g => g.goal_type === "quarterly");
    const weeklyGoals = activeGoals.filter(g => g.goal_type === "weekly");

    const systemPrompt = `You are the Virtual CEO of ${businessName} (Kitz) — the first AI employee of this startup. You are AGENTIC: you don't just advise, you ACT. You have tools to create goals, spawn agents, save knowledge, log feedback, delegate to other agents, scrape the web, create contacts, and create orders. USE THEM proactively.

## YOUR IDENTITY
- Name: CEO Agent (NHI: ceo-prime-001)
- Role: Chief Executive Officer — you set strategy, allocate resources, define goals, and spawn new agents
- Philosophy: Move fast, measure everything, iterate weekly
- Brands: Kitz (product), xyz88.io (admin platform), admin.kitz.services (client admin panel)

## AGENTIC BEHAVIOR — CRITICAL
You MUST use your tools to take action, not just recommend. When you:
- Define a goal → call create_goal immediately
- Identify an agent gap → call spawn_agent immediately
- Learn something important → call add_knowledge immediately
- Hear feedback → call log_feedback immediately
- Review progress → call update_goal_progress
- Need specialist input → call delegate_to_agent
- Need market/competitor intel → call web_scrape
- Need to add a prospect → call create_contact
- Need to log a sale → call create_order

You can call MULTIPLE tools in a single response. Be proactive. Act first, explain after.

## TEAM MANAGEMENT — SPAWNING AGENTS
When asked to create an executive team or agents:
- Use spawn_agent for EACH agent, one at a time
- Write comprehensive system_prompt for each agent that defines their role, responsibilities, operating rules, and behavior style
- Use descriptive nhi_identifier (e.g. coo-exec-001, cfo-exec-001)
- Available agent types: sales, ops, cfo, cto, cpo, cro, coo, marketing, support, onboarding, analytics, growth, content, retention, custom
- If an agent of that type already exists, spawn_agent will UPDATE it instead of creating a duplicate
- After spawning, delegate a first task to each agent to verify they're working

## WHAT KITZ IS
Kitz is the AI-native business operating system for small businesses in LATAM and beyond. It replaces 10+ SaaS tools with one intelligent platform powered by AI agents.

## COMPANY STATE
- Business: ${businessName}
- Contacts: ${contactCount}
- Orders: ${orderCount}
- Active Agents: ${agents.filter(a => a.is_active).map(a => `${a.name} (${a.nhi_identifier || a.agent_type})`).join(", ") || "None besides you"}
- Active Campaigns: ${campaigns.filter(c => c.status === "active").map(c => c.name).join(", ") || "None"}

## EXISTING GOALS
ANNUAL: ${annualGoals.length > 0 ? annualGoals.map(g => `• ${g.title} (${g.progress}%) [id: ${g.id}]`).join("\n") : "None — CREATE THE AOP NOW"}
QUARTERLY: ${quarterlyGoals.length > 0 ? quarterlyGoals.map(g => `• ${g.title} (${g.progress}%) [id: ${g.id}]`).join("\n") : "None — break AOP into quarters"}
WEEKLY: ${weeklyGoals.length > 0 ? weeklyGoals.map(g => `• ${g.title} (${g.progress}%) [id: ${g.id}]`).join("\n") : "None — define this week's sprint"}

## KNOWLEDGE BASE
${knowledgeContext || "Empty — start capturing learnings immediately."}

## FEEDBACK (Last 30)
- New complaints: ${newComplaints.length} | Praises: ${praises.length} | Critical unresolved: ${criticalFeedback.length}
- Top friction: ${topFrictionAreas.map(([c,n]) => `${c}(${n})`).join(", ") || "None"}
${newComplaints.slice(0, 3).map(f => `• [${f.category}] ${f.title}`).join("\n") || ""}

## RULES
- Act first, explain after. Use tools proactively.
- Think ROI and revenue impact on every decision.
- Be direct, concise, action-oriented — like a real startup CEO.
- If no AOP exists, your FIRST action is creating one with create_goal.
- Speak in the language the owner uses (Spanish/English).
- Every conversation should end with concrete actions taken and next steps.
- When spawning agents, create comprehensive system prompts — don't just name them.

## AUTO-KNOWLEDGE CAPTURE — MANDATORY
After EVERY conversation, you MUST call add_knowledge at least once to capture the most important insight, decision, or learning from the exchange.`;


    // Agent Guard check
    const guardUrl = `${supabaseUrl}/functions/v1/agent-guard`;
    const lastUserMsg = messages?.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    const guardRes = await fetch(guardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({ business_id, agent_nhi: "ceo-prime-001", tool_name: "ai_chat", action: "ceo_chat", user_input: lastUserMsg }),
    });
    if (!guardRes.ok) {
      const guardBody = await guardRes.json().catch(() => ({ reason: "Policy check failed" }));
      return new Response(JSON.stringify({ error: guardBody.reason || "Blocked by security policy" }), {
        status: guardRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Agentic loop: call AI, execute tool calls, feed results back, repeat
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    const toolResults: Array<{ tool: string; args: Record<string, unknown>; result: string; success: boolean }> = [];
    let loopCount = 0;
    const MAX_LOOPS = 12; // High limit for bulk agent spawning (6 agents + knowledge + goals)

    const toolContext = { supabaseUrl, supabaseAnonKey };

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools: CEO_TOOLS,
          stream: false,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const t = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      const message = choice?.message;

      if (!message) break;

      conversationMessages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          const fnName = tc.function.name;
          let fnArgs: Record<string, unknown> = {};
          try { fnArgs = JSON.parse(tc.function.arguments); } catch { fnArgs = {}; }

          console.log(`CEO executing tool: ${fnName}`, fnArgs);

          const result = await executeTool(supabase, business_id, fnName, fnArgs, toolContext);
          toolResults.push({ tool: fnName, args: fnArgs, result: result.result, success: result.success });

          await supabase.from("agent_audit_log").insert({
            business_id,
            agent_nhi: "ceo-prime-001",
            tool_used: fnName,
            action: `ceo_tool_${fnName}`,
            risk_flag: fnName === "spawn_agent" ? "medium" : "low",
            human_approval: "auto_approved",
            payload: { args: fnArgs, result: result.result, success: result.success },
          });

          conversationMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ success: result.success, result: result.result }),
          });
        }
        continue;
      }

      break;
    }

    // Stream the final response
    const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: conversationMessages,
        stream: true,
      }),
    });

    if (!streamResponse.ok) {
      const t = await streamResponse.text();
      console.error("Stream error:", streamResponse.status, t);
      return new Response(JSON.stringify({ error: "AI streaming error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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

    await Promise.all([
      supabase.from("agent_audit_log").insert({
        business_id,
        agent_nhi: "ceo-prime-001",
        tool_used: "ai_chat",
        action: "ceo_conversation",
        risk_flag: "none",
        human_approval: "not_required",
        payload: { message_count: messages.length, tools_used: toolResults.length },
      }),
      supabase.from("event_logs").insert({
        business_id,
        event_type: "agent_invoked",
        channel: "web",
        actor_type: "owner",
        actor_id: userId,
        payload: { agent_type: "ceo", message_count: messages.length, tools_used: toolResults.map(t => t.tool) },
      }),
    ]);

    // Background knowledge extraction
    const alreadySavedKnowledge = toolResults.some(t => t.tool === "add_knowledge" && t.success);
    if (!alreadySavedKnowledge && messages.length >= 2) {
      (async () => {
        try {
          const extractionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: `Extract the single most important insight from this conversation. Return JSON: {category, title, content}. If none, return {"skip":true}.` },
                ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
              ],
              stream: false,
            }),
          });
          if (extractionResponse.ok) {
            const extractData = await extractionResponse.json();
            const text = extractData.choices?.[0]?.message?.content || "";
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (!parsed.skip && parsed.title && parsed.content) {
                await supabase.from("agent_knowledge").insert({
                  business_id,
                  category: parsed.category || "general",
                  title: parsed.title,
                  content: parsed.content,
                  source: "auto-extract",
                  created_by: "ceo-prime-001",
                });
              }
            }
          }
        } catch (e) {
          console.error("Knowledge extraction error:", e);
        }
      })();
    }

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ceo-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
