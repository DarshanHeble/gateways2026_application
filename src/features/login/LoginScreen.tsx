import { useCallback } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";

import { colors, fonts, type } from "@/theme/tokens";
import { px, SCREEN_HEIGHT } from "@/theme/scale";
import { Bevel } from "@/components/pixel/Primitives";
import { PlankFill } from "@/components/pixel/Fills";
import { PixelToast } from "@/components/pixel/PixelToast";
import { ParallaxScene } from "./scene/ParallaxScene";
import { NoticeBoard } from "./NoticeBoard";
import { GateTransition, useGateTransition } from "./GateTransition";
import { useLoginForm } from "./useLoginForm";

/**
 * The little plaque staked into the near terrace, just below the board.
 * Flows in normal layout right after the board (rather than at a fixed
 * distance from the screen bottom) so it can never overlap the board's
 * actual content — text line-heights render slightly taller natively than
 * they did in the source CSS, so the board's real height isn't a fixed
 * constant we could safely position against independently.
 */
function FooterPlaque() {
  return (
    <View style={styles.plaque} pointerEvents="none">
      <PlankFill />
      <Bevel
        top={{ color: "rgba(255,225,180,0.18)", size: 3 }}
        bottom={{ color: "rgba(0,0,0,0.45)", size: 4 }}
      />
      <Text style={styles.plaqueText}>CHRIST UNIVERSITY  ·  BANGALORE</Text>
    </View>
  );
}

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();

  const gate = useGateTransition(useCallback(() => router.replace("/home"), []));
  const form = useLoginForm(gate.play);

  const boardStyle = useAnimatedStyle(() => ({
    // Lift the board just enough to clear the keyboard, never further.
    transform: [{ translateY: -Math.min(keyboard.height.value, SCREEN_HEIGHT * 0.34) }],
  }));

  return (
    <View style={styles.root}>
      <ParallaxScene sceneStyle={gate.sceneStyle} />

      <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} accessible={false}>
        <Animated.View
          style={[
            styles.boardHolder,
            { paddingTop: px(128) + insets.top * 0.5, paddingBottom: insets.bottom + px(16) },
            boardStyle,
          ]}
        >
          <NoticeBoard
            email={form.email}
            onEmail={form.setEmail}
            password={form.password}
            onPassword={form.setPassword}
            busy={form.busy}
            errorField={form.errorField}
            errorNonce={form.errorNonce}
            passwordRef={form.passwordRef}
            onSubmit={form.submit}
            onGoogle={() => form.say("GOOGLE PORTAL OPENS IN THE NEXT BUILD")}
            onForgot={() => form.say("RAVEN SENT · CHECK YOUR SCROLLS")}
          />
          <FooterPlaque />
        </Animated.View>
      </Pressable>

      <PixelToast message={form.toast} bottom={112} />

      <GateTransition open={gate.open} flash={gate.flash} reduced={gate.reduced} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.stage, overflow: "hidden" },
  boardHolder: { alignItems: "center" },
  plaque: {
    marginTop: px(24),
    paddingVertical: px(5),
    paddingHorizontal: px(9),
    boxShadow: `0 ${px(4)}px 0 rgba(0,0,0,0.4)`,
  },
  plaqueText: {
    fontFamily: fonts.pixel,
    fontSize: px(type.plaque.size),
    letterSpacing: px(type.plaque.tracking),
    color: type.plaque.color,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: px(2) },
    textShadowRadius: 0,
  },
});
