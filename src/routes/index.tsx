import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy as CopyIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createPrompt, getOwnedPromptIds, managePrompt } from "@/lib/prompts.functions";
import { isPromptAuthor } from "@/lib/prompt-ownership";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, reuseStats, type Copy, type Prompt } from "@/lib/reuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [onlyMine, setOnlyMine] = useState(false);
  const ownedIdsFn = useServerFn(getOwnedPromptIds);
  const { data: ownedIds = [] } = useQuery({
    queryKey: ["owned-prompts", name],
    queryFn: () => ownedIdsFn(),
    enabled: Boolean(name),
  });

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
  const myPrompts = prompts.filter((p) => isPromptAuthor(p.author, name));
  const scopedPrompts = onlyMine ? myPrompts : prompts;
  const visible = module ? scopedPrompts.filter((p) => p.module === module) : scopedPrompts;
  const perModule = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of scopedPrompts) m.set(p.module, (m.get(p.module) ?? 0) + 1);
    return m;
  }, [scopedPrompts]);

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
            Hola, <Button variant="link" className="h-auto p-0" onClick={() => setName("")}>{name}</Button>
          </span>
          <NewPrompt author={name} />
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4 py-8">
        <Stat value={stats.reuses} label="veces que alguien copió el prompt de otro" />
        <Stat value={stats.reusers} label="personas que han reutilizado" />
        <Stat value={`${pct}%`} label="de prompts reutilizados al menos una vez" />
      </section>

      <div className="mb-4 flex gap-2 border-b pb-4" role="group" aria-label="Vista de prompts">
        <Button variant={onlyMine ? "outline" : "default"} aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>Banco de la clase</Button>
        <Button variant={onlyMine ? "default" : "outline"} aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>Mis prompts ({myPrompts.length})</Button>
      </div>
      <nav className="flex flex-wrap gap-2 pb-6" aria-label="Módulos">
        {[null, ...MODULES].map((m) => (
          <Button key={m ?? "all"} size="sm" variant={module === m ? "default" : "outline"} onClick={() => setModule(m)}>
            {m ?? "Todos"} <span className="opacity-60">({m ? (perModule.get(m) ?? 0) : scopedPrompts.length})</span>
          </Button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="py-16 text-center font-display text-3xl text-muted-foreground">{onlyMine ? (module ? "No has añadido prompts en este módulo." : "Todavía no has añadido ningún prompt.") : "Aún no hay prompts aquí. Sé el primero."}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((p) => (
            <article key={p.id} className="flex flex-col rounded-md border-2 border-foreground bg-card p-5 shadow-card">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider">
                <span className="rounded-sm bg-accent px-2 py-0.5 text-accent-foreground">{p.module}</span>
                <span className="text-muted-foreground">{stats.perPrompt.get(p.id) ?? 0} reusos</span>
              </div>
              <h2 className="break-words font-display text-3xl leading-tight">{p.title}</h2>
              <p className="mb-4 break-words text-sm text-muted-foreground">Añadido por <span className="font-medium text-foreground">{p.author}</span></p>
              <pre className="mb-4 max-h-48 flex-1 overflow-auto whitespace-pre-wrap rounded-sm bg-muted p-3 text-sm">{p.body}</pre>
              <Button onClick={() => copy.mutate(p)} disabled={copy.isPending}>
                <CopyIcon /> Copiar prompt
              </Button>
              {ownedIds.includes(p.id) && <div className="mt-3 flex justify-end gap-2 border-t pt-3"><NewPrompt author={name} prompt={p} /><DeletePrompt prompt={p} /></div>}
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

function NewPrompt({ author, prompt }: { author: string; prompt?: Prompt }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createPrompt);
  const manageFn = useServerFn(managePrompt);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(prompt?.title ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const [module, setModule] = useState<string>(prompt?.module ?? MODULES[0] ?? "Otros");
  const add = useMutation({
    mutationFn: async () => {
      const fields = { title: title.trim(), body: body.trim(), module };
      if (prompt) await manageFn({ data: { ...fields, id: prompt.id, action: "edit" } });
      else await createFn({ data: { ...fields, author } });
    },
    onSuccess: () => {
      toast.success(prompt ? "Cambios guardados" : "Prompt guardado");
      if (!prompt) { setTitle(""); setBody(""); }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["bank"] });
      qc.invalidateQueries({ queryKey: ["owned-prompts"] });
    },
    onError: () => toast.error("No se pudo guardar"),
  });
  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (add.isPending) return;
      if (value && prompt) { setTitle(prompt.title); setBody(prompt.body); setModule(prompt.module); }
      setOpen(value);
    }}>
      <DialogTrigger asChild>
        {prompt ? <Button variant="outline" size="icon" title="Editar prompt" aria-label={`Editar ${prompt.title}`}><Pencil /></Button> : <Button><Plus /> Añadir prompt</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">{prompt ? "Editar prompt" : "Nuevo prompt"}</DialogTitle>
          <DialogDescription className="sr-only">Título, módulo y contenido del prompt</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && body.trim()) add.mutate();
          }}
        >
          <Input aria-label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (p. ej. Entrevista de discovery)" maxLength={120} disabled={add.isPending} />
          <div className="flex flex-wrap gap-2">
            {MODULES.map((m) => (
              <Button key={m} type="button" size="sm" disabled={add.isPending} variant={module === m ? "default" : "outline"} onClick={() => setModule(m)}>
                {m}
              </Button>
            ))}
          </div>
          <Textarea aria-label="Contenido del prompt" required disabled={add.isPending} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Pega aquí tu prompt…" rows={8} maxLength={8000} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={add.isPending} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={add.isPending || !title.trim() || !body.trim()}>{add.isPending ? "Guardando…" : prompt ? "Guardar cambios" : "Guardar"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePrompt({ prompt }: { prompt: Prompt }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const manageFn = useServerFn(managePrompt);
  const remove = useMutation({
    mutationFn: () => manageFn({ data: { action: "delete", id: prompt.id } }),
    onSuccess: () => {
      setOpen(false);
      toast.success("Prompt eliminado");
      qc.invalidateQueries({ queryKey: ["bank"] });
      qc.invalidateQueries({ queryKey: ["owned-prompts"] });
    },
    onError: () => toast.error("No se pudo eliminar el prompt"),
  });
  return <Dialog open={open} onOpenChange={(value) => { if (!remove.isPending) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" size="icon" className="text-destructive" title="Eliminar prompt" aria-label={`Eliminar ${prompt.title}`}><Trash2 /></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-3xl font-normal">¿Eliminar este prompt?</DialogTitle>
        <DialogDescription className="break-words">«{prompt.title}» se eliminará del banco junto con sus reusos. No se puede deshacer.</DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setOpen(false)} disabled={remove.isPending}>Cancelar</Button>
        <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}><Trash2 />{remove.isPending ? "Eliminando…" : "Eliminar prompt"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
