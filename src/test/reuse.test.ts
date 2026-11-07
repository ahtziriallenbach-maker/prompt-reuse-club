import { describe, it, expect } from "vitest";
import { reuseStats } from "@/lib/reuse";

const p = (id: string, author: string) => ({ id, author, title: "t", body: "b", module: "Otros", created_at: "" });

describe("reuseStats", () => {
  it("no cuenta cuando el autor copia su propio prompt", () => {
    expect(reuseStats([p("1", "Ana")], [{ prompt_id: "1", copier: " ana " }]).reuses).toBe(0);
  });
  it("cuenta copias de otros y personas distintas", () => {
    const s = reuseStats([p("1", "Ana"), p("2", "Luis")], [
      { prompt_id: "1", copier: "Luis" },
      { prompt_id: "1", copier: "Luis" },
      { prompt_id: "2", copier: "Ana" },
    ]);
    expect(s.reuses).toBe(3);
    expect(s.reusers).toBe(2);
    expect(s.reusedPrompts).toBe(2);
  });
});
