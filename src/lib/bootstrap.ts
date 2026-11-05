// Runs the idempotent GAMINOS seed (used on first owner signup so the zone is never empty).

export async function ensureSeedData(): Promise<void> {
  const { runSeed } = await import("../../prisma/seed-core");
  await runSeed();
}
