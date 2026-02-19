
-- Skill Library: reusable skills (prompts, scripts, SOPs, files) for agents
CREATE TABLE public.skill_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  skill_type TEXT NOT NULL DEFAULT 'prompt',
  content TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  assigned_agent_ids UUID[] DEFAULT '{}',
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count BIGINT DEFAULT 0,
  created_by TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_select_skills" ON public.skill_library FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "owners_insert_skills" ON public.skill_library FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "owners_update_skills" ON public.skill_library FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "owners_delete_skills" ON public.skill_library FOR DELETE USING (is_business_owner(business_id));

CREATE TRIGGER update_skills_updated_at BEFORE UPDATE ON public.skill_library
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for skill files (PDFs, scripts, etc.)
INSERT INTO storage.buckets (id, name, public) VALUES ('skill-files', 'skill-files', false);

CREATE POLICY "owners_upload_skill_files" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'skill-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "owners_read_skill_files" ON storage.objects FOR SELECT
USING (bucket_id = 'skill-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "owners_delete_skill_files" ON storage.objects FOR DELETE
USING (bucket_id = 'skill-files' AND auth.uid() IS NOT NULL);
