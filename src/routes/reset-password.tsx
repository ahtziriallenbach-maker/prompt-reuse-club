import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nueva contraseña · Banco de prompts y skills" },
      { name: "description", content: "Elige una nueva contraseña para tu cuenta del banco de prompts y skills." },
      { property: "og:title", content: "Nueva contraseña" },
      { property: "og:description", content: "Elige una nueva contraseña para el banco de prompts y skills." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form className="w-full max-w-md space-y-3 rounded-md border-2 border-foreground bg-card p-8 shadow-card" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await supabase.auth.updateUser({ password });
        setBusy(false);
        if (error) return toast.error("El enlace ha caducado o no es válido. Pide uno nuevo.");
        toast.success("Contraseña actualizada");
        navigate({ to: "/banco" });
      }}>
        <h1 className="font-display text-5xl leading-none">Nueva contraseña</h1>
        <Input aria-label="Nueva contraseña" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña" autoComplete="new-password" />
        <Button className="w-full" type="submit" disabled={busy}>{busy ? "Guardando…" : "Guardar contraseña"}</Button>
      </form>
    </main>
  );
}
