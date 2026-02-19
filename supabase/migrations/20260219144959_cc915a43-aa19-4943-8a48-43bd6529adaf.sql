
-- Huddle threads
CREATE TABLE public.agent_huddles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  topic TEXT NOT NULL,
  huddle_type TEXT NOT NULL DEFAULT 'concern',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_huddles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_huddles" ON public.agent_huddles FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_huddles" ON public.agent_huddles FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_huddles" ON public.agent_huddles FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_huddles" ON public.agent_huddles FOR DELETE USING (is_business_owner(business_id));

-- Huddle messages (from owner or agents)
CREATE TABLE public.agent_huddle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  huddle_id UUID NOT NULL REFERENCES public.agent_huddles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  sender_type TEXT NOT NULL DEFAULT 'user',
  sender_agent_id UUID REFERENCES public.agent_configurations(id),
  sender_name TEXT NOT NULL DEFAULT 'You',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_huddle_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_huddle_msgs" ON public.agent_huddle_messages FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_huddle_msgs" ON public.agent_huddle_messages FOR INSERT WITH CHECK (is_business_owner(business_id));

-- Enable realtime for live huddle feed
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_huddle_messages;

-- Trigger for updated_at
CREATE TRIGGER update_huddles_updated_at BEFORE UPDATE ON public.agent_huddles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
