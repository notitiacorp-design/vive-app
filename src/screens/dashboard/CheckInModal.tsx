import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

// âââ ThÃ¨me âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const Theme = {
  colors: {
    background: 'rgba(8,8,16,0.85)',
    surface: '#111118',
    surfaceAlt: '#0D0D16',
    border: '#1C1C28',
    borderAlt: '#2A2A3C',
    textPrimary: '#E8E8F0',
    textSecondary: '#A8A8C0',
    white: '#FFFFFF',
    accent: '#3D8BFF',
    accentDisabled: '#2A3A5C',
    trackBg: '#1C1C28',
    thumbInner: 'rgba(255,255,255,0.6)',
    thumbBorder: 'rgba(255,255,255,0.2)',
    sliderEnergy: '#FBBF24',
    sliderSleep: '#3D8BFF',
    sliderStress: '#F87171',
  },
  radii: {
    sm: 4,
    md: 10,
    lg: 16,
    xl: 18,
    xxl: 28,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 28,
  },
};

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
type CheckInValues = {
  energy: number;
  sleep: number;
  stress: number;
};

type CheckInModalProps = {
  visible: boolean;
  onClose: () => void;
  // Issue 2 : onSubmit peut retourner Promise<void>
  onSubmit: (values: CheckInValues) => void | Promise<void>;
};

type SliderConfig = {
  key: keyof CheckInValues;
  label: string;
  emoji: string;
  lowLabel: string;
  highLabel: string;
  color: string;
};

const SLIDERS: SliderConfig[] = [
  {
    key: 'energy',
    label: 'Ãnergie',
    emoji: 'â¡',
    lowLabel: 'ÃpuisÃ©',
    highLabel: "Plein d'Ã©nergie",
    color: Theme.colors.sliderEnergy,
  },
  {
    key: 'sleep',
    label: 'QualitÃ© du sommeil',
    emoji: 'ð',
    lowLabel: 'Mauvais',
    highLabel: 'Excellent',
    color: Theme.colors.sliderSleep,
  },
  {
    key: 'stress',
    label: 'Niveau de stress',
    emoji: 'ð',
    lowLabel: 'Zen',
    highLabel: 'TrÃ¨s stressÃ©',
    color: Theme.colors.sliderStress,
  },
];

// âââ CustomSlider âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
type CustomSliderProps = {
  value: number;
  onChange: (value: number) => void;
  color: string;
  min?: number;
  max?: number;
  trackWidth: number;
};

const THUMB_SIZE = 26;
const TRACK_HEIGHT = 6;
const SLIDER_H_PADDING = 48;

