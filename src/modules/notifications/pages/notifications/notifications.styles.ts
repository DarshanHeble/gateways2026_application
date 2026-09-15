import { StyleSheet } from "react-native";
import { colors, fonts, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#070b12",
  },
  ambientAuraTop: {
    position: "absolute",
    top: -px(160),
    left: -px(100),
    width: px(450),
    height: px(450),
    borderRadius: px(225),
    opacity: 0.65,
  },
  ambientAuraBottom: {
    position: "absolute",
    bottom: px(10),
    right: -px(100),
    width: px(380),
    height: px(380),
    borderRadius: px(190),
    opacity: 0.45,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: px(22),
  },
  heroHeaderRow: {
    marginBottom: px(16),
  },
  heroSupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(19),
    fontWeight: "700",
    letterSpacing: 2.2,
    color: "#d6c8aa",
    marginBottom: px(4),
  },
  titleActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroMainTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    color: "#ffffff",
    letterSpacing: typography.pageTitle.letterSpacing,
  },
  heroSubtitle: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(19),
    color: "#8e9ea8",
    marginTop: px(4),
  },
  markAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(5),
    paddingHorizontal: px(12),
    paddingVertical: px(6),
    borderRadius: px(12),
    borderWidth: 1,
  },
  markAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14),
    letterSpacing: 0.5,
  },
  listContainer: {
    paddingBottom: px(120),
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: px(80),
    gap: px(8),
  },
  emptyTitle: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(20),
    color: "#ffffff",
    marginTop: px(8),
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: px(16),
    color: "#64748b",
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderRadius: px(16),
    borderWidth: 1,
    marginBottom: px(12),
    padding: px(16),
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: px(8),
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.pixelMedium,
    fontSize: px(19),
    color: "#e2e8f0",
    lineHeight: px(24),
  },
  dot: {
    width: px(8),
    height: px(8),
    borderRadius: px(4),
    marginTop: px(4),
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(17),
    color: "#94a3b8",
    lineHeight: px(23),
    marginTop: px(6),
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: px(12),
    paddingTop: px(10),
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  targetBadge: {
    paddingVertical: px(3),
    paddingHorizontal: px(8),
    borderRadius: px(6),
  },
  targetBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13.5),
    letterSpacing: 0.5,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(4),
  },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(15),
    color: "#64748b",
  },
});
