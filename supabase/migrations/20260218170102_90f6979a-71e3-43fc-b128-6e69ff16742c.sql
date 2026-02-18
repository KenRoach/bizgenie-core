
-- Feedback collection table for the daily feedback loop
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'manual',
  category TEXT NOT NULL DEFAULT 'general',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'new',
  fix_type TEXT NULL,
  fix_deadline DATE NULL,
  resolution_notes TEXT NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_feedback" ON public.feedback FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_feedback" ON public.feedback FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_feedback" ON public.feedback FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_feedback" ON public.feedback FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON public.feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_feedback_business_category ON public.feedback (business_id, category);
CREATE INDEX idx_feedback_business_status ON public.feedback (business_id, status);
CREATE INDEX idx_feedback_business_created ON public.feedback (business_id, created_at DESC);
