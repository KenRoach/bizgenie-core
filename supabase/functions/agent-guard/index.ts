import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(all\s+)?prior/i,
  /you\s+are\s+now\s+a/i,
  /pretend\s+you\s+are/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /\<\|im_start\|\>/i,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  /reveal\s+(your\s+)?(system|initial)\s+prompt/i,
];

function detectInjection(text: string): { detected: boolean; pattern: string | null } {
  for (const p of INJECTION_PATTERNS) {
    if (p.test(text)) return { detected: true, pattern: p.source };
  }
  return { detected: false, pattern: null };
}

function detectExfiltration(text: string): boolean {
  const patterns = [
    /https?:\/\/[^\s]+\?.*(?:key|token|secret|password)/i,
    /fetch\s*\(/i,
    /XMLHttpRequest/i,
    /webhook\.site/i,
    /ngrok\.io/i,
  ];
  return patterns.some(p => p.test(text));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { business_id, agent_id, agent_nhi, tool_name, action, messages, user_input } = await req.json();

    if (!business_id || !action) {
      return new Response(JSON.stringify({ error: "business_id and action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check emergency controls - kill switches
    const { data: controls } = await supabase
      .from("emergency_controls")
      .select("*")
      .eq("business_id", business_id)
      .eq("is_engaged", true);

    for (const ctrl of controls || []) {
      // Global kill switch
      if (ctrl.control_type === "kill_switch" && !ctrl.target_agent_id) {
        await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `BLOCKED: global kill switch - ${action}`, risk_flag: "critical", human_approval: "denied" });
        return new Response(JSON.stringify({ allowed: false, reason: "Global kill switch engaged" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Per-agent kill switch
      if (ctrl.control_type === "kill_switch" && ctrl.target_agent_id === agent_id) {
        await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `BLOCKED: agent kill switch - ${action}`, risk_flag: "high", human_approval: "denied" });
        return new Response(JSON.stringify({ allowed: false, reason: "Agent kill switch engaged" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // AI battery check
      if (ctrl.control_type === "ai_battery") {
        const config = ctrl.config as { max_credits?: number; used_credits?: number; auto_disable?: boolean };
        if (config.auto_disable && config.max_credits && config.used_credits && config.used_credits >= config.max_credits) {
          await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `BLOCKED: AI battery depleted - ${action}`, risk_flag: "high", human_approval: "denied" });
          return new Response(JSON.stringify({ allowed: false, reason: "AI battery depleted" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      // Global throttle
      if (ctrl.control_type === "global_throttle") {
        const config = ctrl.config as { max_rpm?: number };
        if (config.max_rpm) {
          const oneMinAgo = new Date(Date.now() - 60000).toISOString();
          const { count } = await supabase
            .from("agent_audit_log")
            .select("*", { count: "exact", head: true })
            .eq("business_id", business_id)
            .gte("created_at", oneMinAgo);
          if ((count || 0) >= config.max_rpm) {
            await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `THROTTLED: ${action}`, risk_flag: "medium", human_approval: "denied" });
            return new Response(JSON.stringify({ allowed: false, reason: "Global throttle limit reached" }), {
              status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // 2. Check tool registry - is tool verified and active?
    if (tool_name) {
      const { data: tool } = await supabase
        .from("tool_registry")
        .select("*")
        .eq("business_id", business_id)
        .eq("name", tool_name)
        .maybeSingle();

      if (tool) {
        if (!tool.is_active) {
          await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `BLOCKED: tool disabled - ${action}`, risk_flag: "medium", human_approval: "denied" });
          return new Response(JSON.stringify({ allowed: false, reason: `Tool '${tool_name}' is disabled` }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (!tool.is_verified) {
          await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `WARNING: unverified tool used - ${action}`, risk_flag: "high", human_approval: "pending" });
        }
        // Rate limit per tool
        const oneMinAgo = new Date(Date.now() - 60000).toISOString();
        const { count } = await supabase
          .from("agent_audit_log")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business_id)
          .eq("tool_used", tool_name)
          .gte("created_at", oneMinAgo);
        if ((count || 0) >= tool.max_calls_per_minute) {
          await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `RATE LIMITED: ${tool_name}`, risk_flag: "medium", human_approval: "denied" });
          return new Response(JSON.stringify({ allowed: false, reason: `Tool '${tool_name}' rate limit exceeded` }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Increment invocations
        await supabase.from("tool_registry").update({ total_invocations: (tool.total_invocations || 0) + 1 }).eq("id", tool.id);
      }
    }

    // 3. Prompt injection detection
    const textToCheck = user_input || (messages?.map((m: { content: string }) => m.content).join(" ") || "");
    if (textToCheck) {
      const injection = detectInjection(textToCheck);
      if (injection.detected) {
        await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `BLOCKED: prompt injection detected - pattern: ${injection.pattern}`, risk_flag: "critical", human_approval: "denied", payload: { pattern: injection.pattern, input_preview: textToCheck.slice(0, 200) } });
        return new Response(JSON.stringify({ allowed: false, reason: "Prompt injection detected" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Exfiltration check
      if (detectExfiltration(textToCheck)) {
        await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action: `BLOCKED: data exfiltration attempt`, risk_flag: "critical", human_approval: "denied", payload: { input_preview: textToCheck.slice(0, 200) } });
        return new Response(JSON.stringify({ allowed: false, reason: "Data exfiltration attempt detected" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 4. All clear — log and allow
    const riskFlag = tool_name ? "none" : "low";
    await logAudit(supabase, { business_id, agent_id, agent_nhi, tool_used: tool_name, action, risk_flag: riskFlag, human_approval: "not_required" });

    return new Response(JSON.stringify({ allowed: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agent-guard error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function logAudit(supabase: ReturnType<typeof createClient>, entry: {
  business_id: string;
  agent_id?: string;
  agent_nhi?: string;
  tool_used?: string;
  action: string;
  risk_flag: string;
  human_approval: string;
  payload?: Record<string, unknown>;
}) {
  await supabase.from("agent_audit_log").insert({
    business_id: entry.business_id,
    agent_id: entry.agent_id || null,
    agent_nhi: entry.agent_nhi || null,
    tool_used: entry.tool_used || null,
    action: entry.action,
    risk_flag: entry.risk_flag,
    human_approval: entry.human_approval,
    payload: entry.payload || {},
  });
}
