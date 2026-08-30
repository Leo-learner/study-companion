import React from 'react';
import { DayOverride, PlanMode, RhythmStatus, UserState } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { TranslationKey } from '../i18n/messages';

/**
 * 状态的视觉编码集中在这里，界面各处只引用，不各自发明颜色。
 * 五种节奏都不用红色、不用下跌箭头：越靠后的状态对比度反而更低——
 * 用户此刻已经很难受了，界面不该再加一层责备。
 */

export const RHYTHM_KEYS: Record<RhythmStatus, TranslationKey> = {
  ahead: 'rhythm.ahead',
  stable: 'rhythm.stable',
  slightlyBehind: 'rhythm.slightlyBehind',
  behind: 'rhythm.behind',
  slipping: 'rhythm.slipping',
};

const RHYTHM_CLASS: Record<RhythmStatus, string> = {
  ahead: 'chip-solid',
  stable: 'chip-primary',
  slightlyBehind: 'chip-health',
  behind: 'chip-rest',
  slipping: 'chip-low',
};

export function RhythmChip({ status }: { status: RhythmStatus }) {
  const { t } = useI18n();
  return (
    <span className={`chip ${RHYTHM_CLASS[status]}`} style={{ alignSelf: 'flex-start' }}>
      {t(RHYTHM_KEYS[status])}
    </span>
  );
}

export const MODE_KEYS: Record<DayOverride['mode'], TranslationKey> = {
  rest: 'plan.mode.rest',
  holiday: 'plan.mode.holiday',
  exam: 'plan.mode.exam',
  blocked: 'plan.mode.blocked',
};

const PLAN_MODE_KEYS: Record<PlanMode, TranslationKey> = {
  normal: 'plan.mode.normal',
  light: 'plan.mode.light',
  rest: 'plan.mode.rest',
  holiday: 'plan.mode.holiday',
  exam: 'plan.mode.exam',
  blocked: 'plan.mode.blocked',
};

export const MODE_CLASS: Record<PlanMode, string> = {
  normal: 'chip-primary',
  light: 'chip-rec',
  rest: 'chip-rest',
  holiday: 'chip-rest',
  exam: 'chip-exam',
  blocked: 'chip-low',
};

export const MODE_COLOR: Record<PlanMode, string> = {
  normal: 'var(--sc-primary)',
  light: 'var(--sc-rec)',
  rest: 'var(--sc-rest)',
  holiday: 'var(--sc-rest)',
  exam: 'var(--sc-exam)',
  blocked: 'var(--sc-low)',
};

export function ModeChip({ mode }: { mode: PlanMode }) {
  const { t } = useI18n();
  return <span className={`chip ${MODE_CLASS[mode]}`}>{t(PLAN_MODE_KEYS[mode])}</span>;
}

/** 账号头像色点，复用状态色板保持视觉一致。 */
export const ACCOUNT_COLORS = [
  'var(--sc-primary)', 'var(--sc-rec)', 'var(--sc-rest)',
  'var(--sc-low)', 'var(--sc-exam)', 'var(--sc-health)',
];

/** 当日状态用色点，不用表情——避免 emoji 跨端漂移。 */
export const STATE_COLOR: Record<UserState, string> = {
  good: 'var(--sc-primary)',
  normal: 'var(--sc-rec)',
  tired: 'var(--sc-rest)',
  bad: 'var(--sc-low)',
};

export const STATE_KEYS: Record<UserState, TranslationKey> = {
  good: 'today.state.good',
  normal: 'today.state.normal',
  tired: 'today.state.tired',
  bad: 'today.state.bad',
};

export const STATE_NOTE_KEYS: Record<UserState, TranslationKey> = {
  good: 'today.stateNote.good',
  normal: 'today.stateNote.normal',
  tired: 'today.stateNote.tired',
  bad: 'today.stateNote.bad',
};

export function StateOption({
  state, selected, onPick,
}: { state: UserState; selected: boolean; onPick: () => void }) {
  const { t } = useI18n();
  const color = STATE_COLOR[state];
  return (
    <button
      type="button"
      className="state-opt"
      aria-pressed={selected}
      onClick={onPick}
      style={selected ? { background: color, borderColor: color, color: '#fff' } : undefined}
    >
      <span className="state-dot" style={{ background: selected ? 'rgba(255,255,255,.9)' : color }} />
      {t(STATE_KEYS[state])}
    </button>
  );
}
