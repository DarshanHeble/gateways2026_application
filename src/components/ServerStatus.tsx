import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Tooltip } from "@/components/mc/Tooltip";
import { PixelIcon } from "@/components/mc/PixelIcon";
import { useAppData } from "@/modules/core/DataProvider";
import { useNetwork } from "@/modules/core/NetworkProvider";
import { formatAge } from "@/services/offline/cache";
import { mcTextShadow } from "@/theme/minecraft";
import { px } from "@/theme/scale";
import { fonts } from "@/theme/tokens";

/**
 * The app's connection status, as a Minecraft server-list entry.
 *
 * Replaces three separate surfaces that said overlapping things: an orange dot
 * in the corner, a transient "SERVER UNREACHABLE" pill, and a "NO SERVER" strip
 * repeated on three screens. Now there is one — a floating chip in the corner,
 * drawn as the game's item tooltip, carrying the multiplayer screen's **ping
 * bars**: five green bars when connected, grey bars cycling while it pings, and
 * the bars struck through when it cannot connect. Every player reads those at a
 * glance.
 *
 * Tap it and it opens into the server-list entry itself — name, status line in
 * vanilla's own wording ("Can't connect to server", "Pinging…"), what data you
 * are looking at and how old it is — with a Retry.
 *
 * The pixel face and its drop shadow are used here deliberately: this is the
 * one element in the app that is an in-game overlay, and a tooltip set in a
 * sans reads as a web popover.
 */

type Status = "live" | "pinging" | "unreachable" | "offline";

const COLOR = {
  green: "#55ff55",
  red: "#ff5555",
  gold: "#ffaa00",
  yellow: "#ffff55",
  gray: "#aaaaaa",
  white: "#ffffff",
} as const;

