REVOKE ALL ON public.prompt_ownership FROM anon, authenticated;
GRANT ALL ON public.prompt_ownership TO service_role;