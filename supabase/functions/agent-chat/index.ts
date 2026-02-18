import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tools available to all agents (read access to business data + write actions)
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
];

// Execute a tool call
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  toolName: string,
  args: Record<string, unknown>
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
          created_by: "agent",
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
      default:
        return { success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (e) {
    return { success: false, result: `Error: ${e instanceof Error ? e.message : "Unknown"}` };
  }
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

    // Gather business context so the agent has real data awareness
    const [businessRes, goalsRes, knowledgeRes, contactsCountRes, ordersCountRes] = await Promise.all([
      supabase.from("businesses").select("name").eq("id", business_id).single(),
      supabase.from("agent_goals").select("id, goal_type, title, progress, status").eq("business_id", business_id).eq("status", "active").order("goal_type"),
      supabase.from("agent_knowledge").select("category, title, content").eq("business_id", business_id).order("updated_at", { ascending: false }).limit(30),
      supabase.from("contacts").select("*", { count: "exact", head: true }).eq("business_id", business_id),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("business_id", business_id),
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

ALWAYS use tools to look up real data before answering data questions. Never guess or make up numbers.
When you discover something important, save it to the knowledge base with add_knowledge.`;

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
    const MAX_LOOPS = 5;

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
          const result = await executeTool(supabase, business_id, fnName, fnArgs);
          toolResults.push({ tool: fnName, args: fnArgs, result: result.result, success: result.success });

          // Audit log
          await supabase.from("agent_audit_log").insert({
            business_id,
            agent_id: resolvedAgentId,
            agent_nhi: agentNhi,
            tool_used: fnName,
            action: `agent_tool_${fnName}`,
            risk_flag: "low",
            human_approval: "auto_approved",
            payload: { args: fnArgs, result: result.result, success: result.success, data: result.data },
          });

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