export function ServerStatus() {
  const insets = useSafeAreaInsets();
  const { isOnline, isBackendReachable, checkNow } = useNetwork();
  const { syncState, eventsSource, eventsSavedAt, pendingWrites, refreshData } = useAppData();
  const [open, setOpen] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const status: Status = !isOnline
    ? "offline"
    : isBackendReachable === false
      ? "unreachable"
      : isBackendReachable === null || syncState === "syncing" || retrying
        ? "pinging"
        : "live";

  /*
   * "Synced" is an event, not a state: say it for a moment when it happens.
   * Detected during render by comparing with the previous value — React's
   * documented pattern for reacting to a change — rather than by setting state
   * inside an effect, which would render twice for every sync.
   */
  const [prevSync, setPrevSync] = useState(syncState);
  const [justSynced, setJustSynced] = useState(false);
  if (syncState !== prevSync) {
    setPrevSync(syncState);
    setJustSynced(syncState === "synced");
  }
  useEffect(() => {
    if (!justSynced) return;
    const t = setTimeout(() => setJustSynced(false), 2200);
    return () => clearTimeout(t);
  }, [justSynced]);

  /*
   * No auto-close. It closed itself after seven seconds at first, which is
   * exactly long enough to take it away mid-sentence from anyone reading
   * slowly. It stays until you tap the chip again or anywhere else.
   */

  const chipLabel =
    status === "offline"
      ? { text: "OFFLINE", color: COLOR.red }
      : status === "unreachable"
        ? { text: "NO SERVER", color: COLOR.gold }
        : status === "pinging" && syncState === "syncing"
          ? { text: "SYNCING", color: COLOR.gray }
          : justSynced
            ? { text: "SYNCED", color: COLOR.green }
            : null;

  const statusLine =
    status === "offline"
      ? { text: "No internet connection", color: COLOR.red }
      : status === "unreachable"
        ? { text: "Can't connect to server", color: COLOR.red }
        : status === "pinging"
          ? { text: "Pinging...", color: COLOR.gray }
          : { text: "Connected", color: COLOR.green };

  const dataLine =
    eventsSource === "network"
      ? "Programme is up to date"
      : eventsSource === "seed"
        ? `Bundled programme · ${formatAge(eventsSavedAt)}`
        : `Saved programme · ${formatAge(eventsSavedAt)}`;

  const retry = async () => {
    Haptics.selectionAsync().catch(() => {});
    setRetrying(true);
    try {
      if (await checkNow()) await refreshData();
    } finally {
      setRetrying(false);
    }
  };

  const top = insets.top + px(12);

  return (
    <>
      {open ? (
        // Tap anywhere else to close — standard popover behaviour.
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
      ) : null}

      <View style={[styles.anchor, { top }]} pointerEvents="box-none">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setOpen((o) => !o);
          }}
          hitSlop={px(8)}
          accessibilityRole="button"
          accessibilityLabel={`Server status: ${statusLine.text}`}
        >
          <Tooltip padding={px(5)}>
            <View style={styles.chipRow}>
              <PingBars status={status} />
              {chipLabel ? (
                <Text style={[styles.chipText, { color: chipLabel.color }, mcTextShadow(chipLabel.color, 11)]}>
                  {chipLabel.text}
                </Text>
              ) : null}
            </View>
          </Tooltip>
        </Pressable>

        {open ? (
          <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.panelWrap}>
            <Tooltip padding={px(6)} style={styles.panel}>
              <View style={styles.entry}>
                {/* The server icon: the default world's grass block. */}
                <View style={styles.serverIcon}>
                  <PixelIcon name="home" size={px(20)} />
                </View>
                <View style={styles.entryText}>
                  {/* Retry sits on the title row, where the server list puts
                      the ping: it keeps the card a row shorter and leaves the
                      status line its full width. */}
                  <View style={styles.titleRow}>
                    <Text style={[styles.name, mcTextShadow(COLOR.white, 12)]} numberOfLines={1}>
                      Gateways 2026
                    </Text>
                    {status !== "live" && !retrying ? (
                      <Pressable
                        onPress={retry}
                        hitSlop={px(8)}
                        style={({ pressed }) => pressed && { opacity: 0.6 }}
                        accessibilityRole="button"
                        accessibilityLabel="Retry connecting"
                      >
                        <Text style={[styles.retryText, mcTextShadow(COLOR.yellow, 10)]}>Retry</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <Text
                    style={[styles.line, { color: statusLine.color }, mcTextShadow(statusLine.color, 10)]}
                    numberOfLines={1}
                  >
                    {retrying ? "Pinging..." : statusLine.text}
                  </Text>
                  <Text style={[styles.line, { color: COLOR.gray }, mcTextShadow(COLOR.gray, 10)]} numberOfLines={1}>
                    {dataLine}
                  </Text>
                  {pendingWrites > 0 ? (
                    <Text style={[styles.line, { color: COLOR.yellow }, mcTextShadow(COLOR.yellow, 10)]}>
                      {pendingWrites} {pendingWrites === 1 ? "change" : "changes"} waiting to sync
                    </Text>
                  ) : null}
                </View>
              </View>
            </Tooltip>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
}

/**
 * The server list's ping indicator: five bars, rising.
 *
 * Live: all five lit green. Pinging: grey bars filling in one at a time, the
 * way the game animates an unanswered ping. Unreachable or offline: every bar
 * dark, struck through in red.
 */
function PingBars({ status }: { status: Status }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (status !== "pinging") return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 6), 160);
    return () => clearInterval(id);
  }, [status]);

  const lit = status === "live" ? 5 : status === "pinging" ? frame : 0;
  const litColor = status === "live" ? COLOR.green : COLOR.gray;
  const dead = status === "unreachable" || status === "offline";

  return (
    <View style={styles.bars}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.bar,
            { height: px(3 + i * 2), backgroundColor: i < lit ? litColor : "#3b3b3b" },
          ]}
        />
      ))}
      {dead ? (
        // The strike: a single red pixel line across the bars.
        <View style={styles.strike} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    right: px(14),
    alignItems: "flex-end",
    zIndex: 9999,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(7),
    minHeight: px(14),
  },
  chipText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
  },

  panelWrap: { marginTop: px(5) },
  panel: { width: px(222) },
  entry: { flexDirection: "row", gap: px(8) },
  serverIcon: {
    width: px(26),
    height: px(26),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  entryText: { flex: 1, minWidth: 0 },
  name: {
    flexShrink: 1,
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    color: COLOR.white,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: px(8),
  },
  line: {
    fontFamily: fonts.pixel,
    fontSize: px(10),
    marginTop: px(3),
  },
  retryText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: COLOR.yellow,
  },

  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: px(1.5),
    height: px(11),
  },
  bar: { width: px(2.5) },
  strike: {
    position: "absolute",
    left: -px(1),
    right: -px(1),
    top: px(5),
    height: px(1.5),
    backgroundColor: COLOR.red,
    transform: [{ rotate: "-28deg" }],
  },
});
