CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, left(coalesce(nullif(trim(NEW.raw_user_meta_data->>'display_name'), ''), split_part(NEW.email, '@', 1)), 60))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.prompts ADD COLUMN owner_id uuid;
ALTER TABLE public.prompt_copies ADD COLUMN copier_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "anyone reads prompts" ON public.prompts;
DROP POLICY IF EXISTS "anyone reads copies" ON public.prompt_copies;
DROP POLICY IF EXISTS "anyone logs copies" ON public.prompt_copies;
REVOKE ALL ON public.prompts FROM anon;
REVOKE ALL ON public.prompt_copies FROM anon;
GRANT SELECT ON public.prompts TO authenticated;
GRANT SELECT, INSERT ON public.prompt_copies TO authenticated;
CREATE POLICY "members read prompts" ON public.prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "members read copies" ON public.prompt_copies FOR SELECT TO authenticated USING (true);
CREATE POLICY "members log own copies" ON public.prompt_copies FOR INSERT TO authenticated WITH CHECK (copier_id = auth.uid());

COMMENT ON TABLE public.prompt_ownership IS 'DEPRECATED: replaced by prompts.owner_id (account ownership)';