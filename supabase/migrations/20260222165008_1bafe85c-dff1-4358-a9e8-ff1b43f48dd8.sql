
-- Add onboarding_completed to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create products table
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Owner CRUD policies
CREATE POLICY "owners_select_products" ON public.products FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_products" ON public.products FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_products" ON public.products FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_products" ON public.products FOR DELETE USING (is_business_owner(business_id));
