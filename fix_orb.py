with open("src/app/(tabs)/index.tsx", "r") as f:
    content = f.read()

content = content.replace(
'''  satelliteOrb: {
    width: px(34),
    height: px(34),
    alignItems: "center",
    justifyContent: "center",''',
'''  satelliteOrb: {
    width: px(34),
    height: px(34),
    borderRadius: px(17),
    borderWidth: 1.8,
    alignItems: "center",
    justifyContent: "center",''')

content = content.replace(
'''  satelliteOrbActive: {
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 14,
  },''',
'''  satelliteOrbActive: {
    transform: [{ scale: 1.15 }],
    borderWidth: 2.4,
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 14,
  },''')

with open("src/app/(tabs)/index.tsx", "w") as f:
    f.write(content)
