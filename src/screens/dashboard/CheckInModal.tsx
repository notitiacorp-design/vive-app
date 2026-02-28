import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type CheckInValues = {
  energy: number;
  sleep: number;
  stress: number;
};

type CheckInModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: CheckInValues) => void;
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
    label: 'Énergie',
    emoji: '⚡',
    lowLabel: 'Épuisé',
    highLabel: 'Plein d\'énergie',
    color: '#FBBF24',
  },
  {
    key: 'sleep',
    label: 'Qualité du sommeil',
    emoji: '🌙',
    lowLabel: 'Mauvais',
    highLabel: 'Excellent',
    color: '#3D8BFF',
  },
  {
    key: 'stress',
    label: 'Niveau de stress',
    emoji: '🌊',
    lowLabel: 'Zen',
    highLabel: 'Très stressé',
    color: '#F87171',
  },
];

const SLIDER_TRACK_WIDTH = SCREEN_WIDTH - 48 - 48;

type CustomSliderProps = {
  value: number;
  onChange: (value: number) => void;
  color: string;
  min?: number;
  max?: number;
};

const CustomSlider: React.FC<CustomSliderProps> = ({
  value,
  onChange,
  color,
  min = 1,
  max = 10,
}) => {
  const trackWidth = SLIDER_TRACK_WIDTH;
  const thumbSize = 26;
  const trackHeight = 6;

  const progress = (value - min) / (max - min);
  const thumbPosition = progress * (trackWidth - thumbSize);

  const panX = useRef(new Animated.Value(thumbPosition)).current;
  const lastX = useRef(thumbPosition);

  const clamp = (val: number, lo: number, hi: number) =>
    Math.min(Math.max(val, lo), hi);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        panX.extractOffset();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = clamp(gestureState.dx, -lastX.current, trackWidth - thumbSize - lastX.current);
        panX.setValue(newX);
        const rawPosition = clamp(lastX.current + gestureState.dx, 0, trackWidth - thumbSize);
        const rawProgress = rawPosition / (trackWidth - thumbSize);
        const newValue = Math.round(rawProgress * (max - min) + min);
        onChange(clamp(newValue, min, max));
      },
      onPanResponderRelease: (_, gestureState) => {
        panX.flattenOffset();
        const rawPosition = clamp(lastX.current + gestureState.dx, 0, trackWidth - thumbSize);
        lastX.current = rawPosition;
        const rawProgress = rawPosition / (trackWidth - thumbSize);
        const newValue = Math.round(rawProgress * (max - min) + min);
        const finalValue = clamp(newValue, min, max);
        onChange(finalValue);
        const snappedPosition = ((finalValue - min) / (max - min)) * (trackWidth - thumbSize);
        lastX.current = snappedPosition;
        panX.setValue(snappedPosition);
      },
    })
  ).current;

  // Sync external value changes to position
  const externalProgress = (value - min) / (max - min);
  const externalThumbPos = externalProgress * (trackWidth - thumbSize);

  const fillWidth = externalThumbPos + thumbSize / 2;

  return (
    <View
      style={{
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 0,
      }}
    >
      {/* Track background */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: trackHeight,
          backgroundColor: '#1C1C28',
          borderRadius: trackHeight / 2,
        }}
      />

      {/* Fill */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: fillWidth,
          height: trackHeight,
          backgroundColor: color,
          borderRadius: trackHeight / 2,
          opacity: 0.9,
        }}
      />

      {/* Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            position: 'absolute',
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            backgroundColor: color,
            shadowColor: color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 6,
            left: externalThumbPos,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.2)',
          },
        ]}
      >
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.6)',
          }}
        />
      </Animated.View>
    </View>
  );
};

const CheckInModal: React.FC<CheckInModalProps> = ({ visible, onClose, onSubmit }) => {
  const [values, setValues] = useState<CheckInValues>({
    energy: 5,
    sleep: 5,
    stress: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (key: keyof CheckInValues) => (value: number) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    []
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

  function getEmojiForValue(value: number, key: keyof CheckInValues): string {
    if (key === 'stress') {
      if (value <= 3) return '😌';
      if (value <= 6) return '😐';
      return '😰';
    }
    if (value <= 3) return '😴';
    if (value <= 6) return '😐';
    return '😄';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(8,8,16,0.85)',
            justifyContent: 'flex-end',
          }}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={{
                backgroundColor: '#111118',
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingBottom: Platform.OS === 'ios' ? 40 : 28,
                borderTopWidth: 1,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: '#1C1C28',
                overflow: 'hidden',
              }}
            >
              {/* Handle bar */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#2A2A3C',
                  }}
                />
              </View>

              <ScrollView
                style={{ maxHeight: 560 }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              >
                {/* Header */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 28,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: '#E8E8F0',
                        fontSize: 22,
                        fontWeight: '700',
                        letterSpacing: -0.5,
                      }}
                    >
                      Check-in rapide
                    </Text>
                    <Text
                      style={{
                        color: '#A8A8C0',
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      Comment vous sentez-vous ?
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleClose}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#1C1C28',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#2A2A3C',
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={{ color: '#A8A8C0', fontSize: 16, lineHeight: 18 }}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Sliders */}
                {SLIDERS.map((slider) => {
                  const currentValue = values[slider.key];
                  return (
                    <View
                      key={slider.key}
                      style={{
                        marginBottom: 28,
                        backgroundColor: '#0D0D16',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1,
                        borderColor: '#1C1C28',
                      }}
                    >
                      {/* Slider header */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 16,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ fontSize: 20, marginRight: 10 }}>{slider.emoji}</Text>
                          <Text
                            style={{
                              color: '#E8E8F0',
                              fontSize: 15,
                              fontWeight: '600',
                            }}
                          >
                            {slider.label}
                          </Text>
                        </View>

                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: `${slider.color}1A`,
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderWidth: 1,
                            borderColor: `${slider.color}33`,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              marginRight: 4,
                            }}
                          >
                            {getEmojiForValue(currentValue, slider.key)}
                          </Text>
                          <Text
                            style={{
                              color: slider.color,
                              fontSize: 16,
                              fontWeight: '700',
                            }}
                          >
                            {currentValue}
                          </Text>
                          <Text
                            style={{
                              color: slider.color,
                              fontSize: 10,
                              fontWeight: '500',
                              opacity: 0.7,
                              marginLeft: 1,
                            }}
                          >
                            /10
                          </Text>
                        </View>
                      </View>

                      {/* Custom Slider */}
                      <CustomSlider
                        value={currentValue}
                        onChange={handleChange(slider.key)}
                        color={slider.color}
                        min={1}
                        max={10}
                      />

                      {/* Labels */}
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginTop: 8,
                        }}
                      >
                        <Text style={{ color: '#A8A8C0', fontSize: 11 }}>
                          {slider.lowLabel}
                        </Text>
                        <Text style={{ color: '#A8A8C0', fontSize: 11 }}>
                          {slider.highLabel}
                        </Text>
                      </View>
                    </View>
                  );
                })}

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: isSubmitting ? '#2A3A5C' : '#3D8BFF',
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: 'center',
                    marginTop: 4,
                    shadowColor: '#3D8BFF',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: isSubmitting ? 0 : 0.35,
                    shadowRadius: 16,
                    elevation: isSubmitting ? 0 : 8,
                  }}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <Text
                      style={{
                        color: '#A8A8C0',
                        fontSize: 16,
                        fontWeight: '600',
                      }}
                    >
                      Envoi en cours...
                    </Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>🚀</Text>
                      <Text
                        style={{
                          color: '#FFFFFF',
                          fontSize: 16,
                          fontWeight: '700',
                          letterSpacing: 0.3,
                        }}
                      >
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
};

export default CheckInModal;
