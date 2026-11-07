import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy as CopyIcon, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, reuseStats, type Copy, type Prompt } from "@/lib/reuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banco de prompts · AI Product Builder" },
      { name: "description", content: "Los mejores prompts de la clase, en un solo sitio. Copia, reutiliza y descubre cuáles usa más la gente." },
      { property: "og:title", content: "Banco de prompts del bootcamp" },
      { property: "og:description", content: "Los prompts de la clase, organizados por módulo y con reusos medidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function useName() {
  const [name, setName] = useState("");
  useEffect(() => setName(localStorage.getItem("pb-name") ?? ""), []);
  const save = (n: string) => {
    localStorage.setItem("pb-name", n);
    setName(n);
  };
  return [name, save] as const;
}

function Index() {
  const qc = useQueryClient();
  const [name, setName] = useName();
  const [module, setModule] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["bank"],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("prompts").select("*").order("created_at", { ascending: false }),
        supabase.from("prompt_copies").select("prompt_id, copier"),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      return { prompts: p.data as Prompt[], copies: c.data as Copy[] };
    },
  });
  const prompts = data?.prompts ?? [];
  const stats = useMemo(() => reuseStats(prompts, data?.copies ?? []), [data]);
  const visible = module ? prompts.filter((p) => p.module === module) : prompts;

  const copy = useMutation({
    mutationFn: async (p: Prompt) => {
      await navigator.clipboard.writeText(p.body);
      const { error } = await supabase.from("prompt_copies").insert({ prompt_id: p.id, copier: name });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Copiado al portapapeles");
      qc.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: () => toast.error("No se pudo copiar"),
  });

  if (!name) return <NameGate onSave={setName} />;

  const pct = prompts.length ? Math.round((stats.reusedPrompts / prompts.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">AI Product Builder · 2026</p>
          <h1 className="font-display text-6xl leading-none md:text-7xl">Banco de prompts</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Hola, <button className="underline" onClick={() => setName("")}>{name}</button>
          </span>
          <NewPrompt author={name} />
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4 py-8">
        <Stat value={stats.reuses} label="veces que alguien copió el prompt de otro" />
        <Stat value={stats.reusers} label="personas que han reutilizado" />
        <Stat value={`${pct}%`} label="de prompts reutilizados al menos una vez" />
      </section>

      <nav className="flex flex-wrap gap-2 pb-6">
        {[null, ...MODULES].map((m) => (
          <Button key={m ?? "all"} size="sm" variant={module === m ? "default" : "outline"} onClick={() => setModule(m)}>
            {m ?? "Todos"}
          </Button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="py-16 text-center font-display text-3xl text-muted-foreground">Aún no hay prompts aquí. Sé el primero.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((p) => (
            <article key={p.id} className="flex flex-col rounded-md border-2 border-foreground bg-card p-5 shadow-card">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider">
                <span className="rounded-sm bg-accent px-2 py-0.5 text-accent-foreground">{p.module}</span>
                <span className="text-muted-foreground">{stats.perPrompt.get(p.id) ?? 0} reusos</span>
              </div>
              <h2 className="font-display text-3xl leading-tight">{p.title}</h2>
              <p className="mb-4 text-sm text-muted-foreground">por {p.author}</p>
              <pre className="mb-4 max-h-48 flex-1 overflow-auto whitespace-pre-wrap rounded-sm bg-muted p-3 text-sm">{p.body}</pre>
              <Button onClick={() => copy.mutate(p)} disabled={copy.isPending}>
                <CopyIcon /> Copiar prompt
              </Button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="border-l-2 border-primary pl-4">
      <div className="font-display text-5xl text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function NameGate({ onSave }: { onSave: (n: string) => void }) {
  const [v, setV] = useState("");
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <form
        className="w-full max-w-md rounded-md border-2 border-foreground bg-card p-8 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (v.trim()) onSave(v.trim().slice(0, 60));
        }}
      >
        <h1 className="font-display text-5xl leading-none">Banco de prompts</h1>
        <p className="mb-6 mt-2 text-muted-foreground">Los buenos prompts de la clase, sin perderse en notas sueltas. ¿Cómo te llamas?</p>
        <Input autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Tu nombre" />
        <Button className="mt-4 w-full" type="submit">Entrar</Button>
      </form>
    </main>
  );
}

function NewPrompt({ author }: { author: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [module, setModule] = useState<string>(MODULES[0] ?? "Otros");
  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prompts").insert({ author, title: title.trim(), body: body.trim(), module });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Prompt guardado");
      setTitle("");
      setBody("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: () => toast.error("No se pudo guardar"),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus /> Añadir prompt</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">Nuevo prompt</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && body.trim()) add.mutate();
          }}
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (p. ej. Entrevista de discovery)" maxLength={120} />
          <div className="flex flex-wrap gap-2">
            {MODULES.map((m) => (
              <Button key={m} type="button" size="sm" variant={module === m ? "default" : "outline"} onClick={() => setModule(m)}>
                {m}
              </Button>
            ))}
          </div>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pega aquí tu prompt…" rows={8} maxLength={8000} />
          <Button type="submit" className="w-full" disabled={add.isPending}>Guardar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
