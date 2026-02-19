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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { business_id, huddle_id, topic, huddle_type } = await req.json();
    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // If huddle_id exists, this is a follow-up. Otherwise create new huddle.
    let activeHuddleId = huddle_id;

    if (!activeHuddleId) {
      // Create the huddle
      const { data: huddle, error: hErr } = await supabase.from("agent_huddles").insert({
        business_id,
        topic,
        huddle_type: huddle_type || "concern",
      }).select().single();
      if (hErr) throw new Error(hErr.message);
      activeHuddleId = huddle.id;

      // Insert user's opening message
      await supabase.from("agent_huddle_messages").insert({
        huddle_id: activeHuddleId,
        business_id,
        sender_type: "user",
        sender_name: "You",
        content: topic,
      });
    }

    // Fetch all active C-suite agents
    const executiveTypes = ["ceo", "cfo", "cto", "cpo", "cro", "coo"];
    const { data: agents } = await supabase
      .from("agent_configurations")
      .select("id, name, agent_type, system_prompt, model, nhi_identifier")
      .eq("business_id", business_id)
      .eq("is_active", true)
      .in("agent_type", executiveTypes);

    if (!agents || agents.length === 0) {
      return new Response(JSON.stringify({ error: "No active C-suite agents", huddle_id: activeHuddleId }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all messages in this huddle for context
    const { data: existingMsgs } = await supabase
      .from("agent_huddle_messages")
      .select("sender_name, sender_type, content")
      .eq("huddle_id", activeHuddleId)
      .order("created_at");

    const conversationHistory = (existingMsgs || [])
      .map(m => `[${m.sender_name}]: ${m.content}`)
      .join("\n");

    // Fetch business context
    const [goalsRes, knowledgeRes] = await Promise.all([
      supabase.from("agent_goals").select("title, progress, status, goal_type").eq("business_id", business_id).eq("status", "active"),
      supabase.from("agent_knowledge").select("category, title, content").eq("business_id", business_id).order("updated_at", { ascending: false }).limit(15),
    ]);

    const goalsContext = (goalsRes.data || []).map(g => `- ${g.goal_type}: "${g.title}" (${g.progress}%)`).join("\n");
    const knowledgeContext = (knowledgeRes.data || []).map(k => `- [${k.category}] ${k.title}: ${k.content}`).join("\n");

    // Stream SSE: each agent responds sequentially
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        // Send huddle_id first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "huddle_id", huddle_id: activeHuddleId })}\n\n`));

        for (const agent of agents) {
          const systemPrompt = `${agent.system_prompt || `You are ${agent.name}, the ${agent.agent_type.toUpperCase()} agent.`}

## HUDDLE CONTEXT
This is a team huddle initiated by the business owner. All C-suite agents are participating.
Respond naturally as you would in a leadership meeting. Be direct, concise (2-4 sentences max), and actionable.
If you have a follow-up question, ask it. If this isn't your domain, say so briefly and defer.

## ACTIVE GOALS
${goalsContext || "None"}

## KNOWLEDGE BASE (recent)
${knowledgeContext || "Empty"}

## CONVERSATION SO FAR
${conversationHistory}`;

          try {
            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: agent.model || "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: topic },
                ],
                stream: false,
              }),
            });

            if (!aiResp.ok) {
              console.error(`Agent ${agent.name} failed: ${aiResp.status}`);
              continue;
            }

            const aiData = await aiResp.json();
            const content = aiData.choices?.[0]?.message?.content || "";
            if (!content) continue;

            // Save to DB using service role (bypasses RLS)
            await serviceSupabase.from("agent_huddle_messages").insert({
              huddle_id: activeHuddleId,
              business_id,
              sender_type: "agent",
              sender_agent_id: agent.id,
              sender_name: agent.name,
              content,
            });

            // Stream to client
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: "agent_response",
              agent_id: agent.id,
              agent_name: agent.name,
              agent_type: agent.agent_type,
              content,
            })}\n\n`));
          } catch (e) {
            console.error(`Agent ${agent.name} error:`, e);
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-huddle error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
