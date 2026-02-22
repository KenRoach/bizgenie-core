
-- Create checkout_links table
CREATE TABLE public.checkout_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  title text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checkout_links ENABLE ROW LEVEL SECURITY;

-- Owner CRUD policies
CREATE POLICY "owners_select_checkout_links" ON public.checkout_links FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_checkout_links" ON public.checkout_links FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_checkout_links" ON public.checkout_links FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_checkout_links" ON public.checkout_links FOR DELETE USING (is_business_owner(business_id));

-- Public anonymous read (for storefront)
CREATE POLICY "public_read_checkout_link" ON public.checkout_links FOR SELECT TO anon USING (true);

-- Public anonymous update of buyer info
CREATE POLICY "public_update_buyer_info" ON public.checkout_links FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Public read of businesses for storefront
CREATE POLICY "public_read_business_for_storefront" ON public.businesses FOR SELECT TO anon USING (true);

-- Updated_at trigger
CREATE TRIGGER update_checkout_links_updated_at BEFORE UPDATE ON public.checkout_links FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
