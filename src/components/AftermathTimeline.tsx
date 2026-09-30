import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Polyline, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { t, type MessageKey } from '../i18n/core';
import type { Stage, StageId } from '../physics/aftermath';
import { dec, formatArea, formatDistance, formatDuration, formatTempDrop, type Units } from '../physics/format';
import { colors, fonts, radius } from '../theme';
import { LockIcon } from './icons';
import { PrimaryButton } from './ui';

interface Props {
  stages: Stage[];
  units: Units;
  /** Pro stages are readable (Pro, or unlocked for this strike). */
  unlocked: boolean;
  selected: StageId;
  onSelect: (id: StageId) => void;
  onUnlock: () => void;
}

const PLAY_STEP_MS = 3000;

/** One fact as a sentence in the user's language and units. */
export function factText(f: Stage['facts'][number], units: Units): string {
  const params: Record<string, string> = {};
  if (f.dist !== undefined) params.dist = formatDistance(f.dist, units);
  if (f.time !== undefined) params.time = formatDuration(f.time);
  if (f.area !== undefined) params.area = formatArea(f.area, units);
  if (f.drop !== undefined) params.drop = formatTempDrop(f.drop, units);
  if (f.m !== undefined) params.m = dec(f.m, 1);
  return t(f.key as MessageKey, params);
}

/**
 * The selected stage, shown over the bottom of the map so the picture and the
 * words are on screen together. Arrows step through the stages; ✕ goes back to
 * the normal damage rings.
 */
export function StageCaption({
  stages,
  selected,
  units,
  unlocked,
  onSelect,
  onClose,
  onUnlock,
}: {
  stages: Stage[];
  selected: StageId;
  units: Units;
  unlocked: boolean;
  onSelect: (id: StageId) => void;
  onClose: () => void;
  onUnlock: () => void;
}) {
  const i = stages.findIndex((s) => s.id === selected);
  const stage = stages[i];
  if (!stage) return null;
  const locked = stage.pro && !unlocked;
  const prev = stages[i - 1];
  const next = stages[i + 1];
  return (
    <View style={styles.caption}>
      <View style={styles.captionHead}>
        <Pressable
          onPress={() => prev && onSelect(prev.id)}
          disabled={!prev}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('af.prev')}
          style={[styles.arrow, !prev && styles.hidden]}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <View style={styles.captionTitleWrap}>
          <Text style={styles.cardWhen}>
            {i + 1}/{stages.length} · {t(`af.when.${stage.id}`)}
          </Text>
          <Text style={styles.captionTitle}>{t(`af.stage.${stage.id}`)}</Text>
        </View>
        <Pressable
          onPress={() => next && onSelect(next.id)}
          disabled={!next}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('af.next')}
          style={[styles.arrow, !next && styles.hidden]}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.arrow}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      {locked ? (
        <Pressable onPress={onUnlock} accessibilityRole="button" style={styles.captionLock}>
          <LockIcon size={12} color={colors.accent} />
          <Text style={styles.captionFact}>{t('af.locked.button')}</Text>
        </Pressable>
      ) : (
        stage.facts.slice(0, 2).map((f) => (
          <Text key={f.key} style={styles.captionFact} numberOfLines={3}>
            {factText(f, units)}
          </Text>
        ))
      )}
    </View>
  );
}

/**
 * "What happens next": a row of stages from second 0 to years later. The map
 * above shows each stage; this card explains it with an illustration and, for
 * an impact winter, the temperature curve. Play steps through them on its own.
 * Free users read the first minutes; later stages show a lock.
 */
