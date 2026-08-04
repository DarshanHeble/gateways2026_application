import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, type TextInput } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { colors, fonts, type } from "@/theme/tokens";
import { px } from "@/theme/scale";
import { Bevel, Block } from "@/components/pixel/Primitives";
import { BoardFill, PlankFill, StripeFill } from "@/components/pixel/Fills";
import { PixelButton } from "@/components/pixel/PixelButton";
import { PixelInput } from "@/components/pixel/PixelInput";
import { GoogleMark } from "./GoogleMark";
import type { LoginFieldError } from "./useLoginForm";

export const BOARD_WIDTH = 328;
export const BOARD_PADDING = 18;
export const BOARD_INNER = BOARD_WIDTH - BOARD_PADDING * 2;

const ENTER_HEIGHT = 44;
const GOOGLE_HEIGHT = 49;

/** Vertical saw grain over the planking: 2px lines every 15px, 1px every 7px. */
function BoardGrain() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <StripeFill color="rgba(0,0,0,0.16)" bar={2} gap={13} />
      <StripeFill color="rgba(255,255,255,0.05)" bar={1} gap={6} />
    </View>
  );
}

function Screw({ left, right }: { left?: number; right?: number }) {
  return (
    <Block t={8} l={left} r={right} w={8} h={8} bg={colors.stone.screw}>
      <Bevel
        top={{ color: "rgba(255,255,255,0.7)", size: 2 }}
        left={{ color: "rgba(255,255,255,0.7)", size: 2 }}
        bottom={{ color: "rgba(60,70,85,0.7)", size: 3 }}
        right={{ color: "rgba(60,70,85,0.7)", size: 3 }}
      />
    </Block>
  );
}

/** The green wash behind PARALLAX: `linear-gradient(90deg, t, rgba(33,201,122,.22), t)`. */
function ThemeWash() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="themeWash" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#21c97a" stopOpacity={0} />
            <Stop offset="50%" stopColor="#21c97a" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#21c97a" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#themeWash)" />
      </Svg>
    </View>
  );
}

function BusyLabel() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 260);
    return () => clearInterval(id);
  }, []);
  return <Text style={styles.enterLabel}>{".".repeat(step).padEnd(3, " ")}</Text>;
}

export type NoticeBoardProps = {
  email: string;
  onEmail: (v: string) => void;
  password: string;
  onPassword: (v: string) => void;
  busy: boolean;
  errorField: LoginFieldError;
  errorNonce: number;
  passwordRef: React.RefObject<TextInput | null>;
  onSubmit: () => void;
  onGoogle: () => void;
  onForgot: () => void;
};

