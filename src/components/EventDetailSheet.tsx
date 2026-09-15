
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, PanResponder } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useM3Theme } from '@/theme/M3ThemeContext';
import { typography, fonts } from '@/theme/tokens';
import { EventItem } from '@/services/api';
import { px } from '@/theme/scale';
import { Dimensions } from 'react-native';
const { height: SCREEN_H } = Dimensions.get('window');

interface EventDetailSheetProps {
  visible: boolean;
  event: EventItem | null;
  onClose: () => void;
  onViewAction?: () => void; // Optional action if we want a generic button
}

export function EventDetailSheet({ visible, event, onClose, onViewAction }: EventDetailSheetProps) {
  const { theme } = useM3Theme();
  
  // Reanimated bottom sheet gesture
  const sheetY = useSharedValue(0);
  
  const handleClose = () => {
    sheetY.value = withSpring(SCREEN_H, { damping: 20, stiffness: 90 }, () => {
      runOnJS(onClose)();
    });
  };
  
  // Reset Y when modal opens
  React.useEffect(() => {
    if (visible) {
      sheetY.value = withSpring(0, { damping: 20, stiffness: 90 });
    } else {
      sheetY.value = SCREEN_H;
    }
  }, [visible, sheetY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy),
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            sheetY.value = gestureState.dy;
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 0.8) {
            handleClose();
          } else {
            sheetY.value = withSpring(0, { damping: 20, stiffness: 90 });
          }
        },
      }),
    [sheetY, handleClose]
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: sheetY.value }],
    };
  });

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          style={[
            styles.modalSheet,
            { borderColor: theme.rimBorder, backgroundColor: theme.surface },
            animatedStyle,
          ]}
        >
          {/* Draggable Header Drag Bar */}
          <View {...panResponder.panHandlers} style={styles.modalDragHandleZone}>
            <View style={[styles.modalDragBar, { backgroundColor: theme.primary, opacity: 0.8 }]} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalBadgePill, { backgroundColor: theme.primaryContainer }]}>
                <Text style={[styles.modalBadgeText, { color: theme.primary }]}>
                  {(event.type || "COMPETITION").toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceElevated }]} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={theme.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: px(60) }}>
            <Text style={[styles.modalMainTitle, { color: theme.text }]}>{event.title}</Text>
            {event.subtitle ? (
              <Text style={[styles.modalSubTitle, { color: theme.textDim }]}>{event.subtitle}</Text>
            ) : null}

            {/* Meta Chips */}
            <View style={styles.modalMetaRow}>
              <View style={[styles.modalMetaChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.modalMetaChipText, { color: theme.textDim }]}>📅 {event.date}</Text>
              </View>
              <View style={[styles.modalMetaChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                <Text style={[styles.modalMetaChipText, { color: theme.textDim }]}>
                  ⏰ {event.from_time} - {event.end_time || "TBA"}
                </Text>
              </View>
              {event.venue ? (
                <View style={[styles.modalMetaChip, { backgroundColor: theme.surfaceElevated, borderColor: theme.border }]}>
                  <Text style={[styles.modalMetaChipText, { color: theme.textDim }]}>📍 {event.venue}</Text>
                </View>
              ) : null}
            </View>

            {/* Overview */}
            <Text style={[styles.modalHeading, { color: theme.primary }]}>OVERVIEW</Text>
            <Text style={[styles.modalParagraph, { color: theme.textDim }]}>
              {event.description || "Compete against top participants across colleges."}
            </Text>

            {/* Prizes */}
            {event.prizes && (
              <>
                <Text style={[styles.modalHeading, { color: theme.primary }]}>PRIZES</Text>
                <View style={[styles.prizingContainer, { backgroundColor: theme.primaryContainer }]}>
                  {event.prizes.winner ? (
                    <Text style={[styles.prizingText, { color: theme.text }]}>🥇 1st: {event.prizes.winner}</Text>
                  ) : null}
                  {event.prizes.runner_up ? (
                    <Text style={[styles.prizingText, { color: theme.text }]}>🥈 2nd: {event.prizes.runner_up}</Text>
                  ) : null}
                  {event.prizes.second_runner_up ? (
                    <Text style={[styles.prizingText, { color: theme.text }]}>🥉 3rd: {event.prizes.second_runner_up}</Text>
                  ) : null}
                </View>
              </>
            )}

            {/* Rules */}
            {event.rules && event.rules.length > 0 && (
              <>
                <Text style={[styles.modalHeading, { color: theme.primary }]}>RULES & INFO</Text>
                <View style={styles.rulesList}>
                  {event.rules.map((rule, idx) => (
                    <View key={idx} style={styles.ruleItem}>
                      <View style={[styles.ruleBullet, { backgroundColor: theme.primary }]} />
                      <Text style={[styles.ruleText, { color: theme.textDim }]}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Optional Action Button */}
            {onViewAction && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.viewDetailsBtn, { backgroundColor: theme.primaryContainer, borderColor: theme.primary }]}
                onPress={onViewAction}
              >
                <Text style={[styles.viewDetailsBtnText, { color: theme.primary }]}>VIEW FULL DETAILS</Text>
                <Ionicons name="arrow-forward" size={13} color={theme.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    padding: px(20),
    maxHeight: "85%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalDragHandleZone: {
    paddingTop: px(2),
    paddingBottom: px(6),
  },
  modalDragBar: {
    width: px(40),
    height: px(4),
    borderRadius: px(2),
    alignSelf: "center",
    marginBottom: px(16),
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: px(12),
  },
  modalBadgePill: {
    paddingHorizontal: px(10),
    paddingVertical: px(4),
    borderRadius: px(8),
  },
  modalBadgeText: {
    fontFamily: typography.tag.fontFamily,
    fontSize: px(typography.tag.fontSize),
    letterSpacing: typography.tag.letterSpacing,
  },
  modalCloseBtn: {
    padding: px(6),
    borderRadius: px(12),
  },
  modalMainTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: px(typography.h2.fontSize),
    letterSpacing: typography.h2.letterSpacing,
    marginBottom: px(4),
  },
  modalSubTitle: {
    fontFamily: typography.subtitle.fontFamily,
    fontSize: px(typography.subtitle.fontSize),
    marginBottom: px(16),
  },
  modalMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: px(8),
    marginBottom: px(20),
  },
  modalMetaChip: {
    paddingHorizontal: px(10),
    paddingVertical: px(6),
    borderRadius: px(6),
    borderWidth: 1,
  },
  modalMetaChipText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: px(typography.caption.fontSize),
  },
  modalHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: px(14),
    letterSpacing: 1,
    marginTop: px(14),
    marginBottom: px(8),
  },
  modalParagraph: {
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
    lineHeight: px(typography.body.lineHeight),
    marginBottom: px(10),
  },
  prizingContainer: {
    padding: px(12),
    borderRadius: px(8),
    gap: px(4),
    marginBottom: px(10),
  },
  prizingText: {
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
  },
  rulesList: {
    marginTop: px(4),
    marginBottom: px(20),
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: px(8),
    paddingRight: px(12),
  },
  ruleBullet: {
    width: px(6),
    height: px(6),
    borderRadius: px(3),
    marginTop: px(6),
    marginRight: px(10),
  },
  ruleText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: px(typography.body.fontSize),
    lineHeight: px(typography.body.lineHeight),
  },
  viewDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: px(12),
    borderRadius: px(8),
    marginTop: px(10),
    borderWidth: 1,
    gap: px(6),
  },
  viewDetailsBtnText: {
    fontFamily: fonts.pixelBold,
    fontSize: px(13),
    letterSpacing: 0.5,
  }
});
