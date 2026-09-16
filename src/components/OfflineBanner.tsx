import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { px } from "@/theme/scale";
import { fonts } from "@/theme/tokens";
import { formatAge } from "@/services/offline/cache";
import type { DataSource } from "@/services/api";
import { useNetwork } from "@/modules/core/NetworkProvider";
import { useAppData } from "@/modules/core/DataProvider";

/**
 * One banner for every "what you're looking at isn't live" state, replacing the
 * two separately-styled notices that previously existed on the events and
 * schedule screens (and the home screen's total absence of one).
 *
 * Deliberately *not* a hard gate: on patchy venue Wi-Fi, stale data beats an
 * empty screen, so this informs and never blocks. It renders nothing at all
 * when the data is live and there's nothing queued.
 */
export function OfflineBanner({ source, savedAt }: { source: DataSource; savedAt: number | null }) {
  const { isOnline, isBackendReachable } = useNetwork();
  const { pendingWrites } = useAppData();

  const isSeed = source === "seed";
  const isCache = source === "cache";
  const hasQueuedWrites = pendingWrites > 0;

  // Live data, connected, nothing queued — say nothing.
  if (!isSeed && !isCache && isOnline && isBackendReachable !== false && !hasQueuedWrites) {
    return null;
  }

  let tone: "warn" | "info" = "info";
  let title: string;
  let detail: string;

  if (isSeed) {
    tone = "warn";
    title = "OFFLINE SNAPSHOT";
    detail = `Showing the programme bundled with the app (${formatAge(savedAt)}). Connect once to load the latest.`;
  } else if (!isOnline) {
    title = "OFFLINE";
    detail = `Showing saved data from ${formatAge(savedAt)}. It'll refresh automatically when you're back online.`;
  } else if (isBackendReachable === false) {
    title = "CAN'T REACH SERVER";
    detail = `You're online but the fest server isn't responding. Showing saved data from ${formatAge(savedAt)}.`;
  } else if (isCache) {
    title = "SAVED DATA";
    detail = `Last synced ${formatAge(savedAt)}.`;
  } else {
    title = "SYNCING";
    detail = "";
  }

  const queued = hasQueuedWrites
    ? `${pendingWrites} change${pendingWrites === 1 ? "" : "s"} waiting to sync.`
    : "";

  return (
    <View style={[styles.container, tone === "warn" ? styles.warn : styles.info]}>
      <Text style={styles.icon}>{tone === "warn" ? "⚠️" : "📡"}</Text>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
        {queued ? <Text style={styles.queued}>{queued}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: px(8),
    marginHorizontal: px(16),
    marginBottom: px(10),
    paddingVertical: px(10),
    paddingHorizontal: px(12),
    borderRadius: px(10),
    borderWidth: px(1),
  },
  warn: {
    backgroundColor: "rgba(255,170,0,0.12)",
    borderColor: "rgba(255,170,0,0.45)",
  },
  info: {
    backgroundColor: "rgba(120,150,255,0.10)",
    borderColor: "rgba(120,150,255,0.35)",
  },
  icon: {
    fontSize: px(14),
    marginTop: px(1),
  },
  body: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    letterSpacing: px(0.8),
    color: "#ffe9b8",
    marginBottom: px(2),
  },
  detail: {
    fontFamily: fonts.body,
    fontSize: px(11),
    lineHeight: px(15),
    color: "#c9cee0",
  },
  queued: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(11),
    color: "#9fd0ff",
    marginTop: px(3),
  },
});
