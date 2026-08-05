import { View } from "react-native";

import { colors } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Bevel } from "@/components/pixel/Primitives";

const R = colors.google.red;
const Y = colors.google.yellow;
const B = colors.google.blue;
const G = colors.google.green;
const _ = null;

/** The Google mark rasterised onto a 7x7 grid, exactly as in the design. */
const GRID: (string | null)[] = [
  _, _, R, R, R, _, _,
  _, R, R, _, _, R, R,
  Y, Y, _, _, _, _, _,
  Y, Y, _, _, B, B, B,
  Y, Y, _, _, _, _, B,
  _, G, G, _, _, _, B,
  _, _, G, G, G, G, _,
];

const CELL = 3;

export function GoogleMark() {
  return (
    <View style={{ padding: px(4), backgroundColor: colors.google.chip }}>
      <Bevel
        top={{ color: "rgba(255,255,255,0.9)", size: 2 }}
        left={{ color: "rgba(255,255,255,0.9)", size: 2 }}
        bottom={{ color: "rgba(120,110,95,0.45)", size: 2 }}
        right={{ color: "rgba(120,110,95,0.45)", size: 2 }}
      />
      <View style={{ width: px(CELL * 7), height: px(CELL * 7), flexDirection: "row", flexWrap: "wrap" }}>
        {GRID.map((color, i) => (
          <View
            key={i}
            style={{
              width: px(CELL),
              height: px(CELL),
              backgroundColor: color ?? "transparent",
            }}
          />
        ))}
      </View>
    </View>
  );
}
