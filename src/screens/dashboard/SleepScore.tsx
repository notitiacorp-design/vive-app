import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// ---------------------------------------------------------------------------
// ThÃ¨me centralisÃ©
// ---------------------------------------------------------------------------
const Theme = {
  colors: {
    scoreExcellent: '#4ADE80',
    scoreGood: '#3D8BFF',
    scoreGoodLight: '#7BB8FF',
    scoreMedium: '#FBBF24',
    scoreLow: '#F87171',
    trendUp: '#4ADE80',
    trendDown: '#F87171',
    trendStable: '#A8A8C0',
    textPrimary: '#E8E8F0',
    textSecondary: '#A8A8C0',
    trackBackground: '#1C1C28',
    dotInactive: '#1C1C28',
    dotBorderInactive: '#2A2A3C',
  },
  spacing: {
    xs: 2,
    sm: 3,
    md: 6,
    lg: 8,
    xl: 16,
  },
  borderRadius: {
    dot: 3,
  },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Trend = 'up' | 'down' | 'stable';

type SleepScoreProps = {
  score: number;
  trend: Trend;
  size?: number;
};

// ---------------------------------------------------------------------------
// Helpers (pures, dÃ©finies une seule fois hors du composant)
// ---------------------------------------------------------------------------
function getTrendIcon(trend: Trend): string {
  if (trend === 'up') return 'â';
  if (trend === 'down') return 'â';
  return 'â';
}

function getTrendColor(trend: Trend): string {
  if (trend === 'up') return Theme.colors.trendUp;
  if (trend === 'down') return Theme.colors.trendDown;
  return Theme.colors.trendStable;
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Bon';
  if (score >= 55) return 'Moyen';
  return 'Ã amÃ©liorer';
}

function getScoreColor(score: number): string {
  if (score >= 85) return Theme.colors.scoreExcellent;
  if (score >= 70) return Theme.colors.scoreGood;
  if (score >= 55) return Theme.colors.scoreMedium;
  return Theme.colors.scoreLow;
}

const SCORE_THRESHOLDS = [20, 40, 60, 80, 100] as const;

// ---------------------------------------------------------------------------
// AnimatedCircle
// ---------------------------------------------------------------------------
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ---------------------------------------------------------------------------
// Composant interne : indicateurs de score (points)
// ---------------------------------------------------------------------------
type ScoreDotsProps = {
  score: number;
  scoreColor: string;
};

const ScoreDots: React.FC<ScoreDotsProps> = React.memo(({ score, scoreColor }) => (
  <View style={styles.dotsContainer}>
    {SCORE_THRESHOLDS.map((threshold) => {
      const active = score >= threshold;
      return (
        <View
          key={threshold}
          style={[
            styles.dot,
            {
              backgroundColor: active ? scoreColor : Theme.colors.dotInactive,
              borderColor: active ? scoreColor : Theme.colors.dotBorderInactive,
            },
          ]}
        />
      );
    })}
  </View>
));

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
const SleepScore: React.FC<SleepScoreProps> = React.memo(
  ({ score, trend, size = 160 }) => {
    // --- GÃ©omÃ©trie SVG (mÃ©moÃ¯sÃ©e) ---
    const geometry = useMemo(() => {
      const strokeWidth = size * 0.075;
      const radius = (size - strokeWidth) / 2;
      const circumference = 2 * Math.PI * radius;
      const cx = size / 2;
      const cy = size / 2;
      return { strokeWidth, radius, circumference, cx, cy };
    }, [size]);

    const { strokeWidth, radius, circumference, cx, cy } = geometry;

    // --- Valeurs dÃ©rivÃ©es (mÃ©moÃ¯sÃ©es) ---
    const scoreColor = useMemo(() => getScoreColor(score), [score]);
    const scoreLabel = useMemo(() => getScoreLabel(score), [score]);
    const trendColor = useMemo(() => getTrendColor(trend), [trend]);
    const trendIcon = useMemo(() => getTrendIcon(trend), [trend]);
    const gradientEndColor = useMemo(
      () =>
        scoreColor === Theme.colors.scoreGood
          ? Theme.colors.scoreGoodLight
          : scoreColor,
      [scoreColor],
    );
    const roundedScore = useMemo(() => Math.round(score), [score]);

    // --- Animation ---
    const animatedValue = useRef(new Animated.Value(0)).current;

    // Note : useNativeDriver doit rester Ã  false car strokeDashoffset est une
    // propriÃ©tÃ© SVG non prise en charge par le thread natif d'animation React Native.
    // Pour de meilleures performances, envisager react-native-reanimated qui offre
    // un support plus complet via worklets.
    const strokeDashoffsetAnim = useMemo(
      () =>
        animatedValue.interpolate({
          inputRange: [0, 100],
          outputRange: [
            circumference,
            circumference - (circumference * Math.min(score, 100)) / 100,
          ],
        }),
      // animatedValue est une ref stable, on dÃ©pend de score et circumference
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [score, circumference],
    );

    useEffect(() => {
      animatedValue.setValue(0);
      // On stocke la rÃ©fÃ©rence de l'animation pour pouvoir l'arrÃªter au dÃ©montage
      const anim = Animated.timing(animatedValue, {
        toValue: score,
        duration: 1200,
        // useNativeDriver doit rester Ã  false : strokeDashoffset est une propriÃ©tÃ©
        // SVG non supportÃ©e par le driver natif.
        useNativeDriver: false,
      });
      anim.start();
      // Nettoyage : on stoppe l'animation si le composant est dÃ©montÃ© avant la fin
      return () => anim.stop();
      // animatedValue est une ref stable â pas besoin de la lister
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [score]);

    // --- Styles dynamiques (mÃ©moÃ¯sÃ©s) ---
    const containerStyle = useMemo(
      () => [styles.svgContainer, { width: size, height: size }],
      [size],
    );

    const scoreFontSize = useMemo(() => size * 0.22, [size]);
    const scoreLineHeight = useMemo(() => size * 0.26, [size]);
    const trendFontSize = useMemo(() => size * 0.1, [size]);
    const labelFontSize = useMemo(() => size * 0.08, [size]);

    const scoreTextStyle = useMemo(
      () => ([
        styles.scoreText,
        { fontSize: scoreFontSize, lineHeight: scoreLineHeight },
      ]),
      [scoreFontSize, scoreLineHeight],
    );

    const trendTextStyle = useMemo(
      () => ([styles.trendText, { color: trendColor, fontSize: trendFontSize }]),
      [trendColor, trendFontSize],
    );

    const labelTextStyle = useMemo(
      () => ([styles.labelDynamic, { fontSize: labelFontSize }]),
      [labelFontSize],
    );

    // --- Render ---
    return (
      <View style={styles.wrapper}>
        {/* Cercle SVG animÃ© */}
        <View style={containerStyle}>
          <Svg width={size} height={size}>
            <Defs>
              <LinearGradient
                id="scoreGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={scoreColor} stopOpacity="1" />
                <Stop
                  offset="100%"
                  stopColor={gradientEndColor}
                  stopOpacity="0.7"
                />
              </LinearGradient>
            </Defs>

            {/* Piste de fond */}
            <Circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="transparent"
              stroke={Theme.colors.trackBackground}
              strokeWidth={strokeWidth}
            />

            {/* Arc de progression animÃ© */}
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

          {/* Contenu central */}
          <View style={styles.centerContent}>
            <Text style={scoreTextStyle}>{roundedScore}</Text>
            <View style={styles.trendRow}>
              <Text style={trendTextStyle}>{trendIcon}</Text>
              <Text style={labelTextStyle}>{scoreLabel}</Text>
            </View>
          </View>
        </View>

        {/* Indicateurs de seuils */}
        <ScoreDots score={score} scoreColor={scoreColor} />

        {/* LibellÃ© */}
        <Text style={styles.footerLabel}>Score Sommeil</Text>
      </View>
    );
  },
);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'relative',
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    color: Theme.colors.textPrimary,
    fontWeight: '800',
    letterSpacing: -1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.xs,
  },
  trendText: {
    fontWeight: '700',
    marginRight: Theme.spacing.sm,
  },
  labelDynamic: {
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginTop: Theme.spacing.xl,
    gap: Theme.spacing.md,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Theme.borderRadius.dot,
    borderWidth: 1,
  },
  footerLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: Theme.spacing.lg,
    fontWeight: '500',
  },
});

export default SleepScore;
