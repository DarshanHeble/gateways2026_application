with open("src/app/(tabs)/index.tsx", "r") as f:
    content = f.read()

content = content.replace(
    '<ScrollView\n        style={styles.scroll}',
    '<Animated.ScrollView\n        style={styles.scroll}\n        onScroll={scrollHandler}\n        scrollEventThrottle={16}'
)

with open("src/app/(tabs)/index.tsx", "w") as f:
    f.write(content)