const CustomSlider: React.FC<CustomSliderProps> = memo((
  { value, onChange, color, min = 1, max = 10, trackWidth },
) => {
  const clamp = (val: number, lo: number, hi: number): number =>
    Math.min(Math.max(val, lo), hi);

  const computeThumbPos = (v: number): number =>
    ((v - min) / (max - min)) * (trackWidth - THUMB_SIZE);

  const initialPos = computeThumbPos(value);
  const panX = useRef(new Animated.Value(initialPos)).current;
  const lastX = useRef(initialPos);

  // Issue 6 : ref pour Ã©viter closure pÃ©rimÃ©e sur onChange
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Issues 1 & 3 : synchroniser panX et lastX quand value change de l'extÃ©rieur
  useEffect(() => {
    const externalPos = computeThumbPos(value);
    panX.setValue(externalPos);
    lastX.current = externalPos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, min, max, trackWidth]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = clamp(
          gestureState.dx,
          -lastX.current,
          trackWidth - THUMB_SIZE - lastX.current,
        );
        panX.setValue(newX);
        const rawPosition = clamp(
          lastX.current + gestureState.dx,
          0,
          trackWidth - THUMB_SIZE,
        );
        const rawProgress = rawPosition / (trackWidth - THUMB_SIZE);
        const newValue = Math.round(rawProgress * (max - min) + min);
        // Issue 6 : appel via ref
        onChangeRef.current(clamp(newValue, min, max));
      },
      onPanResponderRelease: (_, gestureState) => {
        panX.flattenOffset();
        const rawPosition = clamp(
          lastX.current + gestureState.dx,
          0,
          trackWidth - THUMB_SIZE,
        );
        const rawProgress = rawPosition / (trackWidth - THUMB_SIZE);
        const newValue = Math.round(rawProgress * (max - min) + min);
        const finalValue = clamp(newValue, min, max);
        // Issue 6 : appel via ref
        onChangeRef.current(finalValue);
        const snappedPosition = ((finalValue - min) / (max - min)) * (trackWidth - THUMB_SIZE);
        lastX.current = snappedPosition;
        panX.setValue(snappedPosition);
      },
    }),
  ).current;

  const externalThumbPos = computeThumbPos(value);
  const fillWidth = externalThumbPos + THUMB_SIZE / 2;

  return (
    <View style={sliderStyles.container}>
      {/* Track arriÃ¨re-plan */}
      <View
        style={[
          sliderStyles.track,
          { backgroundColor: Theme.colors.trackBg },
        ]}
      />

      {/* Fill */}
      <View
        style={[
          sliderStyles.fill,
          { width: fillWidth, backgroundColor: color },
        ]}
      />

      {/* Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          sliderStyles.thumb,
          {
            left: externalThumbPos,
            backgroundColor: color,
            shadowColor: color,
            borderColor: Theme.colors.thumbBorder,
          },
        ]}
      >
        <View style={sliderStyles.thumbInner} />
      </Animated.View>
    </View>
  );
});

CustomSlider.displayName = 'CustomSlider';

// âââ CheckInModal âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const CheckInModal: React.FC<CheckInModalProps> = memo(
  ({ visible, onClose, onSubmit }) => {
    // Issue 7 : dimensions rÃ©actives via hook
    const { width: screenWidth } = useWindowDimensions();
    const trackWidth = screenWidth - SLIDER_H_PADDING * 2;

    const [values, setValues] = useState<CheckInValues>({
      energy: 5,
      sleep: 5,
      stress: 5,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = useCallback(
      (key: keyof CheckInValues) =>
        (value: number) => {
          setValues((prev) => ({ ...prev, [key]: value }));
        },
      [],
    );

    const handleSubmit = useCallback(async () => {
      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setIsSubmitting(false);
      }
    }, [values, onSubmit]);

    const handleClose = useCallback(() => {
      setValues({ energy: 5, sleep: 5, stress: 5 });
      onClose();
    }, [onClose]);

    const getEmojiForValue = useCallback(
      (value: number, key: keyof CheckInValues): string => {
        if (key === 'stress') {
          if (value <= 3) return 'ð';
          if (value <= 6) return 'ð';
          return 'ð°';
        }
        if (value <= 3) return 'ð´';
        if (value <= 6) return 'ð';
        return 'ð';
      },
      [],
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={modalStyles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  modalStyles.sheet,
                  {
                    paddingBottom:
                      Platform.OS === 'ios' ? 40 : Theme.spacing.xxl,
                  },
                ]}
              >
                {/* Handle bar */}
                <View style={modalStyles.handleContainer}>
                  <View style={modalStyles.handle} />
                </View>

                {/* Issue 5 : ScrollView sans scrollEnabled={false} pour petit Ã©cran */}
                <ScrollView
                  style={modalStyles.scroll}
                  contentContainerStyle={modalStyles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Header */}
                  <View style={modalStyles.header}>
                    <View>
                      <Text style={modalStyles.title}>Check-in rapide</Text>
                      <Text style={modalStyles.subtitle}>
                        Comment vous sentez-vous ?
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={handleClose}
                      style={modalStyles.closeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={modalStyles.closeBtnText}>â</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Sliders */}
                  {SLIDERS.map((slider) => {
                    const currentValue = values[slider.key];
                    return (
                      <View key={slider.key} style={modalStyles.sliderCard}>
                        {/* En-tÃªte slider */}
                        <View style={modalStyles.sliderHeader}>
                          <View style={modalStyles.sliderLabelRow}>
                            <Text style={modalStyles.sliderEmoji}>
                              {slider.emoji}
                            </Text>
                            <Text style={modalStyles.sliderLabel}>
                              {slider.label}
                            </Text>
                          </View>

                          <View
                            style={[
                              modalStyles.valueBadge,
                              {
                                backgroundColor: `${slider.color}1A`,
                                borderColor: `${slider.color}33`,
                              },
                            ]}
                          >
                            <Text style={modalStyles.valueBadgeEmoji}>
                              {getEmojiForValue(currentValue, slider.key)}
                            </Text>
                            <Text
                              style={[
                                modalStyles.valueBadgeNumber,
                                { color: slider.color },
                              ]}
                            >
                              {currentValue}
                            </Text>
                            <Text
                              style={[
                                modalStyles.valueBadgeSuffix,
                                { color: slider.color },
                              ]}
                            >
                              /10
                            </Text>
                          </View>
                        </View>

                        <CustomSlider
                          value={currentValue}
                          onChange={handleChange(slider.key)}
                          color={slider.color}
                          min={1}
                          max={10}
                          trackWidth={trackWidth}
                        />

                        <View style={modalStyles.sliderFooter}>
                          <Text style={modalStyles.sliderFooterText}>
                            {slider.lowLabel}
                          </Text>
                          <Text style={modalStyles.sliderFooterText}>
                            {slider.highLabel}
                          </Text>
                        </View>
                      </View>
                    );
                  })}

                  {/* Bouton soumettre */}
                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    style={[
                      modalStyles.submitBtn,
                      {
                        backgroundColor: isSubmitting
                          ? Theme.colors.accentDisabled
                          : Theme.colors.accent,
                        shadowOpacity: isSubmitting ? 0 : 0.35,
                        elevation: isSubmitting ? 0 : 8,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    {isSubmitting ? (
                      <Text style={modalStyles.submitBtnTextDisabled}>
                        Envoi en cours...
                      </Text>
                    ) : (
                      <View style={modalStyles.submitBtnContent}>
                        <Text style={modalStyles.submitBtnEmoji}>ð</Text>
                        <Text style={modalStyles.submitBtnText}>
                          Valider le check-in
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  },
);

CheckInModal.displayName = 'CheckInModal';

// âââ StyleSheet âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const sliderStyles = StyleSheet.create({
  container: {
    height: 44,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    opacity: 0.9,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.thumbInner,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Theme.colors.surface,
    borderTopLeftRadius: Theme.radii.xxl,
    borderTopRightRadius: Theme.radii.xxl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Theme.radii.sm / 2,
    backgroundColor: Theme.colors.borderAlt,
  },
  scroll: {
    maxHeight: 560,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xxl,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: Theme.spacing.xs,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: Theme.radii.xl,
    backgroundColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderAlt,
  },
  closeBtnText: {
    color: Theme.colors.textSecondary,
    fontSize: 16,
    lineHeight: 18,
  },
  sliderCard: {
    marginBottom: Theme.spacing.xxl,
    backgroundColor: Theme.colors.surfaceAlt,
    borderRadius: Theme.radii.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  sliderLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  valueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Theme.radii.md,
    paddingHorizontal: 10,
    paddingVertical: Theme.spacing.xs,
    borderWidth: 1,
  },
  valueBadgeEmoji: {
    fontSize: 14,
    marginRight: Theme.spacing.xs,
  },
  valueBadgeNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  valueBadgeSuffix: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.7,
    marginLeft: 1,
  },
  sliderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
  },
  sliderFooterText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
  },
  submitBtn: {
    borderRadius: Theme.radii.lg,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnEmoji: {
    fontSize: 16,
    marginRight: Theme.spacing.sm,
  },
  submitBtnText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  submitBtnTextDisabled: {
    color: Theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CheckInModal;
