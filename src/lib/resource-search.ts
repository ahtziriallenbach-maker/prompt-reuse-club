import { getAttachments } from "./resources";
import type { Prompt } from "./reuse";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Match every search word across the resource's searchable fields, ignoring accents. */
export function searchResources(resources: Prompt[], query: string): Prompt[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return resources;
  return resources.filter((resource) => {
    const text = normalize([
      resource.title, resource.body, resource.author, resource.module,
      ...getAttachments(resource.attachments).map((file) => file.name),
    ].join(" "));
    return words.every((word) => text.includes(word));
  });
}

export function sortResources(resources: Prompt[], order: "recent" | "reused", reuses: Map<string, number>): Prompt[] {
  return [...resources].sort((a, b) => {
    const popularity = order === "reused" ? (reuses.get(b.id) ?? 0) - (reuses.get(a.id) ?? 0) : 0;
    return popularity || b.created_at.localeCompare(a.created_at);
  });
}