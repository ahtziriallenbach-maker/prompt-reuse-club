import { z } from "zod";
import { MODULES } from "./reuse";

export type Attachment = { path: string; name: string; size: number };
export const resourceFields = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(8000),
  module: z.string().refine((value) => MODULES.includes(value)),
  kind: z.enum(["prompt", "skill"]),
});
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export function validateResourceContent(kind: "prompt" | "skill", body: string, files: number) {
  if (!body.trim() && (kind === "prompt" || files === 0)) throw new Error("Añade texto o un archivo para la skill.");
  if (kind === "prompt" && files > 0) throw new Error("Los archivos solo se adjuntan a skills.");
  if (files > 5) throw new Error("Puedes adjuntar hasta 5 archivos.");
}
export function validateFile(file: { name: string; size: number }) {
  if (!file.name || file.name.length > 180 || file.size <= 0 || file.size > MAX_FILE_SIZE) throw new Error("Cada archivo debe tener contenido y ocupar como máximo 10 MB.");
  if (!/\.(md|txt|zip|json|yaml|yml|pdf|csv)$/i.test(file.name)) throw new Error("Usa archivos MD, TXT, ZIP, JSON, YAML, PDF o CSV.");
}
export function getAttachments(value: unknown): Attachment[] {
  return z.array(z.object({ path: z.string(), name: z.string(), size: z.number() })).parse(value ?? []);
}