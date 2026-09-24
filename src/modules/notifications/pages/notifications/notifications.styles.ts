import { StyleSheet } from "react-native";
import { colors, fonts, typography } from "@/theme/tokens";
import { material, mojang } from "@/theme/minecraft";
import { px } from "@/theme/scale";

export const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    fontSize: px(16),
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
  /*
   * Body copy, in the body face.
   *
   * This was set in the Minecraft pixel font at body size, which is the classic
   * way to ruin a pixel-font design: the face is a *display* face — one weight
   * of texture, no small-size legibility — so a wrapping sentence in it reads as
   * a novelty and is genuinely harder to scan. The pixel face is for mastheads,
   * eyebrows and labels; sentences are Space Grotesk.
   */
  heroSubtitle: {
    fontFamily: fonts.body,
    fontSize: px(15),
    lineHeight: px(21),
    marginTop: px(6),
  },
  markAllPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: px(6),
    paddingHorizontal: px(12),
    paddingVertical: px(8),
    borderRadius: 0,
    overflow: "hidden",
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
    paddingTop: px(48),
    gap: px(4),
  },
  emptyTitle: {
    fontFamily: typography.kicker.fontFamily,
    fontSize: px(typography.kicker.fontSize),
    letterSpacing: typography.kicker.letterSpacing,
    marginTop: px(16),
  },
  emptySub: {
    fontFamily: fonts.body,
    fontSize: px(14),
    lineHeight: px(20),
    textAlign: "center",
    maxWidth: px(260),
  },
  card: {
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: px(12),
    padding: px(18),
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
    borderRadius: 0,
    marginTop: px(6),
  },
  body: {
    fontFamily: fonts.body,
    fontSize: px(15),
    color: mojang.greySoft,
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
    paddingVertical: px(4),
    paddingHorizontal: px(9),
    borderRadius: 0,
    overflow: "hidden",
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
    color: mojang.greySoft,
  },
});
