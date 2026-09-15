with open("src/app/(tabs)/profile.tsx", "r") as f:
    content = f.read()

# 1. Add isDark and toggleColorMode
if 'isDark, toggleColorMode' not in content:
    content = content.replace(
        'const { activeShape, setShapeById, shapes, theme } = useM3Theme();',
        'const { activeShape, setShapeById, shapes, theme, isDark, toggleColorMode } = useM3Theme();'
    )

# 2. Add Dark Mode Icon and split name styling
old_hero = '''        <View style={styles.heroHeaderRow}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroSupTitle}>STAGE IDENTITY,</Text>
            <Text style={styles.heroFirstNameTitle} numberOfLines={1}>
              {firstName}
            </Text>
            {lastName ? (
              <Text style={[styles.heroLastNameTitle, { color: theme.primary }]} numberOfLines={1}>
                {lastName}
              </Text>
            ) : null}
            <Text style={styles.heroSubtitle}>
              {profile.participantId} • {activeSkin.title}
            </Text>
          </View>
        </View>'''

new_hero = '''        <View style={[styles.heroHeaderRow, { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }]}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroSupTitle}>STAGE IDENTITY,</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
              <Text style={styles.heroFirstNameTitle} numberOfLines={1}>
                {firstName}
              </Text>
              {lastName ? (
                <Text style={[styles.heroLastNameTitle, { color: theme.primary }]} numberOfLines={1}>
                  {lastName}
                </Text>
              ) : null}
            </View>
            <Text style={styles.heroSubtitle}>
              {profile.participantId} • {activeSkin.title}
            </Text>
          </View>

          {/* Dark / Light Mode Switcher */}
          <TouchableOpacity
            style={{
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)",
              borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
            }}
            activeOpacity={0.7}
            onPress={toggleColorMode}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>'''

content = content.replace(old_hero, new_hero)

# 3. Update styles for name
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
    color: "#d6c8aa",
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
    color: "#dfb15b",
    letterSpacing: -1,
    marginBottom: px(4),
  },''',
'''  heroHeaderRow: {
    marginBottom: px(12),
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
  },''')

with open("src/app/(tabs)/profile.tsx", "w") as f:
    f.write(content)

