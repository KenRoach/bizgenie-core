
-- API keys/secrets vault for external integrations
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  key_label TEXT NOT NULL,
  key_value TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_api_keys" ON public.api_keys FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_api_keys" ON public.api_keys FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_api_keys" ON public.api_keys FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_api_keys" ON public.api_keys FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
