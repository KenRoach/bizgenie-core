
-- Businesses table
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text UNIQUE,
  settings jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Agent configurations
CREATE TABLE public.agent_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_type text NOT NULL CHECK (agent_type IN ('sales', 'ops', 'cfo')),
  name text NOT NULL,
  system_prompt text,
  model text DEFAULT 'google/gemini-3-flash-preview',
  config jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Event log (append-only)
CREATE TABLE public.event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  channel text,
  actor_type text,
  actor_id text,
  payload jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contacts (CRM)
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  instagram text,
  whatsapp text,
  lead_score integer DEFAULT 0,
  pipeline_stage text DEFAULT 'new',
  tags text[] DEFAULT '{}',
  total_revenue numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  total numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  items jsonb DEFAULT '[]',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GitHub integrations
CREATE TABLE public.github_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  repo_owner text NOT NULL,
  repo_name text NOT NULL,
  access_token_secret_ref text,
  webhook_url text,
  is_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- OpenClaw configs
CREATE TABLE public.openclaw_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'default',
  router_config jsonb DEFAULT '{}',
  retry_policy jsonb DEFAULT '{"max_retries": 3, "backoff_ms": 1000}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function: check if current user owns a business
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses
    WHERE id = _business_id AND owner_id = auth.uid()
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agent_configurations_updated_at BEFORE UPDATE ON public.agent_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_github_integrations_updated_at BEFORE UPDATE ON public.github_integrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_openclaw_configs_updated_at BEFORE UPDATE ON public.openclaw_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create default business on signup
CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.businesses (owner_id, name, slug)
  VALUES (NEW.id, 'My Business', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_business
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_business();

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openclaw_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Businesses RLS
CREATE POLICY "owners_select_businesses" ON public.businesses FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "owners_insert_businesses" ON public.businesses FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners_update_businesses" ON public.businesses FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "owners_delete_businesses" ON public.businesses FOR DELETE USING (owner_id = auth.uid());

-- Agent configurations RLS
CREATE POLICY "owners_select_agents" ON public.agent_configurations FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "owners_insert_agents" ON public.agent_configurations FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "owners_update_agents" ON public.agent_configurations FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "owners_delete_agents" ON public.agent_configurations FOR DELETE USING (public.is_business_owner(business_id));

-- Event logs RLS (append-only)
CREATE POLICY "owners_select_events" ON public.event_logs FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "owners_insert_events" ON public.event_logs FOR INSERT WITH CHECK (public.is_business_owner(business_id));

-- Contacts RLS
CREATE POLICY "owners_select_contacts" ON public.contacts FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "owners_insert_contacts" ON public.contacts FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "owners_update_contacts" ON public.contacts FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "owners_delete_contacts" ON public.contacts FOR DELETE USING (public.is_business_owner(business_id));

-- Orders RLS
CREATE POLICY "owners_select_orders" ON public.orders FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "owners_insert_orders" ON public.orders FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "owners_update_orders" ON public.orders FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "owners_delete_orders" ON public.orders FOR DELETE USING (public.is_business_owner(business_id));

-- GitHub integrations RLS
CREATE POLICY "owners_select_github" ON public.github_integrations FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "owners_insert_github" ON public.github_integrations FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "owners_update_github" ON public.github_integrations FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "owners_delete_github" ON public.github_integrations FOR DELETE USING (public.is_business_owner(business_id));

-- OpenClaw configs RLS
CREATE POLICY "owners_select_openclaw" ON public.openclaw_configs FOR SELECT USING (public.is_business_owner(business_id));
CREATE POLICY "owners_insert_openclaw" ON public.openclaw_configs FOR INSERT WITH CHECK (public.is_business_owner(business_id));
CREATE POLICY "owners_update_openclaw" ON public.openclaw_configs FOR UPDATE USING (public.is_business_owner(business_id));
CREATE POLICY "owners_delete_openclaw" ON public.openclaw_configs FOR DELETE USING (public.is_business_owner(business_id));

-- Profiles RLS
CREATE POLICY "users_select_own_profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "users_update_own_profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "users_insert_own_profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_agent_configs_business ON public.agent_configurations(business_id);
CREATE INDEX idx_event_logs_business ON public.event_logs(business_id);
CREATE INDEX idx_event_logs_type ON public.event_logs(event_type);
CREATE INDEX idx_event_logs_created ON public.event_logs(created_at DESC);
CREATE INDEX idx_contacts_business ON public.contacts(business_id);
CREATE INDEX idx_orders_business ON public.orders(business_id);
CREATE INDEX idx_orders_contact ON public.orders(contact_id);
CREATE INDEX idx_github_business ON public.github_integrations(business_id);
CREATE INDEX idx_openclaw_business ON public.openclaw_configs(business_id);

-- Enable realtime for event_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_logs;
