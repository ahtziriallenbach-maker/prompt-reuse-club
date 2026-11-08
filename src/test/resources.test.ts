import { describe, expect, it } from "vitest";
import { validateResourceContent, validateFile } from "@/lib/resources";

describe("skills with text and files", () => {
  it("accepts a skill with text only", () => expect(() => validateResourceContent("skill", "Instructions", 0)).not.toThrow());
  it("accepts a skill with files only", () => expect(() => validateResourceContent("skill", "", 1)).not.toThrow());
  it("accepts a skill with text and files", () => expect(() => validateResourceContent("skill", "Instructions", 1)).not.toThrow());
  it("rejects an empty skill", () => expect(() => validateResourceContent("skill", "", 0)).toThrow());
  it("still requires prompt text", () => expect(() => validateResourceContent("prompt", "", 0)).toThrow());
  it("rejects executable files", () => expect(() => validateFile({ name: "run.exe", size: 10 })).toThrow());
  it("rejects oversized files", () => expect(() => validateFile({ name: "skill.zip", size: 10 * 1024 * 1024 + 1 })).toThrow());
});