import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Copy as CopyIcon, Plus, Pencil, Trash2, Download, Paperclip, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createPrompt, managePrompt, downloadSkillFile } from "@/lib/prompts.functions";
import { getAttachments, validateFile } from "@/lib/resources";
import { supabase } from "@/integrations/supabase/client";
import { MODULES, reuseStats, type Copy, type Prompt } from "@/lib/reuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/banco")({
  head: () => ({
    meta: [
      { title: "Banco de prompts y skills para PMs" },
      { name: "description", content: "Prompts y skills para Product Managers, en un solo sitio. Copia, reutiliza y descubre cuáles usa más la gente." },
      { property: "og:title", content: "Banco de prompts y skills para PMs" },
      { property: "og:description", content: "Prompts y skills para PMs, organizados por fase de trabajo y con reusos medidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sin sesión");
      const { data } = await supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle();
      return { id: u.user.id, name: data?.display_name ?? u.user.email ?? "" };
    },
  });
}

function Index() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const name = me?.name ?? "";
  const userId = me?.id ?? "";
  const [module, setModule] = useState<string | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [kind, setKind] = useState<"prompt" | "skill" | null>(null);

  const { data } = useQuery({
    queryKey: ["bank"],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("prompts").select("*").order("created_at", { ascending: false }),
        supabase.from("prompt_copies").select("prompt_id, copier, copier_id"),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      return { prompts: p.data as Prompt[], copies: c.data as Copy[] };
    },
  });
  const prompts = data?.prompts ?? [];
  const stats = useMemo(() => reuseStats(prompts, data?.copies ?? []), [data]);
  const myPrompts = prompts.filter((p) => userId && p.owner_id === userId);
  const mineScope = onlyMine ? myPrompts : prompts;
  const scopedPrompts = kind ? mineScope.filter((p) => (p.kind ?? "prompt") === kind) : mineScope;
  const visible = module ? scopedPrompts.filter((p) => p.module === module) : scopedPrompts;
  const perModule = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of scopedPrompts) m.set(p.module, (m.get(p.module) ?? 0) + 1);
    return m;
  }, [scopedPrompts]);

  const copy = useMutation({
    mutationFn: async (p: Prompt) => {
      await navigator.clipboard.writeText(p.body);
      const { error } = await supabase.from("prompt_copies").insert({ prompt_id: p.id, copier: name, copier_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Copiado al portapapeles");
      qc.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: () => toast.error("No se pudo copiar"),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  if (!me) return null;

  const pct = prompts.length ? Math.round((stats.reusedPrompts / prompts.length) * 100) : 0;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-6">
        <div>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Para Product Managers</p>
          <h1 className="font-display text-6xl leading-none md:text-7xl">Banco de prompts y skills</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            Hola, <span className="font-medium text-foreground">{name}</span>
          </span>
          <NewPrompt />
          <Button variant="outline" onClick={signOut}><LogOut /> Salir</Button>
        </div>
      </header>

      <section className="grid grid-cols-3 gap-4 py-8">
        <Stat value={stats.reuses} label="veces que alguien copió un recurso de otra persona" />
        <Stat value={stats.reusers} label="personas que han reutilizado" />
        <Stat value={`${pct}%`} label="de recursos reutilizados al menos una vez" />
      </section>

      <div className="mb-4 flex gap-2 border-b pb-4" role="group" aria-label="Vista de prompts">
        <Button variant={onlyMine ? "outline" : "default"} aria-pressed={!onlyMine} onClick={() => setOnlyMine(false)}>Banco completo</Button>
        <Button variant={onlyMine ? "default" : "outline"} aria-pressed={onlyMine} onClick={() => setOnlyMine(true)}>Mis aportaciones ({myPrompts.length})</Button>
      </div>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Tipo de recurso">
        {([null, "prompt", "skill"] as const).map((k) => <Button key={k ?? "all"} size="sm" variant={kind === k ? "default" : "outline"} aria-pressed={kind === k} onClick={() => setKind(k)}>{k === null ? "Todo" : k === "skill" ? "Skills" : "Prompts"} ({k === null ? mineScope.length : mineScope.filter((p) => (p.kind ?? "prompt") === k).length})</Button>)}
      </div>
      <nav className="flex flex-wrap gap-2 pb-6" aria-label="Fases de trabajo">
        {[null, ...MODULES].map((m) => (
          <Button key={m ?? "all"} size="sm" variant={module === m ? "default" : "outline"} onClick={() => setModule(m)}>
            {m ?? "Todos"} <span className="opacity-60">({m ? (perModule.get(m) ?? 0) : scopedPrompts.length})</span>
          </Button>
        ))}
      </nav>

      {visible.length === 0 ? (
        <p className="py-16 text-center font-display text-3xl text-muted-foreground">{onlyMine ? (module ? "No has añadido recursos en esta fase." : "Todavía no has añadido ningún recurso.") : "Aún no hay recursos aquí. Sé el primero."}</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visible.map((p) => (
            <article key={p.id} className="flex flex-col rounded-md border-2 border-foreground bg-card p-5 shadow-card">
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider">
                <span className="rounded-sm bg-accent px-2 py-0.5 text-accent-foreground">{p.module} · {p.kind === "skill" ? "Skill" : "Prompt"}</span>
                <span className="text-muted-foreground">{stats.perPrompt.get(p.id) ?? 0} reusos</span>
              </div>
              <h2 className="break-words font-display text-3xl leading-tight">{p.title}</h2>
              <p className="mb-4 break-words text-sm text-muted-foreground">Añadido por <span className="font-medium text-foreground">{p.author}</span></p>
              {p.body && <pre className="mb-4 max-h-48 flex-1 overflow-auto whitespace-pre-wrap rounded-sm bg-muted p-3 text-sm">{p.body}</pre>}
              {p.body && <Button onClick={() => copy.mutate(p)} disabled={copy.isPending}>
                <CopyIcon /> {p.kind === "skill" ? "Copiar skill" : "Copiar prompt"}
              </Button>}
              {getAttachments(p.attachments).map((file) => <SkillDownload key={file.path} id={p.id} file={file} />)}
              {userId && p.owner_id === userId && <div className="mt-3 flex justify-end gap-2 border-t pt-3"><NewPrompt prompt={p} /><DeletePrompt prompt={p} /></div>}
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

function NewPrompt({ prompt }: { prompt?: Prompt }) {
  const qc = useQueryClient();
  const createFn = useServerFn(createPrompt);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(prompt?.title ?? "");
  const [body, setBody] = useState(prompt?.body ?? "");
  const [module, setModule] = useState<string>(prompt?.module ?? MODULES[0] ?? "Otros");
  const [kind, setKind] = useState<"prompt" | "skill">(prompt?.kind ?? "prompt");
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const existingFiles = getAttachments(prompt?.attachments).filter((file) => !removed.includes(file.path));
  const hasContent = Boolean(body.trim()) || (kind === "skill" && files.length + existingFiles.length > 0);
  const add = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ title: title.trim(), body: body.trim(), module, kind })) data.set(key, value);
      if (prompt) data.set("id", prompt.id);
      data.set("removed", JSON.stringify(removed));
      for (const file of files) data.append("files", file);
      await createFn({ data });
    },
    onSuccess: () => {
      toast.success(prompt ? "Cambios guardados" : "Recurso guardado");
      if (!prompt) { setTitle(""); setBody(""); setKind("prompt"); }
      setFiles([]); setRemoved([]);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: (error) => toast.error(error.message || "No se pudo guardar"),
  });
  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (add.isPending) return;
      if (value && prompt) { setTitle(prompt.title); setBody(prompt.body); setModule(prompt.module); setKind(prompt.kind ?? "prompt"); }
      if (value) { setFiles([]); setRemoved([]); }
      setOpen(value);
    }}>
      <DialogTrigger asChild>
        {prompt ? <Button variant="outline" size="icon" title="Editar recurso" aria-label={`Editar ${prompt.title}`}><Pencil /></Button> : <Button><Plus /> Añadir recurso</Button>}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">{prompt ? "Editar recurso" : "Nuevo recurso"}</DialogTitle>
          <DialogDescription className="sr-only">Título, fase, texto y archivos del recurso</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim() && hasContent) add.mutate();
          }}
        >
          <div className="flex gap-2" role="group" aria-label="Tipo">
            {(["prompt", "skill"] as const).map((k) => <Button key={k} type="button" size="sm" disabled={add.isPending} variant={kind === k ? "default" : "outline"} aria-pressed={kind === k} onClick={() => { setKind(k); if (k === "prompt") { setFiles([]); setRemoved(getAttachments(prompt?.attachments).map((file) => file.path)); } }}>{k === "skill" ? "Skill" : "Prompt"}</Button>)}
          </div>
          <Input aria-label="Título" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (p. ej. Entrevista de discovery)" maxLength={120} disabled={add.isPending} />
          <div className="flex flex-wrap gap-2">
            {MODULES.map((m) => (
              <Button key={m} type="button" size="sm" disabled={add.isPending} variant={module === m ? "default" : "outline"} onClick={() => setModule(m)}>
                {m}
              </Button>
            ))}
          </div>
          <Textarea aria-label="Contenido del recurso" required={kind === "prompt"} disabled={add.isPending} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === "skill" ? "Instrucciones de la skill…" : "Pega aquí tu prompt…"} rows={8} maxLength={8000} />
          {kind === "skill" && <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor={prompt ? `files-${prompt.id}` : "new-files"}><Paperclip className="mr-1 inline size-4" /> Archivos (hasta 5, 10 MB por archivo)</label>
            <Input id={prompt ? `files-${prompt.id}` : "new-files"} aria-label="Archivos de la skill" type="file" multiple accept=".md,.txt,.zip,.json,.yaml,.yml,.pdf,.csv" disabled={add.isPending} onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              try { selected.forEach(validateFile); if (selected.length + files.length + existingFiles.length > 5) throw new Error("Puedes adjuntar hasta 5 archivos."); setFiles([...files, ...selected]); } catch (error) { toast.error(error instanceof Error ? error.message : "Archivo inválido"); }
              e.target.value = "";
            }} />
            {existingFiles.map((file) => <div key={file.path} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 break-all">{file.name}</span><Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${file.name}`} disabled={add.isPending} onClick={() => setRemoved([...removed, file.path])}><X /></Button></div>)}
            {files.map((file, i) => <div key={i} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 break-all">{file.name}</span><Button type="button" variant="ghost" size="icon" aria-label={`Quitar ${file.name}`} disabled={add.isPending} onClick={() => setFiles(files.filter((_, index) => index !== i))}><X /></Button></div>)}
          </div>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={add.isPending} onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={add.isPending || !title.trim() || !hasContent}>{add.isPending ? "Guardando…" : prompt ? "Guardar cambios" : "Guardar"}</Button>
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
      toast.success("Recurso eliminado");
      qc.invalidateQueries({ queryKey: ["bank"] });
    },
    onError: () => toast.error("No se pudo eliminar el recurso"),
  });
  return <Dialog open={open} onOpenChange={(value) => { if (!remove.isPending) setOpen(value); }}>
    <DialogTrigger asChild><Button variant="outline" size="icon" className="text-destructive" title="Eliminar recurso" aria-label={`Eliminar ${prompt.title}`}><Trash2 /></Button></DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="font-display text-3xl font-normal">¿Eliminar este recurso?</DialogTitle>
        <DialogDescription className="break-words">«{prompt.title}» se eliminará del banco junto con sus archivos y reusos. No se puede deshacer.</DialogDescription>
      </DialogHeader>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setOpen(false)} disabled={remove.isPending}>Cancelar</Button>
        <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}><Trash2 />{remove.isPending ? "Eliminando…" : "Eliminar recurso"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}

function SkillDownload({ id, file }: { id: string; file: { path: string; name: string; size: number } }) {
  const downloadFn = useServerFn(downloadSkillFile);
  const download = useMutation({
    mutationFn: async () => {
      const result = await downloadFn({ data: { id, path: file.path } });
      return new URL(result.path, import.meta.env['VITE_SUPABASE_URL']).href;
    },
    onSuccess: (url) => { window.location.assign(url); },
    onError: () => toast.error("No se pudo descargar el archivo"),
  });
  return <Button variant="outline" className="mt-2 h-auto min-h-9 justify-start whitespace-normal text-left" disabled={download.isPending} onClick={() => download.mutate()}><Download className="shrink-0" /><span className="min-w-0 break-all">{file.name}</span><span className="ml-auto shrink-0 text-xs text-muted-foreground">{Math.max(1, Math.round(file.size / 1024))} KB</span></Button>;
}
