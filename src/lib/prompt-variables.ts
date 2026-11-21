const PATTERN = /\{\{\s*([^{}\n]{1,40}?)\s*\}\}|\[([^\[\]\n]{1,40})\]/g;

/** Unique placeholder names written as {{nombre}} or [nombre], in order of appearance. */
export function extractVariables(text: string): string[] {
  const found: string[] = [];
  for (const m of text.matchAll(PATTERN)) {
    const name = (m[1] ?? m[2] ?? "").trim();
    if (name && !found.includes(name)) found.push(name);
  }
  return found;
}

/** Replace placeholders with filled values; empty values keep the original placeholder. */
export function fillVariables(text: string, values: Record<string, string>): string {
  return text.replace(PATTERN, (whole, a?: string, b?: string) => {
    const v = values[(a ?? b ?? "").trim()]?.trim();
    return v ? v : whole;
  });
}
