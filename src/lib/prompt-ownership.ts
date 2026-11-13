/** Only the account that created a resource may edit or delete it; legacy resources have no owner. */
export function requirePromptOwnership(ownerId: string | null | undefined, userId: string) {
  if (!ownerId || ownerId !== userId) throw new Error("Solo quien creó este recurso puede gestionarlo.");
}
