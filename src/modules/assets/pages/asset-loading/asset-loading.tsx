import { useEffect, useMemo, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { useNetwork } from "@/modules/core/NetworkProvider";
import { useAssets } from "../../stores/AssetsContext";
import { CHUNKS, styles } from "./asset-loading.styles";

/**
 * First screen of the app: fetches the CDN asset bundle, then hands off to the
 * video splash.
 *
 * Two things govern the design.
 *
 * **It must render before any downloadable asset exists.** So it is built only
 * from bundled fonts, theme tokens and plain views — no artwork, no remote
 * image, nothing that could itself be missing on the very launch this screen
 * exists to service.
 *
 * **It must never trap anyone.** A participant on bad fest Wi-Fi can SKIP at any
 * time and use the whole app; anything not downloaded simply resolves to its CDN
 * URL and streams on first view. The download is an optimisation, not a gate.
 */
export function AssetLoadingScreen({ onDone }: { onDone: () => void }) {
  const { status, progress, isSettled, skip } = useAssets();
  const { isOnline } = useNetwork();

  // The handoff must happen exactly once. `isSettled` can briefly re-assert (a
  // background top-up finishing, a retry resolving) and navigating twice would
  // push a second splash route onto the stack.
  const handedOff = useRef(false);
  useEffect(() => {
    if (!isSettled || handedOff.current) return;
    handedOff.current = true;
    onDone();
  }, [isSettled, onDone]);

  const filled = useMemo(
    () => Math.round(Math.min(Math.max(progress.fraction, 0), 1) * CHUNKS),
    [progress.fraction],
  );

  // On a warm launch `status` resolves to "ready" within a frame or two. Painting
  // a progress bar for 30ms and tearing it away reads as a flash, so render
  // nothing at all until we know there is real work to show.
  if (status === "checking") return null;

  return (
    <View style={styles.root}>
      <Text style={styles.wordmark}>GATEWAYS</Text>
      <Text style={styles.year}>2026</Text>

      <Text style={styles.headline}>GENERATING WORLD</Text>
      <Text style={styles.subline}>Downloading fest artwork. This happens once.</Text>

      <View style={styles.barFrame}>
        {Array.from({ length: CHUNKS }, (_, i) => (
          <View
            key={i}
            style={[
              styles.chunk,
              i < filled ? styles.chunkFilled : styles.chunkEmpty,
            ]}
          />
        ))}
      </View>

      <View style={styles.readout}>
        <Text style={styles.percent}>{Math.round(progress.fraction * 100)}%</Text>
        <Text style={styles.bytes}>
          {formatMb(progress.bytesDone)} / {formatMb(progress.bytesTotal)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={skip}
          accessibilityRole="button"
          accessibilityLabel="Skip the download"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>SKIP</Text>
        </Pressable>
      </View>

      {!isOnline && (
        <Text style={[styles.note, styles.noteWarn]}>
          You appear to be offline. Skip to continue — the app works without this,
          and artwork will fill in once you reconnect.
        </Text>
      )}
    </View>
  );
}

function formatMb(bytes: number): string {
  if (!bytes) return "0.0 MB";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
