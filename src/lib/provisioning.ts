// Dependency injection makes failure recovery testable without mocking the authorization rules.
export async function provision<T>(steps: {
  create: () => Promise<string>;
  commit: (id: string) => Promise<T>;
  remove: (id: string) => Promise<void>;
  record: (id: string) => Promise<void>;
}) {
  const id = await steps.create();
  try {
    return await steps.commit(id);
  } catch (error) {
    try {
      await steps.remove(id);
    } catch {
      await steps.record(id);
      throw new Error("Provisioning failed; administrator recovery required");
    }
    throw error;
  }
}
