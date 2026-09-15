import { StyleSheet } from "react-native";
import { colors, fonts } from "@/theme/tokens";
import { px } from "@/theme/scale";

export const styles = StyleSheet.create({
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
