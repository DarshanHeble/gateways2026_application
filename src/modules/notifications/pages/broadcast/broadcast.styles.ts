import { StyleSheet } from "react-native";

import { fonts, space, typography } from "@/theme/tokens";
import { px } from "@/theme/scale";

export const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1 },
  scrollContent: {
    paddingHorizontal: px(space.lg),
    paddingBottom: px(space["4xl"]),
  },

  pageTitle: {
    fontFamily: typography.pageTitle.fontFamily,
    fontSize: px(typography.pageTitle.fontSize),
    lineHeight: px(typography.pageTitle.lineHeight),
    letterSpacing: typography.pageTitle.letterSpacing,
  },
  pageSub: {
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
    lineHeight: px(typography.body.lineHeight),
    marginTop: px(space.xs),
    marginBottom: px(space.xl),
  },

  /** The composer, as a container panel. */
  panel: {
    padding: px(space.lg),
    borderRadius: 0,
    overflow: "hidden",
  },
  panelTitleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: px(space.md),
  },
  eyebrow: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(typography.eyebrow.fontSize),
    letterSpacing: typography.eyebrow.letterSpacing,
  },
  teamTag: {
    paddingHorizontal: px(space.sm),
    paddingVertical: px(space.xs),
    borderRadius: 0,
    overflow: "hidden",
  },
  teamTagText: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(12),
    letterSpacing: typography.eyebrow.letterSpacing,
  },

  demoNotice: {
    fontFamily: fonts.body,
    fontSize: px(13),
    lineHeight: px(19),
    marginBottom: px(space.lg),
  },
  multiline: {
    minHeight: px(96),
    textAlignVertical: "top",
    paddingTop: px(space.md),
  },

  targetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(space.sm),
    marginTop: px(space.sm),
  },
  targetChip: {
    paddingHorizontal: px(space.md),
    paddingVertical: px(space.sm),
  },
  targetChipText: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(13),
    letterSpacing: typography.eyebrow.letterSpacing,
  },

  sendBtn: { marginTop: px(space.xl) },

  historyHeader: { marginTop: px(space["2xl"]), marginBottom: px(space.md) },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: px(14),
  },
  historyCard: {
    padding: px(space.md),
    marginBottom: px(space.sm),
    borderRadius: 0,
    overflow: "hidden",
  },
  historyHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: px(space.sm),
  },
  historyTitle: {
    flex: 1,
    fontFamily: typography.h3.fontFamily,
    fontSize: px(typography.h3.fontSize),
    letterSpacing: typography.h3.letterSpacing,
  },
  historyBody: {
    fontFamily: fonts.body,
    fontSize: px(14),
    lineHeight: px(20),
    marginTop: px(space.xs),
  },
  targetBadge: {
    paddingHorizontal: px(space.sm),
    paddingVertical: px(3),
    borderRadius: 0,
    overflow: "hidden",
  },
  targetBadgeText: {
    fontFamily: typography.eyebrow.fontFamily,
    fontSize: px(11),
    letterSpacing: typography.eyebrow.letterSpacing,
  },
});
