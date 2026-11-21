import { describe, expect, it } from "vitest";
import { extractVariables, fillVariables } from "@/lib/prompt-variables";

describe("prompt variables", () => {
  it("extracts unique placeholders in both formats", () => {
    expect(extractVariables("Para [producto] y {{ usuario }}, otra vez [producto]")).toEqual(["producto", "usuario"]);
  });
  it("fills values and keeps empty ones", () => {
    expect(fillVariables("[producto] para {{usuario}}", { producto: "Spotify", usuario: " " })).toBe("Spotify para {{usuario}}");
  });
});
