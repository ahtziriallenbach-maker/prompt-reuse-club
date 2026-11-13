import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BookOpen, Copy, BarChart3, FolderKanban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banco de prompts y skills · AI Product Builder" },
      { name: "description", content: "Los prompts y skills de la clase, en un solo sitio. Copia, reutiliza y descubre cuáles usa más la gente." },
      { property: "og:title", content: "Banco de prompts y skills del bootcamp" },
      { property: "og:description", content: "Deja de perder los buenos prompts en notas sueltas: compártelos con tu clase." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: FolderKanban, title: "Por módulo", text: "Prompts y skills ordenados según los módulos del bootcamp, de Fundamentos de IA al Demo Day." },
  { icon: Copy, title: "Copia en un clic", text: "Copia el prompt de un compañero o descarga los archivos de su skill y úsalo al momento." },
  { icon: BarChart3, title: "Reusos medidos", text: "Cada recurso muestra cuántas veces lo ha copiado otra persona. Así sabemos qué funciona." },
  { icon: BookOpen, title: "Tus aportaciones", text: "Edita o elimina lo que has compartido desde cualquier dispositivo." },
];

function Landing() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/banco", replace: true }); });
  }, [navigate]);
  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between border-b-2 border-foreground pb-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">AI Product Builder · 2026</p>
        <Button asChild variant="outline"><Link to="/auth">Entrar</Link></Button>
      </header>
      <section className="py-16">
        <h1 className="font-display text-6xl leading-none md:text-8xl">Los buenos prompts no deberían perderse.</h1>
        <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
          Cada persona de la clase guarda sus prompts en notas sueltas, y los mejores acaban olvidados. Este banco los reúne en un solo sitio para que podamos usar los prompts y skills de los demás.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/auth" search={{ mode: "signup" }}>Crear cuenta</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Ya tengo cuenta</Link></Button>
        </div>
      </section>
      <section className="grid gap-5 border-t-2 border-foreground py-10 md:grid-cols-2">
        {FEATURES.map((f) => (
          <article key={f.title} className="rounded-md border-2 border-foreground bg-card p-5 shadow-card">
            <f.icon className="mb-3 size-6 text-primary" />
            <h2 className="font-display text-3xl">{f.title}</h2>
            <p className="mt-1 text-muted-foreground">{f.text}</p>
          </article>
        ))}
      </section>
      <section className="border-t-2 border-foreground py-10">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">La pregunta de la clase</p>
        <p className="mt-2 font-display text-4xl">¿Alguien vuelve a usar el prompt de otro?</p>
      </section>
    </main>
  );
}
