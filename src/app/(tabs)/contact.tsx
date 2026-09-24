import { View, Text, StyleSheet, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { useBlockTheme } from "@/theme/BlockThemeContext";
import {
  CREW_PALETTES,
  McGlyph,
  PixelIcon,
  crewHead,
  paletteIndexFor,
} from "@/components/mc/PixelIcon";
import { DirtBackground, Frame, McCard, useSurface } from "@/components/mc";

const TEAM_CONTACTS = [
  { id: "1", name: "Alice Event Lead", phone: "+1234567890" },
  { id: "2", name: "Bob Security", phone: "+0987654321" },
  { id: "3", name: "Charlie Stage Manager", phone: "+1122334455" },
];

export default function ContactTab() {
  const insets = useSafeAreaInsets();
  const { theme } = useBlockTheme();
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
    <View style={[styles.root, { paddingTop: insets.top + px(52), backgroundColor: theme.background }]}>
      {/*
        The dirt menu background.

        Minecraft splits its backdrops: the title screen gets the panning
        panorama, and every menu behind it — options, inventory, controls — gets
        the dirt block tiled and darkened. Home is this app's title screen and
        carries the panorama; the list screens get the dirt, which is what makes
        them read as *inside* the same game rather than as a different app's
        settings page.
      */}
      <DirtBackground brightness={0.085} />
      <Text style={[styles.title, { color: theme.text }]}>CREW</Text>
      <Text style={[styles.body, { color: theme.textDim }]}>
        Tap a name to call them straight away.
      </Text>

      <View style={styles.list}>
        {TEAM_CONTACTS.map((contact) => (
          <McCard
            key={contact.id}
            onPress={() => handleCall(contact.phone)}
            fill={theme.surfaceElevated}
            style={styles.card}
            accessibilityLabel={`Call ${contact.name}`}
          >
            {/* A player head per crew member, in their own colours — the
                game's own way of showing who someone is. */}
            <View style={[styles.headSlot, { backgroundColor: surface.slot }]}>
              <Frame depth="sunken" />
              <PixelIcon
                art={crewHead(...CREW_PALETTES[paletteIndexFor(contact.name)])}
                size={px(30)}
              />
            </View>

            <View style={styles.cardInfo}>
              <Text style={[styles.contactName, { color: theme.text }]}>
                {contact.name}
              </Text>
              <Text style={[styles.contactPhone, { color: theme.primary }]}>{contact.phone}</Text>
            </View>
            <View style={[styles.callButton, { backgroundColor: surface.slotActive }]}>
              <Frame depth="raised" />
              <McGlyph name="phone" size={px(18)} color={theme.primary} />
            </View>
          </McCard>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.stage,
    padding: px(16),
  },
  title: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(32),
    letterSpacing: typography.pageTitle.letterSpacing,
    color: colors.gold.title,
    marginBottom: px(8),
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(14),
    color: colors.body,
    marginBottom: px(24),
  },
  list: {
    gap: px(12),
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(14),
    padding: px(14),
  },
  headSlot: {
    width: px(44),
    height: px(44),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    overflow: "hidden",
  },
  cardInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: typography.h3.fontFamily,
    fontSize: px(typography.h3.fontSize),
    color: colors.gold.title,
    marginBottom: px(4),
  },
  contactPhone: {
    fontFamily: fonts.body,
    fontSize: px(15),
    color: colors.cyan,
  },
  callButton: {
    width: px(38),
    height: px(38),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
    overflow: "hidden",
  },
});
