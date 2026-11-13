export type Prompt = { id: string; author: string; title: string; body: string; module: string; created_at: string; kind?: "prompt" | "skill"; attachments?: unknown; owner_id?: string | null };
export type Copy = { prompt_id: string; copier: string; copier_id?: string | null };

export const MODULES = ["M1 · Fundamentos de IA", "M2 · Productividad", "M3 · Tech PM", "M4 · Product Maker", "M5 · Demo Day + Cierre", "Otros"];

const norm = (s: string) => s.trim().toLowerCase();

/** Una copia solo cuenta como reuso si quien copia no es el autor (por cuenta si ambos la tienen; si no, por nombre). */
export function reuseStats(prompts: Prompt[], copies: Copy[]) {
  const byId = new Map(prompts.map((p) => [p.id, p]));
  const perPrompt = new Map<string, number>();
  const reusers = new Set<string>();
  let reuses = 0;
  for (const c of copies) {
    const p = byId.get(c.prompt_id);
    if (!p) continue;
    const own = p.owner_id && c.copier_id ? p.owner_id === c.copier_id : norm(p.author) === norm(c.copier);
    if (own) continue;
    reuses++;
    reusers.add(c.copier_id ?? norm(c.copier));
    perPrompt.set(p.id, (perPrompt.get(p.id) ?? 0) + 1);
  }
  const reusedPrompts = perPrompt.size;
  return { reuses, reusers: reusers.size, reusedPrompts, perPrompt };
}
