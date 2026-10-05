import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import type { Feature } from '../upsell/entitlements';
import { colors } from '../theme';

/** Badge colour for each Pro feature on the paywall. */
export const FEATURE_TINT: Record<Feature, string> = {
  cinematic: colors.accent,
  asteroids: colors.blue,
  aftermath: colors.magenta,
  ads: '#7C86A6',
  compositions: colors.yellow,
  burns: '#FF4D6A',
  presets: '#3DDC97',
};

/** A small line icon for each Pro feature, drawn in white on its tinted badge. */
export function FeatureGlyph({ feature, size = 20, color = '#FFFFFF' }: { feature: Feature; size?: number; color?: string }) {
  const s = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {feature === 'cinematic' && (
        <>
          <Rect x={3} y={6} width={13} height={12} rx={2.5} {...s} />
          <Path d="M16 10.5 L21 7.5 V16.5 L16 13.5" {...s} />
        </>
      )}
      {feature === 'asteroids' && (
        <>
          <Circle cx={12} cy={12} r={4} {...s} />
          <Ellipse cx={12} cy={12} rx={10} ry={4.5} transform="rotate(-25 12 12)" {...s} />
          <Circle cx={20} cy={7.8} r={1.6} fill={color} />
        </>
      )}
      {feature === 'aftermath' && (
        <>
          <Circle cx={12} cy={12} r={9} {...s} />
          <Path d="M12 7 V12 L15.5 14" {...s} />
        </>
      )}
      {feature === 'ads' && (
        <>
          <Rect x={3} y={6} width={18} height={12} rx={2.5} {...s} />
          <Line x1={4} y1={20} x2={20} y2={4} {...s} />
        </>
      )}
      {feature === 'compositions' && (
        <>
          <Circle cx={9} cy={12} r={5.5} {...s} />
          <Circle cx={16} cy={12} r={5.5} {...s} />
        </>
      )}
      {feature === 'burns' && (
        <Path d="M12 3 C13 7 17 8.5 17 13.5 A5 5 0 0 1 7 13.5 C7 11 8.5 9.5 9.5 8.5 C9.8 10.5 11 11.5 12 11.5 C12 8.5 11 6 12 3 Z" {...s} />
      )}
      {feature === 'presets' && (
        <Path d="M12 3.5 L14.6 9 L20.5 9.6 L16 13.6 L17.3 19.5 L12 16.5 L6.7 19.5 L8 13.6 L3.5 9.6 L9.4 9 Z" {...s} />
      )}
    </Svg>
  );
}
