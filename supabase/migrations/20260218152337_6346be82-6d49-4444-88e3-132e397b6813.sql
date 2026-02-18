-- Drip Campaigns
CREATE TABLE public.drip_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, paused
  trigger_type TEXT NOT NULL DEFAULT 'manual', -- manual, contact_created, pipeline_change, api_event
  trigger_config JSONB DEFAULT '{}'::jsonb, -- e.g. {"stage": "qualified"} or {"event_type": "signup"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_drip_campaigns" ON public.drip_campaigns FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_drip_campaigns" ON public.drip_campaigns FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_drip_campaigns" ON public.drip_campaigns FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_drip_campaigns" ON public.drip_campaigns FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_drip_campaigns_updated_at
  BEFORE UPDATE ON public.drip_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drip Steps
CREATE TABLE public.drip_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.drip_campaigns(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL DEFAULT 1,
  delay_minutes INTEGER NOT NULL DEFAULT 0, -- delay after enrollment / previous step
  channel TEXT NOT NULL DEFAULT 'internal', -- email, whatsapp, internal
  subject TEXT, -- for email
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drip_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_drip_steps" ON public.drip_steps FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_drip_steps" ON public.drip_steps FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_drip_steps" ON public.drip_steps FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_drip_steps" ON public.drip_steps FOR DELETE USING (is_business_owner(business_id));

-- Drip Enrollments
CREATE TABLE public.drip_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.drip_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_step_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(campaign_id, contact_id)
);

ALTER TABLE public.drip_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_drip_enrollments" ON public.drip_enrollments FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_drip_enrollments" ON public.drip_enrollments FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_drip_enrollments" ON public.drip_enrollments FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_drip_enrollments" ON public.drip_enrollments FOR DELETE USING (is_business_owner(business_id));

-- Realtime for enrollments
ALTER PUBLICATION supabase_realtime ADD TABLE public.drip_enrollments;

-- Auto-enrollment trigger: new contact created
CREATE OR REPLACE FUNCTION public.auto_enroll_new_contact()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.drip_enrollments (campaign_id, contact_id, business_id, next_step_at)
  SELECT dc.id, NEW.id, NEW.business_id, now() + (ds.delay_minutes * interval '1 minute')
  FROM public.drip_campaigns dc
  LEFT JOIN public.drip_steps ds ON ds.campaign_id = dc.id AND ds.step_order = 1
  WHERE dc.business_id = NEW.business_id
    AND dc.status = 'active'
    AND dc.trigger_type = 'contact_created'
  ON CONFLICT (campaign_id, contact_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_enroll_new_contact
  AFTER INSERT ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_new_contact();

-- Auto-enrollment trigger: pipeline stage change
CREATE OR REPLACE FUNCTION public.auto_enroll_pipeline_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO public.drip_enrollments (campaign_id, contact_id, business_id, next_step_at)
    SELECT dc.id, NEW.id, NEW.business_id, now() + (ds.delay_minutes * interval '1 minute')
    FROM public.drip_campaigns dc
    LEFT JOIN public.drip_steps ds ON ds.campaign_id = dc.id AND ds.step_order = 1
    WHERE dc.business_id = NEW.business_id
      AND dc.status = 'active'
      AND dc.trigger_type = 'pipeline_change'
      AND (dc.trigger_config->>'stage') = NEW.pipeline_stage
    ON CONFLICT (campaign_id, contact_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_enroll_pipeline_change
  AFTER UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_pipeline_change();