import React, { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Redirect } from "expo-router";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { PixelInput } from "@/components/pixel/PixelInput";
import { PixelCard } from "@/components/pixel/PixelCard";
import { PixelToast } from "@/components/pixel/PixelToast";
import { MinecraftButton } from "@/components/MaterialCraft/MinecraftButton";
import { useAuth } from "@/modules/auth";
import { useNotifications } from "../../stores/NotificationsContext";
import { fetchNotifications } from "@/services/notifications";
import { AppNotification, NotificationTarget, targetLabel } from "@/services/notificationTypes";
import { useM3Theme } from "@/theme/M3ThemeContext";
import { styles } from "./broadcast.styles";

type TargetOption = "all" | "participant" | "team" | "email";

const TARGET_OPTIONS: { key: TargetOption; label: string }[] = [
  { key: "all", label: "EVERYONE" },
  { key: "participant", label: "PARTICIPANTS" },
  { key: "team", label: "TEAM" },
  { key: "email", label: "SPECIFIC EMAIL" },
];

export function BroadcastScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useM3Theme();
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

  const toastTimerRef = React.useRef<any>(null);

  const say = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
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
      <ScrollView
        style={[styles.root, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, px(16)) + px(8) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <PixelCard headerTitle="BROADCAST" badge="TEAM ONLY">
          <Text style={[styles.demoNotice, { color: theme.primary }]}>
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

          <Text style={[styles.fieldLabel, { color: theme.text }]}>SEND TO</Text>
          <View style={styles.targetRow}>
            {TARGET_OPTIONS.map((opt) => {
              const active = targetOption === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.targetChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }, active && { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]}
                  onPress={() => setTargetOption(opt.key)}
                >
                  <Text style={[styles.targetChipText, { color: theme.textDim }, active && { color: theme.primary }]}>{opt.label}</Text>
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

        <Text style={[styles.historyHeader, { color: theme.text }]}>SENT HISTORY</Text>
        {history.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.textDim }]}>Nothing sent yet.</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={[styles.historyCard, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
              <View style={styles.historyHeaderRow}>
                <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={[styles.targetBadge, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.targetBadgeText, { color: theme.textDim }]}>{targetLabel(item.target)}</Text>
                </View>
              </View>
              <Text style={[styles.historyBody, { color: theme.textDim }]} numberOfLines={2}>
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


