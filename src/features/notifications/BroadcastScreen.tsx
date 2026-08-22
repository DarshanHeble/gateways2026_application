import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Redirect } from "expo-router";

import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelToast } from "@/components/pixel/PixelToast";
import { MinecraftButton } from "@/components/MaterialCraft/MinecraftButton";
import { useAuth } from "@/features/auth/AuthContext";
import { useNotifications } from "./NotificationsContext";
import { fetchNotifications } from "@/services/notifications";
import { AppNotification, NotificationTarget, targetLabel } from "@/services/notificationTypes";

type TargetOption = "all" | "participant" | "team" | "email";

const TARGET_OPTIONS: { key: TargetOption; label: string }[] = [
  { key: "all", label: "EVERYONE" },
  { key: "participant", label: "PARTICIPANTS" },
  { key: "team", label: "TEAM" },
  { key: "email", label: "SPECIFIC EMAIL" },
];

export function BroadcastScreen() {
  const { role } = useAuth();
  const { sendNotification } = useNotifications();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetOption, setTargetOption] = useState<TargetOption>("all");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [history, setHistory] = useState<AppNotification[]>([]);

  const loadHistory = useCallback(async () => {
    const all = await fetchNotifications();
    setHistory(all);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const say = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && (targetOption !== "email" || email.trim().length > 0) && !busy;

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setBusy(true);
    const target: NotificationTarget = targetOption === "email" ? { email: email.trim() } : targetOption;
    try {
      await sendNotification({ title: title.trim(), body: body.trim(), target });
      say("NOTIFICATION SENT");
      setTitle("");
      setBody("");
      setEmail("");
      await loadHistory();
    } catch {
      say("FAILED TO SEND");
    } finally {
      setBusy(false);
    }
  }, [canSend, targetOption, email, title, body, sendNotification, say, loadHistory]);

  if (role !== "team") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={styles.root} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <PixelCard headerTitle="BROADCAST" badge="TEAM ONLY">
          <Text style={styles.demoNotice}>
            DEMO MODE — sends land on this device only until the backend is connected.
          </Text>

          <PixelInput label="TITLE" value={title} onChangeText={setTitle} placeholder="Schedule Update" />

          <View style={{ height: px(12) }} />

          <PixelInput
            label="MESSAGE"
            value={body}
            onChangeText={setBody}
            placeholder="The hackathon venue has changed to..."
            multiline
            style={styles.multiline}
          />

          <View style={{ height: px(14) }} />

          <Text style={styles.fieldLabel}>SEND TO</Text>
          <View style={styles.targetRow}>
            {TARGET_OPTIONS.map((opt) => {
              const active = targetOption === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.targetChip, active && styles.targetChipActive]}
                  onPress={() => setTargetOption(opt.key)}
                >
                  <Text style={[styles.targetChipText, active && styles.targetChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {targetOption === "email" ? (
            <>
              <View style={{ height: px(12) }} />
              <PixelInput
                label="RECIPIENT EMAIL"
                value={email}
                onChangeText={setEmail}
                placeholder="someone@christuniversity.in"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </>
          ) : null}

          <View style={{ height: px(16) }} />

          <MinecraftButton mode="contained" onPress={handleSend} disabled={!canSend} loading={busy}>
            SEND NOTIFICATION
          </MinecraftButton>
        </PixelCard>

        <Text style={styles.historyHeader}>SENT HISTORY</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>Nothing sent yet.</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={styles.historyHeaderRow}>
                <Text style={styles.historyTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetBadgeText}>{targetLabel(item.target)}</Text>
                </View>
              </View>
              <Text style={styles.historyBody} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
      <PixelToast message={toast} bottom={24} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
    backgroundColor: "#0d1018",
  },
  scrollContent: {
    padding: px(14),
    paddingBottom: px(40),
  },
  demoNotice: {
    fontFamily: fonts.body,
    fontSize: px(11),
    color: "#e2af64",
    marginBottom: px(14),
    lineHeight: px(16),
  },
  multiline: {
    height: px(90),
    textAlignVertical: "top",
    paddingTop: px(10),
  },
  fieldLabel: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    letterSpacing: px(1.5),
    color: "#ffe9b8",
    marginBottom: px(8),
  },
  targetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
  },
  targetChip: {
    paddingVertical: px(8),
    paddingHorizontal: px(12),
    backgroundColor: "#202736",
    borderRadius: px(6),
    borderWidth: px(1),
    borderColor: "#2a3245",
  },
  targetChipActive: {
    backgroundColor: "#2a1e12",
    borderColor: "#c8a679",
  },
  targetChipText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(10),
    color: "#8090a8",
  },
  targetChipTextActive: {
    color: "#ffe9b8",
  },
  historyHeader: {
    fontFamily: fonts.pixelBold,
    fontSize: px(12),
    color: "#a08c70",
    letterSpacing: px(1),
    marginTop: px(20),
    marginBottom: px(10),
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: px(13),
    color: "#5a6478",
  },
  historyCard: {
    backgroundColor: "#161b26",
    borderRadius: px(8),
    borderWidth: px(1),
    borderColor: "#2a3245",
    padding: px(12),
    marginBottom: px(10),
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: px(8),
  },
  historyTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: px(14),
    color: "#ffe9b8",
  },
  historyBody: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: "#a0a0a0",
    marginTop: px(4),
  },
  targetBadge: {
    backgroundColor: "#202736",
    paddingVertical: px(3),
    paddingHorizontal: px(8),
    borderRadius: px(4),
  },
  targetBadgeText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(9),
    color: "#8090a8",
  },
});
