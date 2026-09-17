import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEventListener } from "expo";
import { useVideoPlayer, type VideoSource } from "expo-video";

import { useReducedMotion } from "react-native-reanimated";
import { isLocal, resolveAssetUri } from "@/services/assets";
import { coverScreen, revealScreen } from "../utils/chunkTransition";

/** Clip is ~10s; this is a backstop in case playback stalls or never fires `playToEnd`. */
const SAFETY_TIMEOUT_MS = 12_000;
/**
 * How long the covered overlay sits solid before revealing, giving the login
 * route a beat to mount underneath.
 *
 * This is deliberately just over `MobConvergenceOverlay`'s `CONVERGE_MS` (850).
 * It used to be 260ms — a value tuned for the 380ms `ChunkTransitionOverlay`
 * that overlay replaced — so the reveal fired while the mobs were still sliding
 * in, and the swap to login happened in full view.
 */
const REVEAL_BUFFER_MS = 900;

export function useVideoSplash(onDone: () => void) {
  const reducedMotion = useReducedMotion();
  const [muted, setMuted] = useState(true);
  /** Set once the cover is opaque, to unmount the VideoView before navigating. */
  const [finished, setFinished] = useState(false);
  const done = useRef(false);

  /**
   * The clip now ships over the CDN rather than in the binary, so it has three
   * possible states and the intro has to degrade cleanly through all of them:
   *
   *  - downloaded -> play the local file, instantly and offline.
   *  - known but not downloaded (skipped, or mid-download) -> stream from the
   *    CDN with `useCaching` so expo-video populates its own cache on the way.
   *  - unknown (first launch, offline, no manifest yet) -> `null`, and we skip
   *    the intro entirely rather than hanging on a video that cannot load.
   */
  const source = useMemo<VideoSource | null>(() => {
    const uri = resolveAssetUri("video/splash");
    if (!uri) return null;
    return isLocal("video/splash") ? uri : { uri, useCaching: true };
  }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;

    // Cover the screen with the mob convergence, swap to login underneath, then
    // reveal.
    coverScreen(() => {
      // Tear the VideoView down *before* navigating. `useVideoPlayer` releases
      // its player when this screen unmounts, and the Stack's "fade" animation
      // keeps the outgoing screen mounted through the transition — so Fabric
      // could still (pre)allocate a SurfaceVideoView against a player that was
      // already released, which threw:
      //   PropSetException: Cannot set prop 'player' ...
      //   Caused by: Cannot use shared object that was already released
      // Dropping it here is invisible: the overlay is fully opaque at this
      // point, which is exactly why this runs in the covered callback rather
      // than the moment playback ends.
      setFinished(true);
      onDone();
      setTimeout(revealScreen, REVEAL_BUFFER_MS);
    });
  }, [onDone]);

  const player = useVideoPlayer(source, (p) => {
    p.muted = true;
    p.play();
  });

  useEventListener(player, "playToEnd", finish);
  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error" || error) finish();
  });

  useEffect(() => {
    // No clip available, or the user prefers reduced motion: go straight to
    // login instead of sitting on a black screen for the safety timeout.
    if (reducedMotion || !source) {
      finish();
      return;
    }
    const id = setTimeout(finish, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [reducedMotion, source, finish]);

  const toggleMute = useCallback(() => {
    // expo-video's player is a mutable native object by design — `.muted =`
    // is the documented way to drive it, same exception as Reanimated shared
    // values (see PixelButton/GateTransition for the same pattern).
    // eslint-disable-next-line react-hooks/immutability
    player.muted = !player.muted;
    setMuted(player.muted);
  }, [player]);

  return {
    player,
    muted,
    toggleMute,
    skip: finish,
    hidden: reducedMotion || !source || finished,
  };
}
