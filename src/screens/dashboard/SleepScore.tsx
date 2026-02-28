import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type SleepScoreProps = {
  score: number;
  trend: 'up' | 'down' | 'stable';
  size?: number;
};

function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}

function getTrendColor(trend: 'up' | 'down' | 'stable'): string {
  if (trend === 'up') return '#4ADE80';
  if (trend === 'down') return '#F87171';
  return '#A8A8C0';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Bon';
  if (score >= 55) return 'Moyen';
  return 'À améliorer';
}

function getScoreColor(score: number): string {
  if (score >= 85) return '#4ADE80';
  if (score >= 70) return '#3D8BFF';
  if (score >= 55) return '#FBBF24';
  return '#F87171';
}

const SleepScore: React.FC<SleepScoreProps> = ({
  score,
  trend,
  size = 160,
}) => {
  const strokeWidth = size * 0.075;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const animatedValue = useRef(new Animated.Value(0)).current;
  const strokeDashoffsetAnim = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, circumference - (circumference * Math.min(score, 100)) / 100],
  });

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const trendColor = getTrendColor(trend);
  const trendIcon = getTrendIcon(trend);
  const scoreColor = getScoreColor(score);
  const scoreLabel = getScoreLabel(score);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'relative', width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={scoreColor} stopOpacity="1" />
              <Stop offset="100%" stopColor={scoreColor === '#3D8BFF' ? '#7BB8FF' : scoreColor} stopOpacity="0.7" />
            </LinearGradient>
          </Defs>

          {/* Background track */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke="#1C1C28"
            strokeWidth={strokeWidth}
          />

          {/* Animated progress arc */}
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={radius}
            fill="transparent"
            stroke="url(#scoreGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffsetAnim}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        </Svg>

        {/* Center content */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: '#E8E8F0',
              fontSize: size * 0.22,
              fontWeight: '800',
              letterSpacing: -1,
              lineHeight: size * 0.26,
            }}
          >
            {Math.round(score)}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text
              style={{
                color: trendColor,
                fontSize: size * 0.1,
                fontWeight: '700',
                marginRight: 3,
              }}
            >
              {trendIcon}
            </Text>
            <Text
              style={{
                color: '#A8A8C0',
                fontSize: size * 0.08,
                fontWeight: '500',
              }}
            >
              {scoreLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Outer score dots */}
      <View
        style={{
          flexDirection: 'row',
          marginTop: 16,
          gap: 6,
          alignItems: 'center',
        }}
      >
        {[20, 40, 60, 80, 100].map((threshold) => (
          <View
            key={threshold}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: score >= threshold ? scoreColor : '#1C1C28',
              borderWidth: 1,
              borderColor: score >= threshold ? scoreColor : '#2A2A3C',
            }}
          />
        ))}
      </View>

      <Text
        style={{
          color: '#A8A8C0',
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginTop: 8,
          fontWeight: '500',
        }}
      >
        Score Sommeil
      </Text>
    </View>
  );
};

export default SleepScore;
