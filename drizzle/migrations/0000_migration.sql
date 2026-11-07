CREATE TABLE public.prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL CHECK (char_length(author) BETWEEN 1 AND 60),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  module text NOT NULL CHECK (char_length(module) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.prompts TO anon, authenticated;
GRANT ALL ON public.prompts TO service_role;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads prompts" ON public.prompts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone adds prompts" ON public.prompts FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE TABLE public.prompt_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  copier text NOT NULL CHECK (char_length(copier) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.prompt_copies TO anon, authenticated;
GRANT ALL ON public.prompt_copies TO service_role;
ALTER TABLE public.prompt_copies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads copies" ON public.prompt_copies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone logs copies" ON public.prompt_copies FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE INDEX ON public.prompt_copies(prompt_id);