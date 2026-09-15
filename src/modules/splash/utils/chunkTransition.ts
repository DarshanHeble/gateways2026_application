/**
 * Imperative bridge to the root-mounted `ChunkTransitionOverlay`.
 *
 * The overlay has to live above the `<Stack />` in `_layout.tsx` so it
 * survives the route swap from `/` to `/login` — anything mounted inside the
 * splash screen itself would unmount the instant `router.replace` fires,
 * which is exactly the gap we're covering. A plain module-level handler pair
 * is simplest here: there's only ever one overlay instance and one caller.
 */

type CoverHandler = (onCovered: () => void) => void;
type RevealHandler = () => void;

let coverHandler: CoverHandler | null = null;
let revealHandler: RevealHandler | null = null;

export function registerChunkTransitionHandlers(handlers: {
  cover: CoverHandler;
  reveal: RevealHandler;
}) {
  coverHandler = handlers.cover;
  revealHandler = handlers.reveal;
  return () => {
    coverHandler = null;
    revealHandler = null;
  };
}

/** Ramps the overlay to fully solid, then calls `onCovered`. */
export function coverScreen(onCovered: () => void) {
  if (coverHandler) coverHandler(onCovered);
  else onCovered();
}

/** Ramps the overlay back to hidden. */
export function revealScreen() {
  revealHandler?.();
}
