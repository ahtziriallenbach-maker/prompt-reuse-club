import { describe, expect, it } from "vitest";
import { browserOwnerHash, isPromptAuthor, requirePromptOwnership } from "@/lib/prompt-ownership";

describe("browser-only prompt management", () => {
  it("allows editing or deletion with the creating browser's capability", async () => {
    const hash = await browserOwnerHash("creating-browser-secret");
    expect(() => requirePromptOwnership(hash, hash)).not.toThrow();
  });
  it("rejects another browser even when it uses the same author name", async () => {
    const original = await browserOwnerHash("creating-browser-secret");
    const other = await browserOwnerHash("different-browser-secret");
    expect(() => requirePromptOwnership(original, other)).toThrow();
  });
  it("does not let a browser claim legacy prompts without ownership", () => {
    expect(() => requirePromptOwnership(undefined, "some-hash")).toThrow();
  });
  it("shows only prompts matching the entered author name", () => {
    expect(isPromptAuthor("Ahtziri Allenbach", " ahtziri allenbach ")).toBe(true);
    expect(isPromptAuthor("Otra persona", "Ahtziri Allenbach")).toBe(false);
    expect(isPromptAuthor("", " ")).toBe(false);
  });
});