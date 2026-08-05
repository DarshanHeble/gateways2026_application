import { View, Text, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Ionicons } from "@expo/vector-icons";

const TEAM_CONTACTS = [
  { id: "1", name: "Alice Event Lead", phone: "+1234567890" },
  { id: "2", name: "Bob Security", phone: "+0987654321" },
  { id: "3", name: "Charlie Stage Manager", phone: "+1122334455" },
];

export default function ContactTab() {
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
    <View style={styles.root}>
      <Text style={styles.title}>Team Contacts</Text>
      <Text style={styles.body}>Tap on a contact to initiate a call immediately.</Text>

      <View style={styles.list}>
        {TEAM_CONTACTS.map((contact) => (
          <View key={contact.id} style={styles.card}>
            <View style={styles.cardInfo}>
              <Text style={styles.contactName}>{contact.name}</Text>
              <Text style={styles.contactPhone}>{contact.phone}</Text>
            </View>
            <Pressable
              onPress={() => handleCall(contact.phone)}
              style={styles.callButton}
            >
              <Ionicons name="call" size={20} color={colors.stage} />
            </Pressable>
          </View>
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
    fontFamily: fonts.pixelBold,
    fontSize: px(18),
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
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: px(16),
    borderRadius: px(8),
    borderWidth: 1,
    borderColor: colors.gold.muted,
  },
  cardInfo: {
    flex: 1,
  },
  contactName: {
    fontFamily: fonts.pixel,
    fontSize: px(12),
    color: colors.gold.title,
    marginBottom: px(4),
  },
  contactPhone: {
    fontFamily: fonts.body,
    fontSize: px(12),
    color: colors.cyan,
  },
  callButton: {
    backgroundColor: colors.gold.muted,
    padding: px(10),
    borderRadius: px(20),
    alignItems: "center",
    justifyContent: "center",
  },
});
