import re

with open("src/app/(tabs)/index.tsx", "r") as f:
    content = f.read()

# 1. Add useAnimatedScrollHandler import
content = content.replace(
    '  runOnJS,\n  type SharedValue,\n} from "react-native-reanimated";',
    '  runOnJS,\n  type SharedValue,\n  useAnimatedScrollHandler,\n} from "react-native-reanimated";'
)

# 2. Update name splitting for two colors
content = content.replace(
    '''  const rawName = userProfile.fullName?.trim() || "Steve Crafter";
  const formattedName = rawName.replace(/\\w\\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

  const toggleParticipate''',
    '''  const rawName = userProfile.fullName?.trim() || "Steve Crafter";
  const nameParts = rawName.split(/\\s+/);
  const firstName = nameParts[0].charAt(0).toUpperCase() + nameParts[0].substr(1).toLowerCase();
  const lastName = nameParts.length > 1 ? nameParts.slice(1).map(txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()).join(" ") : "";

  const toggleParticipate'''
)

# 3. Add scroll tracking and animated styles
anim_block = '''  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // Scroll tracking for collapsible header
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event: any) => {
    scrollY.value = event.contentOffset.y;
  });

  const HEADER_MAX_HEIGHT = px(480);
  const HEADER_MIN_HEIGHT = px(100) + insets.top;
  const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const animatedHeaderStyle = useAnimatedStyle(() => {
    const height = Math.max(HEADER_MIN_HEIGHT, HEADER_MAX_HEIGHT - scrollY.value);
    return {
      height,
    };
  });

  const animatedHeroTextStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, 1 - scrollY.value / (SCROLL_DISTANCE * 0.4));
    const scale = Math.max(0.8, 1 - scrollY.value / SCROLL_DISTANCE * 0.2);
    const translateY = -(scrollY.value * 0.3);
    return {
      opacity,
      transform: [{ scale }, { translateY }],
    };
  });

  const animatedSatellitesStyle = useAnimatedStyle(() => {
    const opacity = Math.max(0, 1 - scrollY.value / (SCROLL_DISTANCE * 0.3));
    return {
      opacity,
      display: opacity === 0 ? "none" : "flex",
    };
  });

  const animatedAvatarContainerStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, scrollY.value / SCROLL_DISTANCE));
    const scale = 1 - progress * 0.55; 
    const translateY = -(progress * px(160)); 
    const translateX = progress * px(120);

    return {
      transform: [
        { translateX },
        { translateY },
        { scale },
      ],
    };
  });

  // Gesture slide-down to close for Pick Events Modal
  const pickerSheetY = useSharedValue(0);'''

content = content.replace(
    '''  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  // Gesture slide-down to close for Pick Events Modal
  const pickerSheetY = useSharedValue(0);''',
    anim_block
)

# 4. Replace ScrollView and Wrap Header
# Using regex to replace the ScrollView section up to the lineupDeckSection
import re
pattern = r'<ScrollView\s+style=\{styles\.scroll\}.*?</View>\s+<View style=\{styles\.lineupDeckSection\}>'

replacement = '''
      {/* Absolutely Positioned Collapsible Header Container */}
      <Animated.View
        style={[
          styles.collapsibleHeaderContainer,
          animatedHeaderStyle,
          {
            backgroundColor: theme.primaryContainer || "rgba(10, 15, 26, 0.95)",
            borderColor: theme.rimBorder,
          },
        ]}
      >
        <Animated.View style={[styles.heroHeaderRow, animatedHeroTextStyle, { paddingTop: Math.max(insets.top, px(24)) + px(16) }]}>
          <View style={styles.titleColumn}>
            <Text style={styles.heroSupTitle}>WELCOME BACK,</Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: px(6) }}>
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
              {participatingEvents.length > 0
                ? `${participatingEvents.length} event${participatingEvents.length > 1 ? "s" : ""} lined up for you`
                : "Your personal stage is ready"}
            </Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.artisticCenterpieceWrapper, animatedAvatarContainerStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, animatedSatellitesStyle]} pointerEvents="box-none">
            {shapes.map((item, idx) => (
              <FloatingSatellite
                key={item.id}
                item={item}
                index={idx}
                floatProgress={floatProgress}
                isSelected={activeShape.id === item.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setShapeById(item.id);
                }}
              />
            ))}
          </Animated.View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.capsuleTouchable}
            onPress={() => router.push("/(tabs)/profile" as never)}
          >
            {activeShape.category === "Burst" && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.floatingCapsuleShape,
                  {
                    position: "absolute",
                    backgroundColor: theme.primaryContainer || "#0d131f",
                  },
                  burstSecondaryStyle,
                ]}
              >
                <View style={[styles.capsuleBackGlow, { backgroundColor: theme.primary }]} />
              </Animated.View>
            )}

            <Animated.View
              style={[
                styles.floatingCapsuleShape,
                { backgroundColor: theme.primaryContainer || "#0d131f" },
                rotatingShapeStyle,
              ]}
            >
              <View style={[styles.capsuleBackGlow, { backgroundColor: theme.primary }]} />
              <Animated.View style={[styles.avatarCounterWrap, counterRotateAvatarStyle]}>
                <Image
                  source={userSkin.source}
                  style={styles.capsuleAvatarImage}
                  contentFit="contain"
                  priority="high"
                />
              </Animated.View>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: px(490) }]}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >

        {/* Modern Event Lineup Deck (Different from regular cards or tables) */}
        <View style={styles.lineupDeckSection}>
'''

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

# 5. Fix closing tag of ScrollView
content = content.replace('</ScrollView>\n\n      {/* Full Event Details', '</Animated.ScrollView>\n\n      {/* Full Event Details')

# Write back
with open("src/app/(tabs)/index.tsx", "w") as f:
    f.write(content)

