CREATE TABLE public.prompt_ownership (
 prompt_id uuid PRIMARY KEY REFERENCES public.prompts(id) ON DELETE CASCADE,
 owner_hash text NOT NULL CHECK (char_length(owner_hash) = 64)
);
GRANT ALL ON public.prompt_ownership TO service_role;
ALTER TABLE public.prompt_ownership ENABLE ROW LEVEL SECURITY;
CREATE INDEX prompt_ownership_owner_hash_idx ON public.prompt_ownership(owner_hash);
COMMENT ON TABLE public.prompt_ownership IS 'Private browser capability hashes; never exposed to public readers. Legacy prompts have no ownership record.';