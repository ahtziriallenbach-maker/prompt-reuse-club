import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { browserOwnerHash, requirePromptOwnership } from "./prompt-ownership";
import { resourceFields, getAttachments, validateFile, validateResourceContent } from "./resources";

async function ownerHash(create: boolean) {
  setResponseHeader("Cache-Control", "no-store");
  let token = getCookie("pb-owner");
  if (!token || !/^[a-f0-9-]{72}$/.test(token)) {
    if (!create) return null;
    token = crypto.randomUUID() + crypto.randomUUID();
    const secure = new URL(getRequest().url).protocol === "https:";
    setCookie("pb-owner", token, {
      httpOnly: true, secure,
      sameSite: secure ? "none" : "lax", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
  }
  return browserOwnerHash(token);
}

export const getOwnedPromptIds = createServerFn({ method: "POST" }).handler(async () => {
  const hash = await ownerHash(false);
  if (!hash) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("prompt_ownership").select("prompt_id").eq("owner_hash", hash);
  if (error) throw new Error("No se pudieron cargar tus permisos.");
  return data.map((row) => row.prompt_id);
});

export const createPrompt = createServerFn({ method: "POST" })
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error("Formulario inválido.");
    return input;
  })
  .handler(async ({ data }) => {
    const fields = resourceFields.extend({ author: z.string().trim().min(1).max(60) }).parse(Object.fromEntries(data));
    const id = z.string().uuid().optional().parse(data.get("id") || undefined);
    const removed = z.array(z.string()).parse(JSON.parse(String(data.get("removed") || "[]")));
    const files = data.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    files.forEach(validateFile);
    const hash = await ownerHash(true);
    if (!hash) throw new Error("No se pudo identificar este navegador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let previous = getAttachments([]);
    if (id) {
      const ownership = await supabaseAdmin.from("prompt_ownership").select("owner_hash").eq("prompt_id", id).eq("owner_hash", hash).maybeSingle();
      if (ownership.error) throw new Error("No se pudo comprobar el permiso.");
      requirePromptOwnership(ownership.data?.owner_hash, hash);
      const existing = await supabaseAdmin.from("prompts").select("attachments").eq("id", id).single();
      if (existing.error) throw new Error("No se encontró el recurso.");
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
      const payload = { ...fields, attachments: [...kept, ...uploaded] };
      const result = id
        ? await supabaseAdmin.from("prompts").update({ title: fields.title, body: fields.body, module: fields.module, kind: fields.kind, attachments: payload.attachments }).eq("id", id)
        : await supabaseAdmin.from("prompts").insert({ ...payload, id: resourceId });
      if (result.error) throw new Error("No se pudo guardar el recurso.");
      if (!id) {
        const ownership = await supabaseAdmin.from("prompt_ownership").insert({ prompt_id: resourceId, owner_hash: hash });
        if (ownership.error) {
          await supabaseAdmin.from("prompts").delete().eq("id", resourceId);
          throw new Error("No se pudo guardar el recurso.");
        }
      }
    } catch (error) {
      if (uploaded.length) await supabaseAdmin.storage.from("skill-files").remove(uploaded.map((file) => file.path));
      throw error;
    }
    const obsolete = previous.filter((file) => removed.includes(file.path));
    if (obsolete.length) await supabaseAdmin.storage.from("skill-files").remove(obsolete.map((file) => file.path));
    return resourceId;
  });

export const managePrompt = createServerFn({ method: "POST" })
  .inputValidator(z.discriminatedUnion("action", [
    resourceFields.extend({ action: z.literal("edit"), id: z.string().uuid() }),
    z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  ]))
  .handler(async ({ data }) => {
    const hash = await ownerHash(false);
    if (!hash) throw new Error("Este prompt no se puede gestionar desde este navegador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ownership = await supabaseAdmin.from("prompt_ownership").select("owner_hash").eq("prompt_id", data.id).eq("owner_hash", hash).maybeSingle();
    if (ownership.error) throw new Error("No se pudo comprobar el permiso.");
    requirePromptOwnership(ownership.data?.owner_hash, hash);
    const existing = await supabaseAdmin.from("prompts").select("attachments").eq("id", data.id).single();
    if (existing.error) throw new Error("No se encontró el recurso.");
    if (data.action === "edit") validateResourceContent(data.kind, data.body, getAttachments(existing.data.attachments).length);
    const result = data.action === "delete"
      ? await supabaseAdmin.from("prompts").delete().eq("id", data.id).select("id").single()
      : await supabaseAdmin.from("prompts").update({ title: data.title, body: data.body, module: data.module, kind: data.kind }).eq("id", data.id).select("id").single();
    if (result.error) throw new Error("No se pudo guardar el cambio.");
    if (data.action === "delete") {
      const files = getAttachments(existing.data.attachments);
      if (files.length) await supabaseAdmin.storage.from("skill-files").remove(files.map((file) => file.path));
    }
    return { id: result.data.id };
  });

export const downloadSkillFile = createServerFn({ method: "POST" })
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