
-- Add NHI (Non-Human Identity) fields to agent_configurations
ALTER TABLE public.agent_configurations
  ADD COLUMN IF NOT EXISTS nhi_identifier text UNIQUE,
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS token_ttl_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS last_token_at timestamptz;

-- Tool Registry: verified tools with risk tagging
CREATE TABLE public.tool_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  risk_level text NOT NULL DEFAULT 'low',
  max_calls_per_minute integer NOT NULL DEFAULT 60,
  data_scope jsonb DEFAULT '[]'::jsonb,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  total_invocations bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_tools" ON public.tool_registry FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_tools" ON public.tool_registry FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_tools" ON public.tool_registry FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_tools" ON public.tool_registry FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_tool_registry_updated_at BEFORE UPDATE ON public.tool_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agent Audit Log: immutable (SELECT + INSERT only)
CREATE TABLE public.agent_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.agent_configurations(id) ON DELETE SET NULL,
  agent_nhi text,
  tool_used text,
  action text NOT NULL,
  cost_units numeric DEFAULT 0,
  risk_flag text DEFAULT 'none',
  human_approval text DEFAULT 'not_required',
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_audit" ON public.agent_audit_log FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_audit" ON public.agent_audit_log FOR INSERT WITH CHECK (is_business_owner(business_id));
-- No UPDATE or DELETE policies: immutable log

-- Emergency Controls
CREATE TABLE public.emergency_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  control_type text NOT NULL,
  target_agent_id uuid REFERENCES public.agent_configurations(id) ON DELETE CASCADE,
  is_engaged boolean DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  triggered_by text,
  triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.emergency_controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_controls" ON public.emergency_controls FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_controls" ON public.emergency_controls FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_controls" ON public.emergency_controls FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_controls" ON public.emergency_controls FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_emergency_controls_updated_at BEFORE UPDATE ON public.emergency_controls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_audit_log_business_created ON public.agent_audit_log(business_id, created_at DESC);
CREATE INDEX idx_audit_log_agent ON public.agent_audit_log(agent_id);
CREATE INDEX idx_audit_log_risk ON public.agent_audit_log(risk_flag) WHERE risk_flag != 'none';
CREATE INDEX idx_tool_registry_business ON public.tool_registry(business_id);
CREATE INDEX idx_emergency_controls_business ON public.emergency_controls(business_id);
