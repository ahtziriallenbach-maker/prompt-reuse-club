export async function browserOwnerHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function requirePromptOwnership(storedHash: string | undefined, browserHash: string) {
  if (!storedHash || storedHash !== browserHash) {
    throw new Error("Este prompt no se puede gestionar desde este navegador.");
  }
}

export function isPromptAuthor(author: string, name: string) {
  return Boolean(name.trim()) && author.trim().toLowerCase() === name.trim().toLowerCase();
}