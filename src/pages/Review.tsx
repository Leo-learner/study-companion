import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getGoals, getOverrides, getPlans } from '../storage';
import {
  calculateCycleProgress, calculateExpectedProgress, calculateGoalProgress,
  countRecentLowCompletion, detectRhythmStatus, getSystemRunningStreak, isMinimumCompleted,
} from '../progress';
import { PlanMode, todayStr } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import Icon from '../components/Icon';
import { MODE_COLOR, RhythmChip } from '../components/StatusChips';

/** 把计划按周分组，算每周保底完成率。 */
function weeklyBuckets(dates: string[], metDates: Set<string>) {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const first = new Date(`${sorted[0]}T00:00:00Z`);
  const buckets = new Map<number, { total: number; met: number }>();
  for (const d of sorted) {
    const day = new Date(`${d}T00:00:00Z`);
    const week = Math.floor((day.getTime() - first.getTime()) / (7 * 24 * 3600 * 1000));
    const b = buckets.get(week) ?? { total: 0, met: 0 };
    b.total += 1;
    if (metDates.has(d)) b.met += 1;
    buckets.set(week, b);
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, b]) => ({ label: `W${week + 1}`, ratio: b.total ? b.met / b.total : 0 }));
}

export default function Review() {
  const { t } = useI18n();
  const cycle = getActiveCycle();
  const navigate = useNavigate();

  if (!cycle) {
    return (
      <div className="empty">
        <div className="empty-mark"><Icon name="book" size={30} /></div>
        <h1 className="h2">{t('goal.needCycle')}</h1>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </div>
    );
  }

  const today = todayStr();
  const goals = getGoals(cycle.id);
  const activeGoals = goals.filter((g) => g.isActive);
  const plans = getPlans(cycle.id);
  const checkIns = getCheckIns(cycle.id);
  const overrides = getOverrides(cycle.id);

  const cycleProgress = calculateCycleProgress(activeGoals);
  const expected = calculateExpectedProgress(cycle, today);
  const rhythm = detectRhythmStatus(cycleProgress, expected, countRecentLowCompletion(checkIns));
  const streak = getSystemRunningStreak(cycle, plans, overrides, today);

  const totalDays = plans.length;
  const closedPlans = plans.filter((p) => p.status === 'closed');
  const metPlans = closedPlans.filter((p) => isMinimumCompleted(p));
  const restDays = plans.filter((p) => ['rest', 'holiday'].includes(p.mode)).length;
  const missedDays = plans.filter((p) => p.status === 'notStarted').length;

  const weeks = weeklyBuckets(plans.map((p) => p.date), new Set(metPlans.map((p) => p.date)));

  const modeCounts = new Map<PlanMode, number>();
  for (const p of plans) modeCounts.set(p.mode, (modeCounts.get(p.mode) ?? 0) + 1);
  const modeMix = [...modeCounts.entries()].sort((a, b) => b[1] - a[1]);

  const facts: Array<[string | number, string]> = [
    [metPlans.length, t('reviewNew.factBaseline')],
    [restDays, t('reviewNew.factRest')],
    [missedDays, t('reviewNew.factMissed')],
    [streak, t('reviewNew.factStreak')],
  ];

  // 建议保持原有逻辑，只是去掉了 emoji 前缀
  const suggestions: string[] = [];
  const recentLowDays = countRecentLowCompletion(checkIns, 40, 14);
  if (recentLowDays >= 3) suggestions.push(t('review.lowCompletionSuggestion', { count: recentLowDays }));
  if (activeGoals.length > 4) suggestions.push(t('review.tooManyGoalsSuggestion', { count: activeGoals.length }));
  if (plans.filter((p) => p.healthGateStatus === 'exception').length >= 3) suggestions.push(t('review.healthSuggestion'));
  if (cycleProgress < 30 && totalDays > 14) suggestions.push(t('review.slowProgressSuggestion'));
  if (closedPlans.length === 0 && totalDays > 3) suggestions.push(t('review.noCloseSuggestion'));
  if (suggestions.length === 0) suggestions.push(t('review.healthySuggestion'));

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{t('review.title')}</h1>
        <div className="sub">{cycle.name}</div>
      </div>

      {/* 每周节奏 */}
      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          <span className="card-label" style={{ flex: 1 }}>{t('reviewNew.weeklyRhythm')}</span>
          <RhythmChip status={rhythm} />
        </div>
        {weeks.length === 0 ? (
          <div className="note">{t('common.none')}</div>
        ) : (
          <div className="row" style={{ alignItems: 'flex-end', gap: 10, height: 130 }}>
            {weeks.map((w) => (
              <div className="col" key={w.label} style={{ flex: 1, alignItems: 'center', gap: 8, height: '100%' }}>
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    title={`${Math.round(w.ratio * 100)}%`}
                    style={{
                      width: '100%',
                      height: `${Math.max(4, w.ratio * 100)}%`,
                      minHeight: 4,
                      borderRadius: 'var(--sc-r1)',
                      background: w.ratio >= .5 ? 'var(--sc-primary)' : 'var(--sc-rest)',
                    }}
                  />
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--sc-ink-3)' }}>{w.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="note" style={{ borderTop: '1px solid var(--sc-line-soft)', paddingTop: 12 }}>
          {t('reviewNew.weeklyNote')}
        </div>
      </div>

      <div className="grid-2">
        {/* 日模式分布 */}
        <div className="card card-flat">
          <div className="card-label">{t('reviewNew.modeMix')}</div>
          {modeMix.length > 0 && (
            <div style={{ display: 'flex', height: 12, borderRadius: 'var(--sc-pill)', overflow: 'hidden' }}>
              {modeMix.map(([mode, count]) => (
                <div key={mode} style={{ flex: count, background: MODE_COLOR[mode] }} />
              ))}
            </div>
          )}
          <div className="stack-8">
            {modeMix.map(([mode, count]) => (
              <div className="row" key={mode} style={{ gap: 9, fontSize: 12.5 }}>
                <span className="legend-swatch" style={{ background: MODE_COLOR[mode] }} />
                <span style={{ flex: 1, color: 'var(--sc-ink-2)' }}>{t(`plan.mode.${mode}` as never)}</span>
                <span className="tnum" style={{ color: 'var(--sc-ink-3)' }}>{count}</span>
              </div>
            ))}
            {modeMix.length === 0 && <span className="note">{t('common.none')}</span>}
          </div>
        </div>

        {/* 这个周期的事实 */}
        <div className="card card-flat">
          <div className="card-label">{t('reviewNew.facts')}</div>
          <div className="stack-12">
            {facts.map(([value, label]) => (
              <div className="row" key={label} style={{ alignItems: 'baseline', gap: 10 }}>
                <span className="num" style={{ fontSize: 26, color: 'var(--sc-primary)', minWidth: 52 }}>{value}</span>
                <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.6, color: 'var(--sc-ink-2)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 各目标进度 */}
      <div className="card card-flat">
        <div className="card-label">{t('review.goalProgress')}</div>
        <div className="stack-12">
          {goals.map((goal) => {
            const pct = calculateGoalProgress(goal);
            return (
              <div className="stack-8" key={goal.id}>
                <div className="row-wrap" style={{ gap: 8 }}>
                  <span style={{ fontSize: 13.5, color: 'var(--sc-ink)' }}>{goal.name}</span>
                  {!goal.isActive && <span className="chip chip-opt">{t('common.disabled')}</span>}
                  <span className="spacer" />
                  <span className="tnum note">{pct}% · {goal.completedAmount}/{goal.totalAmount} {goal.unitName}</span>
                </div>
                <div className="bar bar-sm">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: goal.isActive ? 'var(--sc-primary)' : 'var(--sc-opt)' }} />
                </div>
              </div>
            );
          })}
          {goals.length === 0 && <span className="note">{t('review.noGoals')}</span>}
        </div>
      </div>

      {/* 复盘结论 */}
      <div className="col" style={{ gap: 7, padding: '17px 19px', background: 'var(--sc-primary-soft)', borderRadius: 'var(--sc-r3)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--sc-primary)' }}>{t('reviewNew.verdictLabel')}</div>
        <div className="serif pretty" style={{ fontWeight: 500, fontSize: 16, lineHeight: 1.8, color: 'var(--sc-ink)' }}>
          {t('reviewNew.verdict', {
            days: totalDays, met: metPlans.length, rest: restDays, missed: missedDays,
          })}
        </div>
      </div>

      {/* 建议 */}
      <div className="card card-quiet">
        <div className="card-title">
          <Icon name="spark" size={16} style={{ color: 'var(--sc-primary)' }} />
          {t('review.suggestions')}
        </div>
        <div className="stack-8">
          {suggestions.map((s) => (
            <div className="row" key={s} style={{ alignItems: 'flex-start', gap: 10, fontSize: 12.5, lineHeight: 1.75, color: 'var(--sc-ink-2)' }}>
              <span style={{ color: 'var(--sc-primary)', flex: 'none' }}>—</span>
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
