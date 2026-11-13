import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "signup", "forgot"]).optional() }),
  head: () => ({
    meta: [
      { title: "Entrar · Banco de prompts y skills" },
      { name: "description", content: "Crea tu cuenta o entra al banco de prompts y skills para Product Managers." },
      { property: "og:title", content: "Entrar al banco de prompts y skills" },
      { property: "og:description", content: "Regístrate con tu email para ver y compartir prompts y skills con otros PMs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState(search.mode ?? "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/banco`, data: { display_name: name.trim().slice(0, 60) } } });
        if (error) throw error;
        setSent("Te hemos enviado un email. Confirma tu cuenta desde el enlace para entrar.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("Si existe una cuenta con ese email, recibirás un enlace para elegir una nueva contraseña.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/banco" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      toast.error(/invalid login/i.test(msg) ? "Email o contraseña incorrectos" : /not confirmed/i.test(msg) ? "Confirma tu email antes de entrar" : /already registered/i.test(msg) ? "Ya existe una cuenta con ese email" : msg || "Algo ha fallado");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-md rounded-md border-2 border-foreground bg-card p-8 shadow-card">
        <Link to="/" className="text-sm uppercase tracking-widest text-muted-foreground">← Banco de prompts y skills</Link>
        <h1 className="mt-3 font-display text-5xl leading-none">{mode === "signup" ? "Crea tu cuenta" : mode === "forgot" ? "Recupera tu contraseña" : "Entra"}</h1>
        {sent ? <p className="mt-6 text-muted-foreground">{sent}</p> : (
          <form className="mt-6 space-y-3" onSubmit={submit}>
            {mode === "signup" && <Input aria-label="Nombre" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre (lo verán otros PMs)" maxLength={60} />}
            <Input aria-label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" autoComplete="email" />
            {mode !== "forgot" && <Input aria-label="Contraseña" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
            <Button className="w-full" type="submit" disabled={busy}>{busy ? "Un momento…" : mode === "signup" ? "Crear cuenta" : mode === "forgot" ? "Enviar enlace" : "Entrar"}</Button>
          </form>
        )}
        <div className="mt-6 flex flex-col gap-1 text-sm">
          {mode !== "login" && <Button variant="link" className="h-auto justify-start p-0" onClick={() => { setMode("login"); setSent(null); }}>Ya tengo cuenta: entrar</Button>}
          {mode !== "signup" && <Button variant="link" className="h-auto justify-start p-0" onClick={() => { setMode("signup"); setSent(null); }}>No tengo cuenta: registrarme</Button>}
          {mode === "login" && <Button variant="link" className="h-auto justify-start p-0" onClick={() => { setMode("forgot"); setSent(null); }}>¿Olvidaste tu contraseña?</Button>}
        </div>
      </div>
    </main>
  );
}
