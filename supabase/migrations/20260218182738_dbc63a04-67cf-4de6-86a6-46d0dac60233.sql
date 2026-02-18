ALTER TABLE public.agent_configurations DROP CONSTRAINT agent_configurations_agent_type_check;

ALTER TABLE public.agent_configurations ADD CONSTRAINT agent_configurations_agent_type_check
  CHECK (agent_type = ANY (ARRAY[
    'sales','ops','cfo','cto','cpo','cro','coo',
    'marketing','support','onboarding','analytics',
    'growth','content','retention','custom',
    'crm','followup'
  ]::text[]));