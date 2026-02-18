
-- Knowledge Base: evolving company intelligence
CREATE TABLE public.agent_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  content text NOT NULL,
  source text DEFAULT 'manual',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_knowledge" ON public.agent_knowledge FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_knowledge" ON public.agent_knowledge FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_knowledge" ON public.agent_knowledge FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_knowledge" ON public.agent_knowledge FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_agent_knowledge_updated_at BEFORE UPDATE ON public.agent_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_knowledge_business_cat ON public.agent_knowledge(business_id, category);

-- Strategic Goals: AOP → Quarterly → Weekly cascade
CREATE TABLE public.agent_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agent_configurations(id) ON DELETE SET NULL,
  goal_type text NOT NULL DEFAULT 'weekly',
  title text NOT NULL,
  description text,
  metrics jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  period_start date,
  period_end date,
  parent_goal_id uuid REFERENCES public.agent_goals(id) ON DELETE SET NULL,
  progress numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_goals" ON public.agent_goals FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_goals" ON public.agent_goals FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_goals" ON public.agent_goals FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_goals" ON public.agent_goals FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_agent_goals_updated_at BEFORE UPDATE ON public.agent_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_goals_business_type ON public.agent_goals(business_id, goal_type);
CREATE INDEX idx_goals_parent ON public.agent_goals(parent_goal_id);
CREATE INDEX idx_goals_status ON public.agent_goals(status) WHERE status = 'active';
