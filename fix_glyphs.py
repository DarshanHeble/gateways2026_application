with open("src/app/(tabs)/index.tsx", "r") as f:
    content = f.read()

import re

new_render = '''function renderMiniGlyph(category: string, color: string, isSelected: boolean) {
  const bg = isSelected ? "#070b12" : color;
  switch (category) {
    case "Pill":
      return <View style={{ width: 8, height: 16, borderRadius: 4, backgroundColor: bg }} />;
    case "Squircle":
    case "Flower":
      return <View style={{ width: 13, height: 13, borderRadius: 4.5, backgroundColor: bg }} />;
    case "Gem":
      return (
        <View
          style={{
            width: 11,
            height: 11,
            transform: [{ rotate: "45deg" }],
            borderRadius: 1.5,
            backgroundColor: bg,
          }}
        />
      );
    case "Burst":
      return <Ionicons name="sparkles" size={13} color={bg} />;
    case "Circle":
    default:
      return <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: bg }} />;
  }
}'''

content = re.sub(r'function renderMiniGlyph.*?^}', new_render, content, flags=re.MULTILINE | re.DOTALL)

with open("src/app/(tabs)/index.tsx", "w") as f:
    f.write(content)
