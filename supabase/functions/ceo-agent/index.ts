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
      description: "Create a new AI agent configuration. Use when you identify a capability gap that needs a dedicated agent.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Agent display name" },
          agent_type: { type: "string", enum: ["sales", "ops", "cfo", "marketing", "support", "onboarding", "analytics", "growth", "content", "retention", "custom"], description: "Agent type" },
          system_prompt: { type: "string", description: "The agent's system prompt defining its role and behavior" },
          nhi_identifier: { type: "string", description: "Non-human identity ID (e.g. marketing-agent-001)" },
          model: { type: "string", description: "AI model to use. Default: google/gemini-3-flash-preview" },
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
];

// Execute a tool call against the database
async function executeTool(
  supabase: ReturnType<typeof createClient>,
  businessId: string,
  toolName: string,
  args: Record<string, unknown>
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
        const { data, error } = await supabase.from("agent_configurations").insert({
          business_id: businessId,
          name: args.name,
          agent_type: args.agent_type as string,
          system_prompt: args.system_prompt,
          nhi_identifier: args.nhi_identifier,
          model: args.model || "google/gemini-3-flash-preview",
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

    const systemPrompt = `You are the Virtual CEO of ${businessName} (Kitz) — the first AI employee of this startup. You are AGENTIC: you don't just advise, you ACT. You have tools to create goals, spawn agents, save knowledge, and log feedback. USE THEM proactively.

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

You can call MULTIPLE tools in a single response. Be proactive. Act first, explain after.

## WHAT KITZ IS
Kitz is the AI-native business operating system for small businesses in LATAM and beyond. It replaces 10+ SaaS tools with one intelligent platform powered by AI agents.

## COMPANY STATE
- Business: ${businessName}
- Contacts: ${contactCount}
- Orders: ${orderCount}
- Active Agents: ${agents.filter(a => a.is_active).map(a => `${a.name} (${a.nhi_identifier})`).join(", ") || "None besides you"}
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
- Every conversation should end with concrete actions taken and next steps.`;

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

    // Agentic loop: call AI, execute tool calls, feed results back, repeat until no more tool calls
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];
    const toolResults: Array<{ tool: string; args: Record<string, unknown>; result: string; success: boolean }> = [];
    let loopCount = 0;
    const MAX_LOOPS = 5; // Prevent infinite loops

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: conversationMessages,
          tools: CEO_TOOLS,
          stream: false, // Non-streaming for tool calling phase
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

      // Add the assistant message to conversation
      conversationMessages.push(message);

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const tc of message.tool_calls) {
          const fnName = tc.function.name;
          let fnArgs: Record<string, unknown> = {};
          try { fnArgs = JSON.parse(tc.function.arguments); } catch { fnArgs = {}; }

          console.log(`CEO executing tool: ${fnName}`, fnArgs);

          const result = await executeTool(supabase, business_id, fnName, fnArgs);
          toolResults.push({ tool: fnName, args: fnArgs, result: result.result, success: result.success });

          // Log to audit
          await supabase.from("agent_audit_log").insert({
            business_id,
            agent_nhi: "ceo-prime-001",
            tool_used: fnName,
            action: `ceo_tool_${fnName}`,
            risk_flag: fnName === "spawn_agent" ? "medium" : "low",
            human_approval: "auto_approved",
            payload: { args: fnArgs, result: result.result, success: result.success },
          });

          // Add tool result to conversation for the AI to see
          conversationMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ success: result.success, result: result.result }),
          });
        }
        // Continue loop so AI can see tool results and potentially call more tools or give final answer
        continue;
      }

      // No tool calls — we have a final text response. Now stream it.
      break;
    }

    // Now do a final streaming call with the full conversation (including tool results)
    // so the user gets a nice streamed summary
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

    // Build a custom SSE stream that first emits tool actions, then streams the AI response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // 1. Emit tool actions as special SSE events
        if (toolResults.length > 0) {
          const actionsEvent = `data: ${JSON.stringify({ type: "tool_actions", actions: toolResults })}\n\n`;
          controller.enqueue(encoder.encode(actionsEvent));
        }

        // 2. Pipe through the AI stream
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

    // Log to audit & events
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
