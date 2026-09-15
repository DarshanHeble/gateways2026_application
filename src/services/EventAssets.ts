export const EVENT_IMAGES: Record<string, any> = {
  "24° shift": require("../../assets/images/events/24° Shift.png"),
  "alternate thesis": require("../../assets/images/events/ALTERNATE THESIS.svg"),
  "arcadia x": require("../../assets/images/events/ARCADIA X.png"),
  "deviation": require("../../assets/images/events/Deviation.png"),
  "in perspective": require("../../assets/images/events/IN PERSPECTIVE.svg"),
  "mystery block": require("../../assets/images/events/mystery block.svg"),
  "pixel paradox": require("../../assets/images/events/PIXEL PARADOX.svg"),
  "pixel quest": require("../../assets/images/events/PIXEL QUEST.png"),
  "promptx": require("../../assets/images/events/PROMPTX.svg"),
  "render rush": require("../../assets/images/events/RENDER RUSH.svg"),
  "the last commit": require("../../assets/images/events/The Last Commit.png"),
  "the twin directive": require("../../assets/images/events/THE TWIN DIRECTIVE.svg"),
  "twin protocol": require("../../assets/images/events/TWIN PROTOCOL.png"),
};

export const getEventImage = (title?: string): any => {
  if (!title) return null;
  const normalizedTitle = title.toLowerCase().trim();
  
  // Try exact match
  if (EVENT_IMAGES[normalizedTitle]) {
    return EVENT_IMAGES[normalizedTitle];
  }
  
  // Fuzzy match: check if the title contains any of the keys or vice versa
  for (const [key, value] of Object.entries(EVENT_IMAGES)) {
    if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
      return value;
    }
  }

  return null;
};
