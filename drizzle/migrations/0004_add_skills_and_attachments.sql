ALTER TABLE public.prompts ADD COLUMN kind text NOT NULL DEFAULT 'prompt' CHECK (kind IN ('prompt', 'skill'));
ALTER TABLE public.prompts ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(attachments) = 'array');
COMMENT ON COLUMN public.prompts.kind IS 'Resource type; existing resources remain prompts.';
COMMENT ON COLUMN public.prompts.attachments IS 'Skill file metadata; bytes stored privately in skill-files, managed through browser capability server functions.';