import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePromptOwnership } from "./prompt-ownership";
import { resourceFields, getAttachments, validateFile, validateResourceContent } from "./resources";

async function authorName(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
  return (data?.display_name as string | undefined) ?? "Sin nombre";
}

export const createPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("Formulario inválido.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const fields = resourceFields.parse(Object.fromEntries(data));
    const id = z.string().uuid().optional().parse(data.get("id") || undefined);
    const removed = z.array(z.string()).parse(JSON.parse(String(data.get("removed") || "[]")));
    const files = data.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    files.forEach(validateFile);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let previous = getAttachments([]);
    if (id) {
      const existing = await supabaseAdmin.from("prompts").select("attachments, owner_id").eq("id", id).single();
      if (existing.error) throw new Error("No se encontró el recurso.");
      requirePromptOwnership(existing.data.owner_id, context.userId);
      previous = getAttachments(existing.data.attachments);
    }
    const kept = previous.filter((file) => !removed.includes(file.path));
    validateResourceContent(fields.kind, fields.body, kept.length + files.length);
    const resourceId = id ?? crypto.randomUUID();
    const uploaded = getAttachments([]);
    try {
      for (const file of files) {
        const path = `${resourceId}/${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase()}`;
        const upload = await supabaseAdmin.storage.from("skill-files").upload(path, file, { contentType: "application/octet-stream" });
        if (upload.error) throw new Error("No se pudo subir el archivo.");
        uploaded.push({ path, name: file.name, size: file.size });
      }
      const attachments = [...kept, ...uploaded];
      const result = id
        ? await supabaseAdmin.from("prompts").update({ ...fields, attachments }).eq("id", id)
        : await supabaseAdmin.from("prompts").insert({ ...fields, attachments, id: resourceId, owner_id: context.userId, author: await authorName(context.supabase, context.userId) });
      if (result.error) throw new Error("No se pudo guardar el recurso.");
    } catch (error) {
      if (uploaded.length) await supabaseAdmin.storage.from("skill-files").remove(uploaded.map((file) => file.path));
      throw error;
    }
    const obsolete = previous.filter((file) => removed.includes(file.path));
    if (obsolete.length) await supabaseAdmin.storage.from("skill-files").remove(obsolete.map((file) => file.path));
    return resourceId;
  });

export const managePrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ action: z.literal("delete"), id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin.from("prompts").select("attachments, owner_id").eq("id", data.id).single();
    if (existing.error) throw new Error("No se encontró el recurso.");
    requirePromptOwnership(existing.data.owner_id, context.userId);
    const result = await supabaseAdmin.from("prompts").delete().eq("id", data.id);
    if (result.error) throw new Error("No se pudo eliminar.");
    const files = getAttachments(existing.data.attachments);
    if (files.length) await supabaseAdmin.storage.from("skill-files").remove(files.map((file) => file.path));
    return { id: data.id };
  });

export const downloadSkillFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), path: z.string().max(300) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const resource = await supabaseAdmin.from("prompts").select("attachments, kind").eq("id", data.id).single();
    if (resource.error || resource.data.kind !== "skill") throw new Error("No se encontró la skill.");
    const file = getAttachments(resource.data.attachments).find((file) => file.path === data.path);
    if (!file) throw new Error("No se encontró el archivo.");
    const signed = await supabaseAdmin.storage.from("skill-files").createSignedUrl(file.path, 60, { download: file.name });
    if (signed.error) throw new Error("No se pudo descargar el archivo.");
    const url = new URL(signed.data.signedUrl);
    return { path: url.pathname + url.search };
  });
