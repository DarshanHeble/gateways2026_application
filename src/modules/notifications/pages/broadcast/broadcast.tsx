import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Redirect } from "expo-router";

import { space } from "@/theme/tokens";
import { mcTextShadow } from "@/theme/minecraft";
import { px } from "@/theme/scale";
import { PixelInput } from "@/components/pixel/PixelInput";

import { PixelToast } from "@/components/pixel/PixelToast";
import { Frame, Grain, McButton, McCard, useSurface } from "@/components/mc";
import { PageBanner } from "@/components/launcher";
import { useAuth } from "@/modules/auth";
import { useNotifications } from "../../stores/NotificationsContext";
import { fetchNotifications } from "@/services/notifications";
import { AppNotification, NotificationTarget, targetLabel } from "@/services/notificationTypes";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import { styles } from "./broadcast.styles";

type TargetOption = "all" | "participant" | "team" | "email";

const TARGET_OPTIONS: { key: TargetOption; label: string }[] = [
  { key: "all", label: "EVERYONE" },
  { key: "participant", label: "PARTICIPANTS" },
  { key: "team", label: "TEAM" },
  { key: "email", label: "SPECIFIC EMAIL" },
];

export function BroadcastScreen() {
  const { theme } = useBlockTheme();
  const surface = useSurface();
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
      <View style={[styles.flex, { backgroundColor: theme.background }]}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <PageBanner
            eyebrow="CREW ONLY"
            title="Shout"
            subtitle="Send an announcement to everyone at the fest."
            gutter={px(space.lg)}
          />

          {/* The composer, as a container panel. */}
          <View style={[styles.panel, { backgroundColor: theme.surfaceElevated }]}>
            <Grain />
            <Frame depth="raised" />

            <View style={styles.panelTitleBar}>
              <Text style={[styles.eyebrow, { color: theme.textDim }]}>NEW MESSAGE</Text>
              <View style={[styles.teamTag, { backgroundColor: surface.slot }]}>
                <Frame depth="sunken" />
                <Text style={[styles.teamTagText, { color: theme.primary }]}>TEAM ONLY</Text>
              </View>
            </View>

            <Text style={[styles.demoNotice, { color: theme.primary }]}>
              Demo mode — sends land on this device only until the backend is connected.
            </Text>

            <PixelInput label="TITLE" value={title} onChangeText={setTitle} placeholder="Schedule update" />

            <View style={{ height: px(space.md) }} />

            <PixelInput
              label="MESSAGE"
              value={body}
              onChangeText={setBody}
              placeholder="The hackathon venue has changed to..."
              multiline
              style={styles.multiline}
            />

            <View style={{ height: px(space.lg) }} />

            <Text style={[styles.eyebrow, { color: theme.textDim }]}>SEND TO</Text>
            <View style={styles.targetRow}>
              {TARGET_OPTIONS.map((opt) => {
                const active = targetOption === opt.key;
                return (
                  <McCard
                    key={opt.key}
                    onPress={() => setTargetOption(opt.key)}
                    depth={active ? "gold" : "raised"}
                    fill={active ? surface.slotActive : surface.stone}
                    style={styles.targetChip}
                    accessibilityLabel={opt.label}
                  >
                    <Text
                      style={[
                        styles.targetChipText,
                        { color: active ? theme.primary : theme.textDim },
                        mcTextShadow(active ? theme.primary : theme.textDim, 13),
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </McCard>
                );
              })}
            </View>

            {targetOption === "email" ? (
              <>
                <View style={{ height: px(space.md) }} />
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

            <McButton
              label={busy ? "Sending…" : "Send notification"}
              tone="confirm"
              block
              disabled={!canSend}
              onPress={handleSend}
              style={styles.sendBtn}
            />
          </View>

          <Text style={[styles.eyebrow, styles.historyHeader, { color: theme.textDim }]}>
            SENT HISTORY
          </Text>

          {history.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textDim }]}>Nothing sent yet.</Text>
          ) : (
            history.map((item) => (
              <View
                key={item.id}
                style={[styles.historyCard, { backgroundColor: theme.surfaceElevated }]}
              >
                <Grain />
                <Frame depth="raised" />
                <View style={styles.historyHeaderRow}>
                  <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.targetBadge, { backgroundColor: surface.slot }]}>
                    <Frame depth="sunken" />
                    <Text style={[styles.targetBadgeText, { color: theme.textDim }]}>
                      {targetLabel(item.target)}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.historyBody, { color: theme.textDim }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
      <PixelToast message={toast} bottom={24} />
    </KeyboardAvoidingView>
  );
}
