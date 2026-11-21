import { describe, expect, it } from "vitest";
import { searchResources, sortResources } from "@/lib/resource-search";
import type { Prompt } from "@/lib/reuse";

const resources: Prompt[] = [
  { id: "prd", title: "Especificación de un producto", body: "Redacta criterios de aceptación para el checkout", author: "Ana", module: "Especificación", created_at: "2026-11-20T12:00:00Z" },
  { id: "skill", title: "Entrevistas", body: "Plan de discovery", author: "José", module: "Discovery", kind: "skill", attachments: [{ path: "private/guion.md", name: "guion-entrevista.md", size: 120 }], created_at: "2026-11-21T12:00:00Z" },
];

describe("resource discovery", () => {
  it("finds product tasks inside the resource body", () => expect(searchResources(resources, "checkout").map((r) => r.id)).toEqual(["prd"]));
  it("ignores accents and case", () => expect(searchResources(resources, "ESPECIFICACION").map((r) => r.id)).toEqual(["prd"]));
  it("searches authors", () => expect(searchResources(resources, "jose").map((r) => r.id)).toEqual(["skill"]));
  it("searches skill file names", () => expect(searchResources(resources, "guion-entrevista").map((r) => r.id)).toEqual(["skill"]));
  it("requires every word, even across fields", () => {
    expect(searchResources(resources, "ana checkout").map((r) => r.id)).toEqual(["prd"]);
    expect(searchResources(resources, "ana entrevistas")).toEqual([]);
  });
  it("retains all resources for an empty search", () => expect(searchResources(resources, "  ")).toEqual(resources));
  it("orders by measured reuse without changing the original collection", () => {
    expect(sortResources(resources, "reused", new Map([["prd", 3], ["skill", 1]])).map((r) => r.id)).toEqual(["prd", "skill"]);
    expect(resources.map((r) => r.id)).toEqual(["prd", "skill"]);
  });
  it("orders newest first and breaks popularity ties by date", () => {
    expect(sortResources(resources, "recent", new Map()).map((r) => r.id)).toEqual(["skill", "prd"]);
    expect(sortResources(resources, "reused", new Map()).map((r) => r.id)).toEqual(["skill", "prd"]);
  });
});