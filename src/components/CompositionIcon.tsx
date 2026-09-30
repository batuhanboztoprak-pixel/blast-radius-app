import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

import type { Composition } from '../physics/impact';

/**
 * Each impactor has its own look, used on the asteroid screen and (colours) in
 * the strike: a lumpy cratered rock, a polished white-hot iron body, an icy
 * comet nucleus trailing a blue tail.
 */
export function CompositionIcon({ kind, size = 20 }: { kind: Composition; size?: number }) {
  const id = `${kind}${size}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id={`${id}rock`} cx="38%" cy="32%" r="75%">
          <Stop offset="0" stopColor="#B08A68" />
          <Stop offset="0.55" stopColor="#6E5440" />
          <Stop offset="1" stopColor="#35281F" />
        </RadialGradient>
        <RadialGradient id={`${id}iron`} cx="35%" cy="30%" r="80%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.25" stopColor="#D5DCE8" />
          <Stop offset="0.7" stopColor="#7C8699" />
          <Stop offset="1" stopColor="#3A404D" />
        </RadialGradient>
        <RadialGradient id={`${id}ice`} cx="40%" cy="35%" r="70%">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="0.4" stopColor="#C8F4FF" />
          <Stop offset="1" stopColor="#4AA8C8" />
        </RadialGradient>
        <LinearGradient id={`${id}tail`} x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#BFF3FF" stopOpacity="0.9" />
          <Stop offset="1" stopColor="#4A9EFF" stopOpacity="0" />
        </LinearGradient>
      </Defs>

      {kind === 'rock' && (
        <G>
          <Path
            d="M14 26 C 12 16 24 8 34 10 C 46 8 56 18 54 30 C 58 42 48 54 36 54 C 24 58 10 50 12 40 C 8 34 10 30 14 26 Z"
            fill={`url(#${id}rock)`}
          />
          <Circle cx={26} cy={24} r={5} fill="#4A3829" opacity={0.8} />
          <Circle cx={40} cy={38} r={6.5} fill="#4A3829" opacity={0.75} />
          <Circle cx={24} cy={42} r={3.5} fill="#4A3829" opacity={0.7} />
          <Circle cx={43} cy={21} r={2.5} fill="#4A3829" opacity={0.6} />
        </G>
      )}

      {kind === 'iron' && (
        <G>
          <Path
            d="M16 22 C 22 10 44 8 52 20 C 60 32 54 50 40 54 C 26 58 12 48 11 36 C 10 30 12 26 16 22 Z"
            fill={`url(#${id}iron)`}
          />
          {/* Regmaglypts: the thumbprint dents of a melted iron meteorite. */}
          <Ellipse cx={30} cy={32} rx={5} ry={3.5} fill="#5B6475" opacity={0.45} />
          <Ellipse cx={42} cy={40} rx={4} ry={3} fill="#5B6475" opacity={0.4} />
          <Ellipse cx={24} cy={44} rx={3.5} ry={2.5} fill="#5B6475" opacity={0.35} />
          <Ellipse cx={24} cy={20} rx={7} ry={3} fill="#FFFFFF" opacity={0.55} />
        </G>
      )}

      {kind === 'comet' && (
        <G>
          <Path d="M24 40 L 62 4 L 58 2 Z" fill={`url(#${id}tail)`} opacity={0.6} />
          <Path d="M22 36 L 64 12 L 60 8 Z" fill={`url(#${id}tail)`} />
          <Circle cx={22} cy={42} r={15} fill="#8FE3FF" opacity={0.25} />
          <Circle cx={22} cy={42} r={10} fill={`url(#${id}ice)`} />
          <Circle cx={18} cy={38} r={3} fill="#FFFFFF" opacity={0.8} />
        </G>
      )}
    </Svg>
  );
}

/** Colours for the meteor, sparks and fireball in the strike animation. */
export const METEOR_LOOK: Record<
  Composition,
  { head: [string, string, string]; tail: [string, string]; tailWidth: number; tailLength: number; fire: [string, string, string]; sparks: string | null }
> = {
  rock: {
    head: ['#FFFFFF', '#FFD166', '#FF6B4A'],
    tail: ['#FFE9B0', '#FF6B4A'],
    tailWidth: 5,
    tailLength: 140,
    fire: ['#FFFBEA', '#FFD166', '#FF6B4A'],
    sparks: null,
  },
  iron: {
    head: ['#FFFFFF', '#F1F5FF', '#B9C6DE'],
    tail: ['#FFFFFF', '#FFC27A'],
    tailWidth: 3,
    tailLength: 120,
    fire: ['#FFFFFF', '#FFF0C8', '#FF8A4A'],
    sparks: '#FFE3A3',
  },
  comet: {
    head: ['#FFFFFF', '#CFF7FF', '#4AD3E6'],
    tail: ['#E6FDFF', '#4A9EFF'],
    tailWidth: 10,
    tailLength: 220,
    fire: ['#F4FEFF', '#A8E9FF', '#4A9EFF'],
    sparks: '#CFF7FF',
  },
};
