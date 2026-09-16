/**
 * Small motion helpers shared across modules. These outlived the login
 * parallax scene they were written for (`login/components/scene/useAmbient`),
 * which the frosted-glass login redesign replaced — the splash module still
 * depends on them, so they live here now.
 */

/** Deterministic 0..1 pseudo-random, so particle layouts are stable across renders. */
export function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
