import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { colors } from '../theme';

interface IconProps {
  size?: number;
  color?: string;
}

const stroke = (color: string) => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function BackIcon({ size = 22, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Polyline points="15 18 9 12 15 6" />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Circle cx="11" cy="11" r="7" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  );
}

export function ShareIcon({ size = 22, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Circle cx="18" cy="5" r="3" />
      <Circle cx="6" cy="12" r="3" />
      <Circle cx="18" cy="19" r="3" />
      <Line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
      <Line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </Svg>
  );
}

export function LockIcon({ size = 14, color = colors.dim }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Rect x="3" y="11" width="18" height="10" rx="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
}

export function CloseIcon({ size = 22, color = colors.muted }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Line x1="18" y1="6" x2="6" y2="18" />
      <Line x1="6" y1="6" x2="18" y2="18" />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color = colors.accent }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  );
}

export function LocateIcon({ size = 20, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...stroke(color)}>
      <Circle cx="12" cy="12" r="7" />
      <Circle cx="12" cy="12" r="2" />
      <Line x1="12" y1="2" x2="12" y2="5" />
      <Line x1="12" y1="19" x2="12" y2="22" />
      <Line x1="2" y1="12" x2="5" y2="12" />
      <Line x1="19" y1="12" x2="22" y2="12" />
    </Svg>
  );
}
