import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest, setCookie, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { MODULES } from "./reuse";
import { browserOwnerHash, requirePromptOwnership } from "./prompt-ownership";

const promptFields = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(8000),
  module: z.string().refine((value) => MODULES.includes(value)),
});

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
  .inputValidator(promptFields.extend({ author: z.string().trim().min(1).max(60) }))
  .handler(async ({ data }) => {
    const hash = await ownerHash(true);
    if (!hash) throw new Error("No se pudo identificar este navegador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.from("prompts").insert(data).select("id").single();
    if (result.error) throw new Error("No se pudo guardar el prompt.");
    const ownership = await supabaseAdmin.from("prompt_ownership").insert({ prompt_id: result.data.id, owner_hash: hash });
    if (ownership.error) {
      await supabaseAdmin.from("prompts").delete().eq("id", result.data.id);
      throw new Error("No se pudo guardar el prompt.");
    }
    return result.data.id;
  });

export const managePrompt = createServerFn({ method: "POST" })
  .inputValidator(z.discriminatedUnion("action", [
    promptFields.extend({ action: z.literal("edit"), id: z.string().uuid() }),
    z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  ]))
  .handler(async ({ data }) => {
    const hash = await ownerHash(false);
    if (!hash) throw new Error("Este prompt no se puede gestionar desde este navegador.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ownership = await supabaseAdmin.from("prompt_ownership").select("owner_hash").eq("prompt_id", data.id).eq("owner_hash", hash).maybeSingle();
    if (ownership.error) throw new Error("No se pudo comprobar el permiso.");
    requirePromptOwnership(ownership.data?.owner_hash, hash);
    const result = data.action === "delete"
      ? await supabaseAdmin.from("prompts").delete().eq("id", data.id).select("id").single()
      : await supabaseAdmin.from("prompts").update({ title: data.title, body: data.body, module: data.module }).eq("id", data.id).select("id").single();
    if (result.error) throw new Error("No se pudo guardar el cambio.");
    return { id: result.data.id };
  });