export function AftermathTimeline({ stages, units, unlocked, selected, onSelect, onUnlock }: Props) {
  const stage = stages.find((s) => s.id === selected) ?? stages[0];
  const [playing, setPlaying] = useState(false);
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  });

  // Play: advance one stage every few seconds; stop at the end or at a lock.
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      const i = stages.findIndex((s) => s.id === selected);
      const next = stages[i + 1];
      if (!next) {
        setPlaying(false);
        return;
      }
      selectRef.current(next.id);
      if (next.pro && !unlocked) setPlaying(false);
    }, PLAY_STEP_MS);
    return () => clearInterval(timer);
  }, [playing, selected, stages, unlocked]);

  if (!stage) return null;
  const locked = stage.pro && !unlocked;

  const fill = (f: Stage['facts'][number]) => factText(f, units);

  const winter = stage.facts.find((f) => f.key === 'af.climate.winter');

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <Text style={styles.header}>{t('af.header')}</Text>
        <Pressable
          onPress={() => {
            if (!playing && stage.id === stages[stages.length - 1]?.id) onSelect(stages[0].id);
            setPlaying((p) => !p);
          }}
          accessibilityRole="button"
          style={styles.play}
          hitSlop={8}
        >
          <Text style={styles.playText}>{playing ? t('af.pause') : t('af.play')}</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.track}>
        {stages.map((s, i) => {
          const on = s.id === stage.id;
          const lock = s.pro && !unlocked;
          const name = t(`af.stage.${s.id}`);
          return (
            <Pressable
              key={s.id}
              onPress={() => {
                setPlaying(false);
                onSelect(s.id);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={lock ? t('af.lockA11y', { stage: name }) : name}
              style={styles.step}
            >
              <View style={styles.dotRow}>
                <View style={[styles.line, i === 0 && styles.hidden]} />
                <View style={[styles.dot, on && styles.dotOn, lock && styles.dotLocked]}>
                  {lock && <LockIcon size={9} color={on ? colors.onAccent : colors.muted} />}
                </View>
                <View style={[styles.line, i === stages.length - 1 && styles.hidden]} />
              </View>
              <Text style={[styles.stepName, on && styles.stepNameOn]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.stepWhen} numberOfLines={1}>
                {t(`af.when.${s.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.card, locked && styles.cardLocked]}>
        <View style={styles.cardTop}>
          <StageArt id={stage.id} dim={locked} />
          <View style={styles.cardHead}>
            <Text style={styles.cardWhen}>{t(`af.when.${stage.id}`)}</Text>
            <Text style={styles.cardTitle}>{t(`af.stage.${stage.id}`)}</Text>
          </View>
        </View>
        {locked ? (
          <>
            <View style={styles.lockTitle}>
              <LockIcon size={14} color={colors.accent} />
              <Text style={styles.lockText}>{t('af.locked.title')}</Text>
            </View>
            <Text style={styles.fact}>{t('af.locked.body')}</Text>
            <PrimaryButton label={t('af.locked.button')} onPress={onUnlock} style={styles.unlock} />
          </>
        ) : (
          <>
            {stage.facts.map((f) => (
              <Text key={f.key} style={styles.fact}>
                {fill(f)}
              </Text>
            ))}
            {winter && <WinterChart units={units} />}
            {winter && <Text style={styles.source}>{t('af.source')}</Text>}
            {stage.id !== 'blast' && <Text style={styles.mapHint}>{t('af.mapHint')}</Text>}
          </>
        )}
      </View>
    </View>
  );
}

/** A small picture for each stage, drawn in code. */
function StageArt({ id, dim }: { id: StageId; dim: boolean }) {
  const s = 56;
  const c = s / 2;
  return (
    <View style={[styles.art, dim && { opacity: 0.45 }]}>
      <Svg width={s} height={s}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFBEA" />
            <Stop offset="0.4" stopColor="#FFD166" />
            <Stop offset="1" stopColor={colors.accent} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        {id === 'impact' && (
          <>
            <Circle cx={c} cy={c} r={24} fill="url(#glow)" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <Line
                key={a}
                x1={c + Math.cos((a * Math.PI) / 180) * 12}
                y1={c + Math.sin((a * Math.PI) / 180) * 12}
                x2={c + Math.cos((a * Math.PI) / 180) * 24}
                y2={c + Math.sin((a * Math.PI) / 180) * 24}
                stroke="#FFE9B0"
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}
          </>
        )}
        {id === 'blast' && (
          <G fill="none" strokeWidth={2}>
            <Circle cx={c} cy={c} r={6} fill={colors.accent} stroke="none" />
            <Circle cx={c} cy={c} r={13} stroke={colors.yellow} />
            <Circle cx={c} cy={c} r={20} stroke={colors.yellow} strokeOpacity={0.6} />
            <Circle cx={c} cy={c} r={26} stroke={colors.blue} strokeOpacity={0.6} />
          </G>
        )}
        {id === 'ejecta' && (
          <>
            <Path d={`M 6 ${s - 10} Q ${c} ${s - 22} ${s - 6} ${s - 10} L ${s - 6} ${s - 4} L 6 ${s - 4} Z`} fill="#7A5236" />
            {[
              [14, 18, 4],
              [28, 10, 5],
              [42, 20, 3.5],
              [20, 30, 3],
              [36, 28, 4],
            ].map(([x, y, r], i) => (
              <Circle key={i} cx={x} cy={y} r={r} fill="#C9A27A" />
            ))}
          </>
        )}
        {id === 'fires' && (
          <>
            <Rect x={4} y={s - 10} width={s - 8} height={6} rx={3} fill="#3A2A20" />
            {[14, 28, 42].map((x, i) => (
              <Path
                key={x}
                d={`M ${x} ${s - 10} C ${x - 9} ${s - 22} ${x - 2} ${s - 30 - i * 3} ${x} ${s - 40 + i * 2} C ${x + 3} ${s - 30} ${x + 9} ${s - 22} ${x} ${s - 10} Z`}
                fill={i === 1 ? '#FFB347' : colors.accent}
              />
            ))}
          </>
        )}
        {id === 'sky' && (
          <>
            <Circle cx={c + 8} cy={c - 6} r={11} fill="#FFD166" opacity={0.35} />
            <Path d={`M 6 ${c + 10} Q 10 ${c - 4} 22 ${c} Q 28 ${c - 14} 40 ${c - 2} Q 52 ${c - 2} 50 ${c + 10} Z`} fill="#4A4F5C" />
            <Path d={`M 2 ${c + 20} Q 12 ${c + 8} 26 ${c + 14} Q 40 ${c + 6} 54 ${c + 18} L 54 ${c + 24} L 2 ${c + 24} Z`} fill="#2E323C" />
          </>
        )}
        {id === 'climate' && (
          <>
            <Rect x={c - 5} y={8} width={10} height={32} rx={5} fill="#1E2638" stroke={colors.blue} strokeWidth={1.5} />
            <Circle cx={c} cy={44} r={8} fill={colors.blue} />
            <Rect x={c - 2} y={30} width={4} height={14} fill={colors.blue} />
            <G stroke="#CFE6FF" strokeWidth={1.5} strokeLinecap="round">
              <Line x1={46} y1={8} x2={46} y2={22} />
              <Line x1={39} y1={15} x2={53} y2={15} />
              <Line x1={41} y1={10} x2={51} y2={20} />
              <Line x1={51} y1={10} x2={41} y2={20} />
            </G>
          </>
        )}
      </Svg>
    </View>
  );
}

/**
 * Global temperature change after a Chicxulub-size impact. The numbers are
 * Brugger et al. (2017): at least 26 °C of cooling, ~3 years below freezing,
 * ~30 years to recover. The curve between them is an illustration.
 */
function WinterChart({ units }: { units: Units }) {
  const W = 280;
  const H = 110;
  const pad = { l: 34, r: 8, t: 8, b: 20 };
  const years = 30;
  const minC = -28;
  const x = (y: number) => pad.l + (y / years) * (W - pad.l - pad.r);
  const yv = (c: number) => pad.t + (c / minC) * (H - pad.t - pad.b);
  const curve: [number, number][] = [
    [0, 0],
    [0.3, -18],
    [1, -26],
    [3, -20],
    [6, -12],
    [12, -6],
    [20, -2],
    [30, 0],
  ];
  const tick = (c: number) => (units === 'imperial' ? `${Math.round(c * 1.8)}°F` : `${c}°C`);
  return (
    <View style={styles.chart} accessible accessibilityLabel={t('af.chartA11y')}>
      <Svg width={W} height={H}>
        <Line x1={pad.l} y1={yv(0)} x2={W - pad.r} y2={yv(0)} stroke={colors.border} strokeWidth={1} />
        <Rect x={x(0)} y={pad.t} width={x(3) - x(0)} height={H - pad.t - pad.b} fill="rgba(74,158,255,0.12)" />
        <Polyline
          points={curve.map(([a, b]) => `${x(a)},${yv(b)}`).join(' ')}
          fill="none"
          stroke={colors.blue}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <Circle cx={x(1)} cy={yv(-26)} r={3.5} fill={colors.text} />
        <SvgText x={4} y={yv(0) + 4} fontSize={10} fill={colors.muted}>
          {tick(0)}
        </SvgText>
        <SvgText x={4} y={yv(-26) + 4} fontSize={10} fill={colors.muted}>
          {tick(-26)}
        </SvgText>
        {[0, 3, 10, 20, 30].map((yr) => (
          <SvgText key={yr} x={x(yr)} y={H - 6} fontSize={10} fill={colors.muted} textAnchor="middle">
            {t('af.chartYear', { n: yr })}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.chartNote}>{t('af.chartNote')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { fontSize: 12, letterSpacing: 1.5, color: colors.muted, fontFamily: fonts.bodySemi },
  play: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  playText: { fontSize: 12, color: colors.text, fontFamily: fonts.bodySemi },
  track: { paddingVertical: 2 },
  step: { width: 92, alignItems: 'center', gap: 3 },
  dotRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  hidden: { opacity: 0 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dotLocked: { borderColor: colors.dim },
  stepName: { fontSize: 12, color: colors.muted, fontFamily: fonts.bodySemi, maxWidth: 88 },
  stepNameOn: { color: colors.text },
  stepWhen: { fontSize: 10, color: colors.dim, fontFamily: fonts.body, maxWidth: 88 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  cardLocked: { borderColor: 'rgba(255,107,74,0.5)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#0F1424', overflow: 'hidden' },
  cardHead: { flex: 1, gap: 2 },
  cardWhen: { fontSize: 11, letterSpacing: 1, color: colors.muted, fontFamily: fonts.bodySemi },
  cardTitle: { fontSize: 18, color: colors.text, fontFamily: fonts.display },
  lockTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockText: { fontSize: 15, color: colors.text, fontFamily: fonts.bodySemi },
  fact: { fontSize: 13, color: colors.text, fontFamily: fonts.body, lineHeight: 19 },
  source: { fontSize: 11, color: colors.dim, fontFamily: fonts.body },
  mapHint: { fontSize: 11, color: colors.muted, fontFamily: fonts.bodyMedium },
  unlock: { marginTop: 4, minHeight: 46 },
  chart: { gap: 4, marginTop: 2 },
  caption: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(11,14,23,0.9)',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  captionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  captionTitleWrap: { flex: 1, alignItems: 'center' },
  captionTitle: { fontSize: 15, color: colors.text, fontFamily: fonts.display },
  captionFact: { fontSize: 12, color: colors.text, fontFamily: fonts.body, lineHeight: 17 },
  captionLock: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: 4 },
  arrow: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 26, lineHeight: 28, color: colors.text, fontFamily: fonts.bodySemi },
  closeText: { fontSize: 14, color: colors.muted, fontFamily: fonts.bodySemi },
  chartNote: { fontSize: 11, color: colors.muted, fontFamily: fonts.body },
});