export function NoticeBoard({
  email,
  onEmail,
  password,
  onPassword,
  busy,
  errorField,
  errorNonce,
  passwordRef,
  onSubmit,
  onGoogle,
  onForgot,
}: NoticeBoardProps) {
  return (
    <View style={styles.root}>
      {/* mounting beam */}
      <View style={styles.beam}>
        <PlankFill />
        <Bevel
          top={{ color: "rgba(255,225,180,0.2)", size: 3 }}
          bottom={{ color: "rgba(0,0,0,0.4)", size: 4 }}
        />
      </View>

      <View style={styles.panel}>
        <BoardFill />
        <BoardGrain />
        <Bevel
          top={{ color: "rgba(255,220,170,0.16)", size: 5 }}
          bottom={{ color: "rgba(0,0,0,0.42)", size: 6 }}
          left={{ color: "rgba(255,255,255,0.06)", size: 5 }}
          right={{ color: "rgba(0,0,0,0.3)", size: 5 }}
        />
        <Screw left={8} />
        <Screw right={8} />

        <View style={styles.content}>
          <Text style={styles.department}>DEPARTMENT OF COMPUTER SCIENCE</Text>
          <Text style={styles.wordmark}>GATEWAYS</Text>

          <View style={styles.yearRow}>
            <View style={styles.yearRule} />
            <Text style={styles.year}>2026</Text>
            <View style={styles.yearRule} />
          </View>

          <View style={styles.themeBand}>
            <ThemeWash />
            <Text style={styles.theme}>PARALLAX</Text>
          </View>

          <Text style={styles.tagline}>
            See reality from two perspectives at once: the physical world and its living digital
            mirror.
          </Text>

          <View style={styles.dashedRule}>
            <StripeFill color="rgba(255,220,170,0.22)" bar={6} gap={6} />
          </View>

          <Text style={styles.welcome}>WELCOME, ADVENTURER</Text>

          <PixelInput
            label="EMAIL"
            value={email}
            onChangeText={onEmail}
            placeholder="adventurer@christuniversity.in"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            editable={!busy}
            onSubmitEditing={() => passwordRef.current?.focus()}
            errorNonce={errorField === "email" ? errorNonce : 0}
          />

          <View style={{ height: px(9) }} />

          <PixelInput
            ref={passwordRef}
            label="PASSWORD"
            value={password}
            onChangeText={onPassword}
            placeholder="••••••••••"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            editable={!busy}
            onSubmitEditing={onSubmit}
            style={{ letterSpacing: px(2) }}
            errorNonce={errorField === "password" ? errorNonce : 0}
          />

          <Pressable
            onPress={onForgot}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            hitSlop={{ top: px(12), bottom: px(12), left: px(12), right: px(4) }}
            style={styles.forgotRow}
          >
            <Text style={styles.forgot}>FORGOT PASSWORD?</Text>
          </Pressable>

          <PixelButton
            width={BOARD_INNER}
            height={ENTER_HEIGHT}
            cut={6}
            shimmer
            disabled={busy}
            gradient={[
              [0, colors.cta.lit],
              [55, colors.cta.mid],
              [100, colors.cta.deep],
            ]}
            baseColor={colors.cta.base}
            baseDepth={7}
            bevelTop={{ color: "rgba(190,255,225,0.55)", size: 5 }}
            bevelBottom={{ color: "rgba(0,60,35,0.5)", size: 6 }}
            onPress={onSubmit}
            accessibilityLabel={busy ? "Signing in" : "Enter world, sign in"}
            style={{ marginTop: px(13) }}
          >
            {busy ? <BusyLabel /> : <Text style={styles.enterLabel}>ENTER WORLD</Text>}
          </PixelButton>

          <PixelButton
            width={BOARD_INNER}
            height={GOOGLE_HEIGHT}
            disabled={busy}
            gradient={[
              [0, colors.google.lit],
              [60, colors.google.mid],
              [100, colors.google.deep],
            ]}
            baseColor={colors.google.base}
            baseDepth={6}
            bevelTop={{ color: "rgba(255,246,224,0.7)", size: 4 }}
            bevelBottom={{ color: "rgba(90,66,36,0.45)", size: 5 }}
            onPress={onGoogle}
            accessibilityLabel="Continue with Google"
            style={{ marginTop: px(11) }}
          >
            <GoogleMark />
            <Text style={styles.googleLabel}>CONTINUE WITH GOOGLE</Text>
          </PixelButton>
        </View>
      </View>

      {/* legs */}
      <View style={styles.legs}>
        <View style={styles.leg}>
          <PlankFill />
          <Bevel right={{ color: "rgba(0,0,0,0.42)", size: 4 }} />
        </View>
        <View style={styles.leg}>
          <PlankFill />
          <Bevel right={{ color: "rgba(0,0,0,0.42)", size: 4 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: px(BOARD_WIDTH) },
  beam: {
    height: px(14),
    marginHorizontal: px(26),
  },
  panel: {
    paddingTop: px(16),
    paddingHorizontal: px(BOARD_PADDING),
    paddingBottom: px(18),
    backgroundColor: colors.board.base,
    boxShadow: `0 ${px(12)}px 0 rgba(0,0,0,0.35), 0 ${px(26)}px ${px(44)}px rgba(0,0,0,0.45)`,
  },
  content: { position: "relative" },

  department: {
    fontFamily: fonts.pixel,
    fontSize: px(type.department.size),
    letterSpacing: px(type.department.tracking),
    color: type.department.color,
    textAlign: "center",
  },
  wordmark: {
    fontFamily: fonts.pixelBold,
    fontSize: px(type.wordmark.size),
    lineHeight: px(34),
    letterSpacing: px(type.wordmark.tracking),
    color: type.wordmark.color,
    textAlign: "center",
    marginTop: px(7),
    textShadowColor: colors.gold.deepShadow,
    textShadowOffset: { width: 0, height: px(4) },
    textShadowRadius: 0,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: px(8),
    marginTop: px(7),
  },
  yearRule: { width: px(34), height: px(3), backgroundColor: colors.rule },
  year: {
    fontFamily: fonts.pixel,
    fontSize: px(type.year.size),
    letterSpacing: px(type.year.tracking),
    color: type.year.color,
    textShadowColor: "rgba(99,217,232,0.75)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: px(14),
  },
  themeBand: {
    marginTop: px(10),
    paddingVertical: px(6),
    justifyContent: "center",
  },
  theme: {
    fontFamily: fonts.pixel,
    fontSize: px(type.theme.size),
    letterSpacing: px(type.theme.tracking),
    color: type.theme.color,
    textAlign: "center",
    textShadowColor: "rgba(33,201,122,0.8)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: px(16),
  },
  tagline: {
    marginTop: px(9),
    fontFamily: fonts.body,
    fontSize: px(type.tagline.size),
    lineHeight: px(type.tagline.lineHeight),
    color: type.tagline.color,
    textAlign: "center",
  },
  dashedRule: {
    marginTop: px(13),
    marginBottom: px(11),
    height: px(2),
  },
  welcome: {
    fontFamily: fonts.pixel,
    fontSize: px(type.welcome.size),
    letterSpacing: px(type.welcome.tracking),
    color: type.welcome.color,
    textAlign: "center",
    marginBottom: px(11),
  },
  forgotRow: { alignSelf: "flex-end", marginTop: px(8) },
  forgot: {
    fontFamily: fonts.pixel,
    fontSize: px(type.link.size),
    letterSpacing: px(type.link.tracking),
    color: type.link.color,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.linkRule,
    borderStyle: "dotted",
  },
  enterLabel: {
    fontFamily: fonts.pixelBold,
    fontSize: px(type.cta.size),
    lineHeight: px(18),
    letterSpacing: px(type.cta.tracking),
    color: type.cta.color,
    textShadowColor: "rgba(255,255,255,0.35)",
    textShadowOffset: { width: 0, height: px(1) },
    textShadowRadius: 0,
  },
  googleLabel: {
    fontFamily: fonts.pixel,
    fontSize: px(type.ctaAlt.size),
    letterSpacing: px(type.ctaAlt.tracking),
    color: type.ctaAlt.color,
    marginLeft: px(9),
  },
  legs: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: px(22),
  },
  leg: { width: px(14), height: px(40) },
});
