import re

with open("src/app/(tabs)/index.tsx", "r") as f:
    content = f.read()

# Make sure collapsibleHeaderContainer exists
if 'collapsibleHeaderContainer:' not in content:
    content = content.replace('  scroll: {\n    flex: 1,\n  },', '''  collapsibleHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  scroll: {
    flex: 1,
  },''')

# Update hero titles and align settings
content = content.replace(
'''  heroHeaderRow: {
    marginBottom: px(12),
  },
  titleColumn: {
    width: "100%",
  },
  heroSupTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(13),
    fontWeight: "700",
    letterSpacing: 2.2,
    color: "#d6c8aa", // Sandstone Parchment
    marginBottom: px(4),
  },
  heroFirstNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(42),
    lineHeight: px(44),
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroLastNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(42),
    lineHeight: px(44),
    fontWeight: "900",
    color: "#dfb15b", // Parallax Gold
    letterSpacing: -1,
    marginBottom: px(4),
  },
  heroSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#8e9ea8",
    marginTop: px(4),
  },
  artisticCenterpieceWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: px(390),
    position: "relative",
    marginVertical: px(12),
  },''',
'''  heroHeaderRow: {
    marginBottom: px(12),
    paddingHorizontal: px(20),
  },
  titleColumn: {
    gap: px(2),
  },
  heroSupTitle: {
    fontFamily: fonts.pixelBold,
    fontSize: px(11),
    color: "#8e99a8",
    letterSpacing: px(1),
    marginBottom: px(2),
  },
  heroFirstNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(36),
    lineHeight: px(40),
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1,
  },
  heroLastNameTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: px(36),
    lineHeight: px(40),
    fontWeight: "900",
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: px(13),
    color: "#64748b",
    marginTop: px(4),
  },
  artisticCenterpieceWrapper: {
    height: 360,
    justifyContent: "center",
    alignItems: "center",
    marginTop: px(10),
  },''')

with open("src/app/(tabs)/index.tsx", "w") as f:
    f.write(content)

