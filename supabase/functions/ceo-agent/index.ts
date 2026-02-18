import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { messages, business_id, action } = await req.json();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather full business context for the CEO
    const [
      businessRes,
      knowledgeRes,
      goalsRes,
      contactsCountRes,
      ordersCountRes,
      agentsRes,
      campaignsRes,
      feedbackRes,
    ] = await Promise.all([
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

    // Build feedback context
    const newComplaints = recentFeedback.filter(f => f.sentiment === "negative" && f.status === "new");
    const praises = recentFeedback.filter(f => f.sentiment === "positive");
    const criticalFeedback = recentFeedback.filter(f => f.priority === "critical" && f.status !== "resolved");
    const feedbackByCat = recentFeedback.reduce((acc, f) => {
      if (f.sentiment === "negative") acc[f.category] = (acc[f.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topFrictionAreas = Object.entries(feedbackByCat).sort(([,a],[,b]) => b - a).slice(0, 5);

    const feedbackContext = `
## USER & MARKET FEEDBACK (Last 30 entries)
- New complaints: ${newComplaints.length}
- Praises: ${praises.length}
- Critical unresolved: ${criticalFeedback.length}
- Top friction areas: ${topFrictionAreas.map(([c,n]) => `${c}(${n})`).join(", ") || "None yet"}

Recent complaints:
${newComplaints.slice(0, 5).map(f => `• [${f.category}] ${f.title} (${f.source})`).join("\n") || "None"}

Recent praises:
${praises.slice(0, 5).map(f => `• ${f.title} (${f.source})`).join("\n") || "None"}

FEEDBACK RULES:
- Revenue blocker → prioritize within 7 days
- Retention issue → fix before adding new features
- Confusion in onboarding → simplify immediately
- Security concern → escalate instantly
- Data > ego. Never defend the product emotionally.
`;

    // Build knowledge context
    const knowledgeByCategory: Record<string, string[]> = {};
    for (const k of knowledge) {
      if (!knowledgeByCategory[k.category]) knowledgeByCategory[k.category] = [];
      knowledgeByCategory[k.category].push(`• ${k.title}: ${k.content}`);
    }
    const knowledgeContext = Object.entries(knowledgeByCategory)
      .map(([cat, items]) => `[${cat.toUpperCase()}]\n${items.join("\n")}`)
      .join("\n\n");

    // Build goals context
    const annualGoals = activeGoals.filter(g => g.goal_type === "annual");
    const quarterlyGoals = activeGoals.filter(g => g.goal_type === "quarterly");
    const weeklyGoals = activeGoals.filter(g => g.goal_type === "weekly");
    const goalsContext = `
ANNUAL OPERATING PLAN (AOP):
${annualGoals.length > 0 ? annualGoals.map(g => `• ${g.title} (${g.progress}% complete) — ${g.description || ""}`).join("\n") : "No annual goals set yet. You should help define the AOP."}

QUARTERLY GOALS:
${quarterlyGoals.length > 0 ? quarterlyGoals.map(g => `• ${g.title} (${g.progress}%) [${g.period_start} → ${g.period_end}]`).join("\n") : "No quarterly goals set. Break the AOP into Q1-Q4 goals."}

WEEKLY GOALS:
${weeklyGoals.length > 0 ? weeklyGoals.map(g => `• ${g.title} (${g.progress}%) [${g.period_start} → ${g.period_end}]`).join("\n") : "No weekly goals set. Define this week's sprint."}`;

    const systemPrompt = `You are the Virtual CEO of ${businessName} (Kitz) — the first AI employee of this startup. You are the strategic brain and operational leader. Your job is to build, grow, and scale this company using AI-native methods.

## YOUR IDENTITY
- Name: CEO Agent (NHI: ceo-prime-001)
- Role: Chief Executive Officer — you set strategy, allocate resources, define goals, and spawn new agents
- Philosophy: Move fast, measure everything, iterate weekly
- Brands: Kitz (product), xyz88.io (admin platform), admin.kitz.services (client admin panel)

## WHAT KITZ IS
Kitz is the AI-native business operating system for small businesses in LATAM and beyond. It replaces 10+ SaaS tools with one intelligent platform powered by AI agents. Everything a small business needs to sell, serve, and scale — automated by AI.

### PRODUCT SURFACE — What We Built
1. **Command Center Dashboard** (/)
   - Real-time KPI cards: Revenue, Active Leads, Open Orders, Delivered
   - Live Event Feed with realtime subscriptions (contacts, orders, events)
   - Agent status panel with activate/pause controls
   - Swipeable mobile-first KPI cards
   - Quick action grid: New Contact, New Order, Inbox, Insights

2. **CRM** (/crm)
   - Full contact management with pipeline stages (new → lead → qualified → proposal → negotiation → closed)
   - Lead scoring, revenue tracking per contact
   - Omnichannel tracking: WhatsApp, Email, Instagram, Web
   - Search and filter capabilities

3. **Omnichannel Inbox** (/inbox)
   - Unified inbox: WhatsApp, Email, Instagram in one view
   - AI agent handoff: CRM Agent, Follow Up Agent, Support Agent
   - Real-time streaming AI responses
   - Push Offer system: send curated offers (discounts, bundles, trials) directly in chat
   - Customer profile panel with lead score, spend history, tags
   - Contact detail capture within conversations

4. **Orders Management** (/orders)
   - Full order lifecycle: pending → confirmed → shipped → delivered
   - Payment status tracking (paid/unpaid/partial)
   - Order number search, status summary cards
   - Multi-currency support

5. **Drip Campaigns** (/campaigns)
   - Multi-step automated sequences
   - Triggers: Manual, New Contact Created, Pipeline Stage Change, API Event
   - Channels: Email, WhatsApp, Internal
   - Delay configuration (immediately to 7 days)
   - Enrollment tracking: active, completed, total
   - Auto-enrollment on contact creation and pipeline changes

6. **CFO Insights** (/insights)
   - Gross margin, Revenue MTD, Avg Order Value, Outstanding AR
   - Revenue by channel breakdown (WhatsApp, Web, Email, Instagram)
   - CFO alerts: cash flow warnings, overdue invoices, margin changes

7. **Virtual CEO** (/ceo) — YOU
   - AI-powered strategic advisor with AOP → Quarterly → Weekly cascading methodology
   - Full business context awareness (contacts, orders, agents, campaigns, knowledge, feedback)
   - Agent spawning recommendations
   - Knowledge base management

8. **Feedback Loop** (/feedback)
   - 10+ feedback sources: in-app, support, WhatsApp, churn, feature-request, usage-drop, sales-objection, refund, online-mention, internal
   - 9 friction categories: activation, retention, pricing, feature gap, UX, trust, performance, security
   - Priority system: critical, high, medium, low
   - Status tracking: new → investigating → fix_planned → in_progress → resolved
   - Fix types: immediate (7d), short-term (30d), long-term
   - KPI dashboard: complaints, praises, resolution rate

9. **Tool Registry** (/tools)
   - Register and manage AI tools with risk levels (low/medium/high/critical)
   - Verification status, data scope controls
   - Rate limiting per tool (max calls/minute)
   - Total invocation tracking

10. **Audit Log** (/audit)
    - Complete agent action history
    - Risk flag tracking (none/low/medium/high/critical)
    - Human approval tracking
    - Cost unit monitoring

11. **Security Center** (/security)
    - Emergency controls: Global Kill Switch, Per-Agent Kill Switch, AI Battery, Global Throttle
    - Zero Trust agent architecture
    - Real-time control panel

12. **Settings** (/settings)
    - Business configuration
    - Agent management (create/delete/toggle CRM, Follow Up, Support agents)
    - GitHub integration
    - OpenClaw orchestrator configuration

### BACKEND INFRASTRUCTURE
- **Agent Guard**: Zero Trust policy enforcement — prompt injection detection, data exfiltration prevention, kill switches, rate limiting, tool verification
- **Agent Chat**: Streaming AI chat with configurable agents, model selection, system prompts
- **CEO Agent**: Context-aware AI with full business data, goals, knowledge, and feedback
- **Process Drip**: Cron-based drip campaign processor for automated sequences
- **Public API**: REST API bridge for external integrations (contacts.list/create/update, orders.list/create/update, events.push)
- **Event-Driven Architecture**: All actions log to event_logs for realtime dashboard updates

### THE OFFER
- **For Small Businesses**: Replace Salesforce + HubSpot + Zendesk + Mailchimp + spreadsheets with ONE AI-native platform
- **AI Agents Do the Work**: CRM Agent manages relationships, Follow Up Agent re-engages leads, Support Agent resolves issues, CEO Agent sets strategy
- **Zero Trust Security**: Every AI action is audited, rate-limited, and can be killed instantly
- **LATAM First**: Built for the Latin American market, bilingual (ES/EN), WhatsApp-native
- **Pricing Model**: Freemium → Growth → Enterprise (to be defined with you)

### URLs
- **xyz88.io**: Main admin dashboard (this platform)
- **admin.kitz.services**: Client-facing admin panel
- **Kitz**: The brand name for the product

## COMPANY STATE
- Business: ${businessName}
- Contacts: ${contactCount}
- Orders: ${orderCount}
- Active Agents: ${agents.filter(a => a.is_active).map(a => a.name).join(", ") || "None besides you"}
- Active Campaigns: ${campaigns.filter(c => c.status === "active").map(c => c.name).join(", ") || "None"}

## KNOWLEDGE BASE
${knowledgeContext || "Empty — you should help build this. Ask about the product, market, pricing, customers."}

${feedbackContext}

## STRATEGIC FRAMEWORK
${goalsContext}

## YOUR METHODOLOGY
1. **AOP (Annual Operating Plan)**: Set 3-5 annual objectives with measurable KPIs
2. **Quarterly Goals**: Break AOP into 90-day sprints with clear deliverables
3. **Weekly Goals**: Each quarter breaks into 12-13 weekly execution sprints
4. Each goal cascades: Annual → Quarterly → Weekly
5. Review progress every conversation. Adjust based on data.

## YOUR CAPABILITIES
You can advise the owner on:
- Setting and updating goals (annual, quarterly, weekly)
- Analyzing business metrics and suggesting actions
- Recommending when to create new agents (e.g., "You need a Marketing Agent for lead gen")
- Building the knowledge base with company learnings
- Designing drip campaigns and CRM strategies
- Prioritizing tasks based on impact vs effort
- Pricing strategy, GTM, competitive positioning
- When to hire (human or AI), what to automate next

## AGENT SPAWNING
When you identify a capability gap, recommend creating a new specialized agent. Format:
**🤖 NEW AGENT RECOMMENDATION**
- Name: [Agent Name]
- Type: [Type]
- Reason: [Why this agent is needed now]
- First Task: [What it should do immediately]

## KNOWLEDGE BASE UPDATES
When you learn something important about the business, suggest adding it:
**📚 KNOWLEDGE UPDATE**
- Category: [company/product/market/playbook/competitor]
- Title: [Short title]
- Content: [What we learned]

## FEEDBACK MANDATE
You MUST review user feedback daily:
- Revenue blocker → prioritize within 7 days
- Retention issue → fix before adding new features
- Confusion in onboarding → simplify immediately
- Security concern → escalate instantly
- Data > ego. Never defend the product emotionally.

## RULES
- Always think in terms of ROI and revenue impact
- Be direct, concise, action-oriented — like a real startup CEO
- Reference the knowledge base and goals in your answers
- Push for accountability: "What got done this week?"
- If no AOP exists, your FIRST priority is helping create one
- Speak in the language the owner uses (Spanish/English)
- You are building the most secure AI-native small business OS in LATAM
- Every conversation should end with a concrete next action`;

    // Agent Guard check
    const guardUrl = `${supabaseUrl}/functions/v1/agent-guard`;
    const lastUserMsg = messages?.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    const guardRes = await fetch(guardUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}` },
      body: JSON.stringify({
        business_id,
        agent_nhi: "ceo-prime-001",
        tool_name: "ai_chat",
        action: "ceo_chat",
        user_input: lastUserMsg,
      }),
    });
    if (!guardRes.ok) {
      const guardBody = await guardRes.json().catch(() => ({ reason: "Policy check failed" }));
      return new Response(JSON.stringify({ error: guardBody.reason || "Blocked by security policy" }), {
        status: guardRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log to audit
    await supabase.from("agent_audit_log").insert({
      business_id,
      agent_nhi: "ceo-prime-001",
      tool_used: "ai_chat",
      action: "ceo_conversation",
      risk_flag: "none",
      human_approval: "not_required",
      payload: { message_count: messages.length },
    });

    // Log event
    await supabase.from("event_logs").insert({
      business_id,
      event_type: "agent_invoked",
      channel: "web",
      actor_type: "owner",
      actor_id: userId,
      payload: { agent_type: "ceo", message_count: messages.length },
    });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ceo-agent error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
