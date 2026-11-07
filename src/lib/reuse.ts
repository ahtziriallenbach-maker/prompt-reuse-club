export type Prompt = { id: string; author: string; title: string; body: string; module: string; created_at: string };
export type Copy = { prompt_id: string; copier: string };

export const MODULES = ["Discovery", "Research", "Estrategia", "Priorización", "Métricas", "Delivery", "Otros"];

const norm = (s: string) => s.trim().toLowerCase();

/** Una copia solo cuenta como reuso si quien copia no es el autor. */
export function reuseStats(prompts: Prompt[], copies: Copy[]) {
  const byId = new Map(prompts.map((p) => [p.id, p]));
  const perPrompt = new Map<string, number>();
  const reusers = new Set<string>();
  let reuses = 0;
  for (const c of copies) {
    const p = byId.get(c.prompt_id);
    if (!p || norm(p.author) === norm(c.copier)) continue;
    reuses++;
    reusers.add(norm(c.copier));
    perPrompt.set(p.id, (perPrompt.get(p.id) ?? 0) + 1);
  }
  const reusedPrompts = perPrompt.size;
  return { reuses, reusers: reusers.size, reusedPrompts, perPrompt };
}
