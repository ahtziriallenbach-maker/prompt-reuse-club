import { describe, expect, it } from "vitest";
import { requirePromptOwnership } from "@/lib/prompt-ownership";

describe("account-based resource management", () => {
  it("allows the creating account", () => {
    expect(() => requirePromptOwnership("user-a", "user-a")).not.toThrow();
  });
  it("rejects another account", () => {
    expect(() => requirePromptOwnership("user-a", "user-b")).toThrow();
  });
  it("does not let anyone claim legacy resources without an owner", () => {
    expect(() => requirePromptOwnership(null, "user-a")).toThrow();
  });
});
