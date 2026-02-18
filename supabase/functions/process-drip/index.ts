import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Drip Campaign Processor — runs on cron every minute.
 * Finds enrollments where next_step_at <= now() and status = 'active',
 * executes the step (logs event, future: email/whatsapp), then advances.
 */
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find due enrollments
    const { data: dueEnrollments, error: fetchErr } = await supabase
      .from("drip_enrollments")
      .select("*, drip_campaigns!inner(name, status), contacts!inner(name, email, whatsapp)")
      .eq("status", "active")
      .lte("next_step_at", new Date().toISOString())
      .limit(100);

    if (fetchErr) throw fetchErr;
    if (!dueEnrollments || dueEnrollments.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let processed = 0;

    for (const enrollment of dueEnrollments) {
      const nextStepOrder = enrollment.current_step + 1;

      // Get the step to execute
      const { data: step } = await supabase
        .from("drip_steps")
        .select("*")
        .eq("campaign_id", enrollment.campaign_id)
        .eq("step_order", nextStepOrder)
        .single();

      if (!step) {
        // No more steps — mark completed
        await supabase
          .from("drip_enrollments")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", enrollment.id);

        await supabase.from("event_logs").insert({
          business_id: enrollment.business_id,
          event_type: "drip_completed",
          actor_type: "system",
          channel: "drip",
          payload: {
            campaign_id: enrollment.campaign_id,
            campaign_name: enrollment.drip_campaigns?.name,
            contact_name: enrollment.contacts?.name,
            contact_id: enrollment.contact_id,
            detail: `Drip "${enrollment.drip_campaigns?.name}" completed for ${enrollment.contacts?.name}`,
          },
        });

        processed++;
        continue;
      }

      // Execute the step based on channel
      const contact = enrollment.contacts as { name: string; email: string | null; whatsapp: string | null };
      const stepDetail = `Step ${step.step_order}: [${step.channel}] ${step.subject || step.body.substring(0, 80)}`;

      // Log the drip step execution as an event
      await supabase.from("event_logs").insert({
        business_id: enrollment.business_id,
        event_type: "drip_step_executed",
        actor_type: "system",
        channel: step.channel,
        payload: {
          campaign_id: enrollment.campaign_id,
          campaign_name: enrollment.drip_campaigns?.name,
          step_order: step.step_order,
          channel: step.channel,
          contact_name: contact.name,
          contact_id: enrollment.contact_id,
          subject: step.subject,
          detail: stepDetail,
          message: step.body,
        },
      });

      // TODO: Actual email/whatsapp sending would go here
      // For email: integrate Resend/SendGrid
      // For whatsapp: integrate WhatsApp Business API

      // Check if there's a next step
      const { data: nextStep } = await supabase
        .from("drip_steps")
        .select("delay_minutes")
        .eq("campaign_id", enrollment.campaign_id)
        .eq("step_order", nextStepOrder + 1)
        .maybeSingle();

      const nextStepAt = nextStep
        ? new Date(Date.now() + nextStep.delay_minutes * 60000).toISOString()
        : null;

      await supabase
        .from("drip_enrollments")
        .update({
          current_step: nextStepOrder,
          next_step_at: nextStepAt,
          ...(nextStep ? {} : { status: "completed", completed_at: new Date().toISOString() }),
        })
        .eq("id", enrollment.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-drip error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
