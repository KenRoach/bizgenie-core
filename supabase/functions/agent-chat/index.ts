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
    const { messages, agent_type, business_id } = await req.json();

    // Fetch agent config
    let systemPrompt = "You are a helpful AI business assistant. Be concise and action-oriented.";
    let model = "google/gemini-3-flash-preview";
    let agentId: string | null = null;
    let agentNhi: string | null = null;

    if (business_id && agent_type) {
      const { data: agentConfig } = await supabase
        .from("agent_configurations")
        .select("system_prompt, model, id, nhi_identifier")
        .eq("business_id", business_id)
        .eq("agent_type", agent_type)
        .eq("is_active", true)
        .maybeSingle();

      if (agentConfig) {
        if (agentConfig.system_prompt) systemPrompt = agentConfig.system_prompt;
        if (agentConfig.model) model = agentConfig.model;
        agentId = agentConfig.id;
        agentNhi = agentConfig.nhi_identifier;
      }
    }

    // Agent Guard: policy enforcement
    if (business_id) {
      const guardUrl = `${supabaseUrl}/functions/v1/agent-guard`;
      const lastUserMsg = messages?.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
      const guardRes = await fetch(guardUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
        body: JSON.stringify({
          business_id,
          agent_id: agentId,
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
        model,
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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log event
    if (business_id) {
      await supabase.from("event_logs").insert({
        business_id,
        event_type: "agent_invoked",
        channel: "web",
        actor_type: "owner",
        actor_id: userId,
        payload: { agent_type, message_count: messages.length },
      });
    }

    return new Response(response.body, {
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
