import { View, Text, StyleSheet, Linking, Alert, ScrollView, StatusBar } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fonts, space } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import {
  CREW_PALETTES,
  McGlyph,
  PixelIcon,
  crewHead,
  paletteIndexFor,
} from "@/components/mc/PixelIcon";
import { PageBanner, PressScale, SectionHeader } from "@/components/launcher";
import { useSurface } from "@/components/mc";

/*
 * PLACEHOLDERS. These are not real people or numbers: the organisers' "event
 * heads" sheet is still empty, so there is nothing to load yet. The screen
 * says so rather than presenting them as the actual crew. Replace with the
 * sheet (or a backend endpoint) before the fest.
 */
const PLACEHOLDER_CONTACTS = true;
const TEAM_CONTACTS = [
  { id: "1", name: "Alice Event Lead", phone: "+1234567890" },
  { id: "2", name: "Bob Security", phone: "+0987654321" },
  { id: "3", name: "Charlie Stage Manager", phone: "+1122334455" },
];

export default function ContactTab() {
  const { theme, isDark } = useBlockTheme();
  const surface = useSurface();
  const handleCall = async (phone: string) => {
    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Phone calls are not supported on this device");
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageBanner
          eyebrow="CREW ONLY"
          title="Crew"
          subtitle="The people running the fest. Tap anyone to call."
          gutter={GUTTER}
        />

        {PLACEHOLDER_CONTACTS ? (
          <View style={[styles.notice, { borderColor: theme.primary, backgroundColor: theme.primaryContainer }]}>
            <McGlyph name="bellOff" size={px(13)} color={theme.primary} />
            <Text style={[styles.noticeText, { color: theme.text }]}>
              Sample contacts. The real crew list will appear once the organisers fill in the event-heads sheet.
            </Text>
          </View>
        ) : null}

        <SectionHeader icon="crew" title="On call" count={TEAM_CONTACTS.length} />
        <View style={styles.list}>
          {TEAM_CONTACTS.map((contact, i) => (
            <Animated.View key={contact.id} entering={FadeInDown.duration(320).delay(i * 50)}>
              <PressScale
                onPress={() => handleCall(contact.phone)}
                style={[styles.card, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}
              >
                {/* A player head per crew member, in their own colours. */}
                <View style={[styles.headSlot, { backgroundColor: surface.slot }]}>
                  <PixelIcon art={crewHead(...CREW_PALETTES[paletteIndexFor(contact.name)])} size={px(30)} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.contactName, { color: theme.text }]} numberOfLines={1}>
                    {contact.name}
                  </Text>
                  <Text style={[styles.contactPhone, { color: theme.textDim }]}>{contact.phone}</Text>
                </View>
                <View style={[styles.callButton, { borderColor: theme.primary, backgroundColor: theme.primaryContainer }]}>
                  <McGlyph name="phone" size={px(16)} color={theme.primary} />
                </View>
              </PressScale>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const GUTTER = px(space.xl);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: px(40) },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: px(8),
    borderWidth: StyleSheet.hairlineWidth,
    padding: px(12),
  },
  noticeText: { flex: 1, fontFamily: fonts.body, fontSize: px(13), lineHeight: px(18) },
  list: { gap: px(10) },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(14),
    padding: px(12),
    borderWidth: StyleSheet.hairlineWidth,
  },
  headSlot: { width: px(46), height: px(46), alignItems: "center", justifyContent: "center" },
  cardInfo: { flex: 1, minWidth: 0 },
  contactName: { fontFamily: fonts.display, fontSize: px(17), lineHeight: px(21) },
  contactPhone: { fontFamily: fonts.bodyMedium, fontSize: px(14), marginTop: px(2) },
  callButton: {
    width: px(40),
    height: px(40),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
