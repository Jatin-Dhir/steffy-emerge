import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import Colors from '../constants/Colors';

const VIEWBOX_WIDTH = 400;
const VIEWBOX_HEIGHT = 900;
const SWIRL_PATH_1 = [
  'M 0 80',
  'C 80 40, 200 120, 320 60',
  'C 400 20, 380 200, 300 280',
  'C 220 360, 100 320, 20 400',
  'C -60 480, 40 560, 180 620',
  'C 320 680, 400 760, 350 850',
].join(' ');
const SWIRL_PATH_2 = [
  'M 400 0',
  'C 280 80, 120 160, 80 280',
  'C 40 400, 160 500, 300 540',
  'C 380 560, 400 640, 320 750',
].join(' ');

// Ribbon 3D: draw order = shadow (back), main, highlight (front)
const RIBBON_SHADOW = { stroke: Colors.ribbonShadow, width: 7 };
const RIBBON_MAIN = { stroke: Colors.ribbonMain, width: 4.5 };
const RIBBON_HIGHLIGHT = { stroke: Colors.ribbonHighlight, width: 2 };

const PARALLAX_1 = 0.72;
const PARALLAX_2 = 0.48;
const ROTATE_PER_SCROLL = 0.12;
const IDLE_AMPLITUDE = 40;
const IDLE_DURATION = 5000;
const IDLE_ROTATE = 2;

interface SwirlBackgroundProps {
  scrollY?: SharedValue<number>;
}

function RibbonPath({
  d,
  translateX = 0,
  translateY = 0,
}: {
  d: string;
  translateX?: number;
  translateY?: number;
}) {
  return (
    <>
      <G transform={`translate(${translateX + 2}, ${translateY + 2})`}>
        <Path
          d={d}
          fill="none"
          stroke={RIBBON_SHADOW.stroke}
          strokeWidth={RIBBON_SHADOW.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
      <Path
        d={d}
        fill="none"
        stroke={RIBBON_MAIN.stroke}
        strokeWidth={RIBBON_MAIN.width}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <G transform={`translate(${translateX - 1}, ${translateY - 1})`}>
        <Path
          d={d}
          fill="none"
          stroke={RIBBON_HIGHLIGHT.stroke}
          strokeWidth={RIBBON_HIGHLIGHT.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>
    </>
  );
}

export default function SwirlBackground({ scrollY }: SwirlBackgroundProps) {
  const idle = useSharedValue(0);
  const idle2 = useSharedValue(0);

  useEffect(() => {
    idle.value = withRepeat(
      withTiming(1, { duration: IDLE_DURATION, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    idle2.value = withRepeat(
      withTiming(1, { duration: IDLE_DURATION * 1.2, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => {
    const scroll = scrollY?.value ?? 0;
    const idleY = interpolate(idle.value, [0, 1], [0, IDLE_AMPLITUDE]);
    const idleRot = interpolate(idle.value, [0, 1], [-IDLE_ROTATE, IDLE_ROTATE]);
    return {
      transform: [
        { translateY: -scroll * PARALLAX_1 + idleY },
        { rotate: `${scroll * ROTATE_PER_SCROLL + idleRot}deg` },
      ],
    };
  });

  const animatedStyle2 = useAnimatedStyle(() => {
    const scroll = scrollY?.value ?? 0;
    const idleY = interpolate(idle2.value, [0, 1], [-IDLE_AMPLITUDE * 0.7, IDLE_AMPLITUDE * 0.7]);
    const idleRot = interpolate(idle2.value, [0, 1], [IDLE_ROTATE, -IDLE_ROTATE]);
    return {
      transform: [
        { translateY: -scroll * PARALLAX_2 + idleY },
        { rotate: `${-scroll * ROTATE_PER_SCROLL * 0.8 + idleRot}deg` },
      ],
    };
  });

  const { width: W, height: H } = Dimensions.get('window');
  const svgW = W + 120;
  const svgH = H * 1.4;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.svgWrap, animatedStyle1, { left: -60, top: -H * 0.15 }]}>
        <Svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          style={styles.svg}
        >
          <RibbonPath d={SWIRL_PATH_1} />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.svgWrap, animatedStyle2, { left: -80, top: -H * 0.1 }]}>
        <Svg
          width={svgW}
          height={svgH}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid slice"
          style={styles.svg}
        >
          <RibbonPath d={SWIRL_PATH_2} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  svgWrap: {
    position: 'absolute',
  },
  svg: {
    opacity: 1,
  },
});
