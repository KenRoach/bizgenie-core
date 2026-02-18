import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Public API bridge for xyz88.io
 *
 * Endpoints (via POST body `action`):
 *   contacts.list   — list contacts for a business
 *   contacts.create — create a new contact
 *   orders.list     — list orders for a business
 *   orders.create   — create a new order
 *   events.push     — push an event to the event log
 *
 * Auth: x-api-key header must match the API_BRIDGE_KEY secret.
 * The business_id must be provided in the body for all requests.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via API key
    const apiKey = req.headers.get("x-api-key");
    const API_BRIDGE_KEY = Deno.env.get("API_BRIDGE_KEY");
    if (!API_BRIDGE_KEY) {
      console.error("API_BRIDGE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!apiKey || apiKey !== API_BRIDGE_KEY) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS (this is a server-to-server call)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, business_id, data } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result: unknown;

    switch (action) {
      // ── Contacts ──────────────────────────────────────────────
      case "contacts.list": {
        const { data: contacts, error } = await supabase
          .from("contacts")
          .select("*")
          .eq("business_id", business_id)
          .order("created_at", { ascending: false })
          .limit(data?.limit ?? 100);
        if (error) throw error;
        result = contacts;
        break;
      }

      case "contacts.create": {
        if (!data?.name) throw new Error("name is required");
        const { data: contact, error } = await supabase
          .from("contacts")
          .insert({ business_id, ...data })
          .select()
          .single();
        if (error) throw error;
        result = contact;
        break;
      }

      case "contacts.update": {
        if (!data?.id) throw new Error("id is required");
        const { id, ...updates } = data;
        const { data: contact, error } = await supabase
          .from("contacts")
          .update(updates)
          .eq("id", id)
          .eq("business_id", business_id)
          .select()
          .single();
        if (error) throw error;
        result = contact;
        break;
      }

      // ── Orders ────────────────────────────────────────────────
      case "orders.list": {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .eq("business_id", business_id)
          .order("created_at", { ascending: false })
          .limit(data?.limit ?? 100);
        if (error) throw error;
        result = orders;
        break;
      }

      case "orders.create": {
        if (!data?.order_number) throw new Error("order_number is required");
        const { data: order, error } = await supabase
          .from("orders")
          .insert({ business_id, ...data })
          .select()
          .single();
        if (error) throw error;
        result = order;
        break;
      }

      case "orders.update": {
        if (!data?.id) throw new Error("id is required");
        const { id, ...updates } = data;
        const { data: order, error } = await supabase
          .from("orders")
          .update(updates)
          .eq("id", id)
          .eq("business_id", business_id)
          .select()
          .single();
        if (error) throw error;
        result = order;
        break;
      }

      // ── Events ────────────────────────────────────────────────
      case "events.push": {
        if (!data?.event_type) throw new Error("event_type is required");
        const { error } = await supabase
          .from("event_logs")
          .insert({ business_id, ...data });
        if (error) throw error;
        result = { ok: true };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("public-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
