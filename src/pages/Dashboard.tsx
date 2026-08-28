import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, getPlans, getCheckIns, getOverrides, savePlan } from '../storage';
import { generateDailyPlan } from '../planner';
import {
  isStudyDay, getDayIndex, calculateCycleProgress, calculateExpectedProgress,
  calculateGoalProgress, countRecentLowCompletion, countUnclosedDays,
  detectRhythmStatus, getSystemRunningStreak, getRecentDays,
} from '../progress';
import { StudyCycle, StudyGoal, DailyPlan, CheckIn, DayOverride, todayStr } from '../types';
import Icon from '../components/Icon';
import { RhythmChip, ModeChip, MODE_KEYS } from '../components/StatusChips';
import { useI18n } from '../i18n/I18nProvider';
import { TranslationKey } from '../i18n/messages';

const GOAL_DOTS = ['var(--sc-primary)', 'var(--sc-rec)', 'var(--sc-rest)', 'var(--sc-low)'];

export default function Dashboard() {
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [allPlans, setAllPlans] = useState<DailyPlan[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [healthPassed, setHealthPassed] = useState(false);
  const [healthException, setHealthException] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const [phraseError, setPhraseError] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const today = todayStr();

  const refresh = useCallback(() => {
    const c = getActiveCycle();
    setCycle(c || null);
    if (c) {
      setGoals(getGoals(c.id));
      const plans = getPlans(c.id);
      setAllPlans(plans);
      setOverrides(getOverrides(c.id));
      const plan = plans.find((p) => p.date === today) || null;
      setTodayPlan(plan);
      setHealthPassed(plan?.healthGateStatus === 'passed' || plan?.healthGateStatus === 'exception');
      setHealthException(plan?.healthGateStatus === 'exception');
      setRecentCheckIns(getCheckIns(c.id));
    }
  }, [today]);

  useEffect(() => { refresh(); }, [refresh]);

  // --- 空态：还没有周期 ---
  if (!cycle) {
    return (
      <div className="empty">
        <div className="empty-mark"><Icon name="book" size={30} /></div>
        <div className="stack-10">
          <h1 className="h2">{t('home.emptyTitle')}</h1>
          <p className="pretty" style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--sc-ink-2)' }}>
            {t('home.emptyBody')}
          </p>
        </div>
        <div className="stack-10">
          {(['home.principle1', 'home.principle2', 'home.principle3'] as TranslationKey[]).map((key, i) => (
            <div className="principle" key={key}>
              <span className="principle-n">{i + 1}</span>
              <span style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--sc-ink-2)' }}>{t(key)}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/cycle-setup')}>
          <Icon name="plus" size={18} />
          {t('dashboard.createCycle')}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/settings')}>
          {t('dashboard.importData')}
        </button>
      </div>
    );
  }

  // --- 有周期 ---
  const activeGoals = goals.filter((g) => g.isActive);
  const cycleProgress = calculateCycleProgress(activeGoals);
  const expected = calculateExpectedProgress(cycle, today);
  const isTodayStudyDay = isStudyDay(cycle, today);
  const dayIdx = getDayIndex(cycle, today);
  const todayOverride = overrides.find((o) => o.date === today);
  const isClosed = todayPlan?.status === 'closed';
  const healthGateEnabled = cycle.healthGateEnabled;
  const healthRequired = healthGateEnabled && !healthPassed && isTodayStudyDay && !todayOverride && !isClosed;
  const streak = getSystemRunningStreak(cycle, allPlans, overrides, today);
  const week = getRecentDays(cycle, allPlans, overrides, today);
  const rhythm = detectRhythmStatus(cycleProgress, expected, countRecentLowCompletion(recentCheckIns));
  const planStarted = !!todayPlan && todayPlan.status !== 'notStarted';
  const mainGoalNames = (todayPlan?.mainGoalIds ?? [])
    .map((id) => goals.find((g) => g.id === id)?.name)
    .filter(Boolean) as string[];

  const handleHealthPass = () => setHealthPassed(true);

  const handleDayException = () => {
    setHealthException(true);
    setHealthPassed(true);
    if (todayPlan) {
      const updated = { ...todayPlan, healthGateStatus: 'exception' as const };
      savePlan(updated);
      setTodayPlan(updated);
    }
  };

  const handlePhraseSubmit = () => {
    const phrase = cycle.launchPhrase || t('cycle.defaultLaunchPhrase');
    if (phraseInput.trim() !== phrase) {
      setPhraseError(true);
      return;
    }
    setPhraseError(false);

    const existing = allPlans.find((p) => p.date === today);
    if (existing) {
      const resumed = existing.status === 'notStarted' ? { ...existing, status: 'active' as const } : existing;
      if (resumed !== existing) savePlan(resumed);
      setTodayPlan(resumed);
      navigate('/today');
      return;
    }

    const generated = generateDailyPlan(
      cycle, goals, today, allPlans, recentCheckIns, overrides, healthPassed || !healthGateEnabled,
    );
    const plan = healthException ? { ...generated, healthGateStatus: 'exception' as const } : generated;
    savePlan(plan);
    setTodayPlan(plan);
    setAllPlans((prev) => [...prev, plan]);
    navigate('/today');
  };

  // 提醒条：只提醒，不指责
  const warnings: string[] = [];
  if (countRecentLowCompletion(recentCheckIns) >= 2) warnings.push(t('dashboard.lowCompletionWarning'));
  if (countUnclosedDays(allPlans, today) >= 3) warnings.push(t('dashboard.unclosedWarning'));
  if (activeGoals.length > 5) warnings.push(t('dashboard.tooManyGoalsWarning', { count: activeGoals.length }));

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{cycle.name}</h1>
        <div className="page-meta">
          <span style={{ whiteSpace: 'nowrap' }}>{today}</span>
          <span className="dot-sep">·</span>
          <span>{t('dashboard.dayIndex', { count: dayIdx })}</span>
          <span className="dot-sep">·</span>
          {todayOverride ? (
            <ModeChip mode={todayOverride.mode} />
          ) : (
            <span className={`chip ${isTodayStudyDay ? 'chip-primary' : 'chip-rest'}`}>
              {isTodayStudyDay ? t('dashboard.studyDay') : t('dashboard.restDay')}
            </span>
          )}
        </div>
      </div>

      {/* 系统连续运行 + 最近 7 天节奏 —— 让人有安全感的那块 */}
      <div className="card">
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div className="col" style={{ gap: 3 }}>
            <div className="row" style={{ gap: 7, fontSize: 12, fontWeight: 500, color: 'var(--sc-ink-3)' }}>
              <Icon name="pulse" size={15} />
              {t('shell.systemRunning')}
            </div>
            <div className="row" style={{ alignItems: 'baseline', gap: 7 }}>
              <span className="num" style={{ fontSize: 38, color: 'var(--sc-primary)' }}>{streak}</span>
              <span style={{ fontSize: 13, color: 'var(--sc-ink-2)' }}>{t('home.daysUnit')}</span>
            </div>
          </div>
          <span className="spacer" />
          <div className="note" style={{ textAlign: 'right', maxWidth: 150 }}>{t('shell.streakNote')}</div>
        </div>

        <div className="week-row">
          {week.map((d) => {
            const height = d.completion === null ? 100 : Math.max(6, d.completion);
            const color = d.completion === null
              ? 'var(--sc-rest)'
              : d.completion > 0 ? 'var(--sc-primary)' : 'var(--sc-line)';
            return (
              <div className="week-col" key={d.date}>
                <div className="week-slot" title={`${d.date} · ${d.completion === null ? t('dashboard.restDay') : `${d.completion}%`}`}>
                  <div className="week-bar" style={{ height: `${height}%`, background: color }} />
                </div>
                <span style={{ fontSize: 9.5, color: 'var(--sc-ink-3)' }}>{d.weekdayLabel}</span>
              </div>
            );
          })}
        </div>

        <div className="legend">
          <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--sc-primary)' }} />{t('home.legendDone')}</span>
          <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--sc-rest)' }} />{t('home.legendRest')}</span>
          <span className="legend-item"><span className="legend-swatch" style={{ background: 'var(--sc-line)' }} />{t('home.legendNone')}</span>
        </div>
      </div>

      {warnings.map((w) => (
        <div className="notice" key={w} style={{ background: 'var(--sc-health-soft)' }}>
          <Icon name="spark" size={18} style={{ marginTop: 2, color: 'var(--sc-health)' }} />
          <div className="notice-body pretty">{w}</div>
        </div>
      ))}

      {/* 收工后 */}
      {isClosed && (
        <div className="notice" style={{ background: 'var(--sc-primary-soft)' }}>
          <Icon name="check" size={18} style={{ marginTop: 2, color: 'var(--sc-primary)' }} />
          <div className="notice-body pretty">
            {t('dashboard.closedMessage')}
            <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/today')}>
              {t('dashboard.viewFeedback')}
            </button>
          </div>
        </div>
      )}

      {/* 特殊日 / 休息日 */}
      {!isClosed && todayOverride && (
        <div className="notice" style={{ background: 'var(--sc-rest-soft)' }}>
          <Icon name="rest" size={18} style={{ marginTop: 2, color: 'var(--sc-rest)' }} />
          <div className="notice-body pretty">
            {t('dashboard.specialDay', { mode: t(MODE_KEYS[todayOverride.mode]), reason: todayOverride.reason })}
          </div>
        </div>
      )}
      {!isClosed && !todayOverride && !isTodayStudyDay && (
        <div className="notice" style={{ background: 'var(--sc-rest-soft)' }}>
          <Icon name="rest" size={18} style={{ marginTop: 2, color: 'var(--sc-rest)' }} />
          <div className="notice-body pretty">{t('dashboard.restMessage')}</div>
        </div>
      )}

      {/* 第一步：健康前置 */}
      {healthRequired && (
        <div className="step-health">
          <div className="step-label" style={{ color: 'var(--sc-health)' }}>
            <Icon name="health" size={16} />
            {t('home.step1')}
          </div>
          <div className="h3">{t('home.healthTitle')}</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--sc-ink-2)' }}>
            {cycle.healthGateText || t('home.healthBody')}
          </div>
          <div className="row-wrap" style={{ gap: 8, marginTop: 2 }}>
            <button
              className="btn"
              style={{ flex: '1 1 auto', background: 'var(--sc-health)', color: '#fff', fontWeight: 500 }}
              onClick={handleHealthPass}
            >
              <Icon name="check" size={17} />
              {t('home.healthDone')}
            </button>
            <button
              className="btn"
              style={{ borderColor: 'var(--sc-health)', color: 'var(--sc-health)', background: 'transparent', fontSize: 13 }}
              onClick={handleDayException}
            >
              {t('home.healthSkip')}
            </button>
          </div>
        </div>
      )}

      {/* 第二步：亲手启动 —— 这是产品最有想法的一刻，给它整屏最强的存在感 */}
      {!isClosed && !todayOverride && isTodayStudyDay && !healthRequired && !planStarted && (
        <div className="ritual">
          <div className="step-label" style={{ color: 'var(--sc-primary)' }}>
            <Icon name="key" size={16} />
            {t('home.step2')}
          </div>
          <div className="ritual-title pretty">{t('home.ritualTitle')}</div>
          <div className="pretty" style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--sc-ink-2)' }}>
            {t('home.ritualBody')}
          </div>
          <input
            className="input input-ritual"
            type="text"
            placeholder={t('dashboard.launchPlaceholder')}
            value={phraseInput}
            onChange={(e) => { setPhraseInput(e.target.value); setPhraseError(false); }}
            onKeyDown={(e) => e.key === 'Enter' && handlePhraseSubmit()}
            aria-label={t('dashboard.launchPhrase')}
          />
          <button className="btn btn-primary btn-hero btn-block" onClick={handlePhraseSubmit}>
            <Icon name="spark" size={18} />
            {t('home.startBtn')}
          </button>
          <div className="note">
            {phraseError
              ? t('home.codeHintError', { code: cycle.launchPhrase || t('cycle.defaultLaunchPhrase') })
              : t('home.codeHintIdle')}
          </div>
        </div>
      )}

      {/* 已启动 */}
      {!isClosed && planStarted && (
        <div className="started">
          <div className="row" style={{ gap: 8, fontSize: 12, fontWeight: 500, opacity: .9 }}>
            <Icon name="check" size={16} />
            {t('dashboard.planGenerated')}
          </div>
          <div className="serif" style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.4 }}>{t('home.startedTitle')}</div>
          {mainGoalNames.length > 0 && (
            <div className="started-inset">
              <div style={{ fontSize: 11.5, fontWeight: 500, opacity: .85 }}>{t('home.mainGoal')}</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{mainGoalNames.join(' · ')}</div>
            </div>
          )}
          <button className="btn btn-invert btn-lg btn-block" onClick={() => navigate('/today')}>
            {t('home.enterToday')}
            <Icon name="chev" size={17} />
          </button>
        </div>
      )}

      {/* 进度 + 目标 */}
      <div className="grid-2">
        <div className="card card-flat">
          <div className="card-label">{t('dashboard.totalProgress')}</div>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="num" style={{ fontSize: 32, color: 'var(--sc-ink)' }}>{cycleProgress}%</span>
            <span className="spacer" />
            <span className="note">{t('home.expected')} {expected}%</span>
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${Math.min(100, cycleProgress)}%` }} />
            <div className="bar-mark" style={{ left: `${Math.min(100, expected)}%` }} />
          </div>
          <RhythmChip status={rhythm} />
        </div>

        <div className="card card-flat">
          <div className="card-label">{t('dashboard.activeGoalCount')}</div>
          <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
            <span className="num" style={{ fontSize: 32, color: 'var(--sc-ink)' }}>{activeGoals.length}</span>
            <span style={{ fontSize: 12, color: 'var(--sc-ink-3)' }}>/ {goals.length}</span>
          </div>
          <div className="stack-8">
            {activeGoals.slice(0, 4).map((g, i) => (
              <div className="row" style={{ gap: 9 }} key={g.id}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: GOAL_DOTS[i % GOAL_DOTS.length] }} />
                <span style={{ flex: 1, fontSize: 12.5, color: 'var(--sc-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.name}
                </span>
                <span className="tnum" style={{ fontSize: 11.5, color: 'var(--sc-ink-3)' }}>{calculateGoalProgress(g)}%</span>
              </div>
            ))}
            {activeGoals.length === 0 && <span className="note">{t('common.none')}</span>}
          </div>
        </div>
      </div>

      {/* 休息提示：把「今天可以不学」摆到台面上 */}
      {!isClosed && !todayOverride && isTodayStudyDay && (
        <div className="notice" style={{ background: 'var(--sc-rest-soft)' }}>
          <Icon name="rest" size={18} style={{ marginTop: 1, color: 'var(--sc-rest)' }} />
          <div className="notice-body pretty">
            {t('home.restNudge')}
            <button className="btn btn-caution btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/settings')}>
              {t('dashboard.markToday')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
