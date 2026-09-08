import { useCallback, useEffect, useRef, useState } from "react";
import { useEventListener } from "expo";
import { useVideoPlayer } from "expo-video";

import { useReducedMotion } from "@/features/login/scene/useAmbient";
import { coverScreen, revealScreen } from "./chunkTransition";

const SOURCE = require("../../../assets/videos/minecraft-splash.mp4");
/** Clip is ~10s; this is a backstop in case playback stalls or never fires `playToEnd`. */
const SAFETY_TIMEOUT_MS = 12_000;
/** Time the covered overlay sits fully solid, giving the login route a beat to mount underneath. */
const REVEAL_BUFFER_MS = 260;

export function useVideoSplash(onDone: () => void) {
  const reducedMotion = useReducedMotion();
  const [muted, setMuted] = useState(true);
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;

    // Trigger mob convergence overlay right after the splash loader ends,
    // covering the screen while swapping to login, then blasting out to reveal login
    coverScreen(() => {
      onDone();
      setTimeout(revealScreen, REVEAL_BUFFER_MS);
    });
  }, [onDone, reducedMotion]);

  const player = useVideoPlayer(SOURCE, (p) => {
    p.muted = true;
    p.play();
  });

  useEventListener(player, "playToEnd", finish);
  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error" || error) finish();
  });

  useEffect(() => {
    if (reducedMotion) {
      finish();
      return;
    }
    const id = setTimeout(finish, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [reducedMotion, finish]);

  const toggleMute = useCallback(() => {
    // expo-video's player is a mutable native object by design — `.muted =`
    // is the documented way to drive it, same exception as Reanimated shared
    // values (see PixelButton/GateTransition for the same pattern).
    // eslint-disable-next-line react-hooks/immutability
    player.muted = !player.muted;
    setMuted(player.muted);
  }, [player]);

  return { player, muted, toggleMute, skip: finish, hidden: reducedMotion };
}
