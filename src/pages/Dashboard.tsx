import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, getPlans, getCheckIns, getOverrides, savePlan } from '../storage';
import { generateDailyPlan } from '../planner';
import { isStudyDay, getDayIndex, calculateCycleProgress, countRecentLowCompletion, countUnclosedDays } from '../progress';
import { StudyCycle, StudyGoal, DailyPlan, CheckIn, DayOverride, todayStr } from '../types';
import CycleSetup from './CycleSetup';
import { useI18n } from '../i18n/I18nProvider';
import { TranslationKey } from '../i18n/messages';

const MODE_KEYS: Record<DayOverride['mode'], TranslationKey> = {
  rest: 'plan.mode.rest', holiday: 'plan.mode.holiday', exam: 'plan.mode.exam', blocked: 'plan.mode.blocked',
};

const RHYTHM_KEYS: Record<CheckIn['rhythmStatus'], TranslationKey> = {
  ahead: 'rhythm.ahead', stable: 'rhythm.stable', slightlyBehind: 'rhythm.slightlyBehind',
  behind: 'rhythm.behind', slipping: 'rhythm.slipping',
};

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
  const [phraseError, setPhraseError] = useState('');
  const [showCycleSetup, setShowCycleSetup] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  const today = todayStr();

  const refresh = useCallback(() => {
    const c = getActiveCycle();
    setCycle(c || null);
    if (c) {
      setGoals(getGoals(c.id));
      setAllPlans(getPlans(c.id));
      setOverrides(getOverrides(c.id));
      const plan = getPlans(c.id).find((p) => p.date === today) || null;
      setTodayPlan(plan);
      setHealthPassed(plan?.healthGateStatus === 'passed' || plan?.healthGateStatus === 'exception');
      setHealthException(plan?.healthGateStatus === 'exception');
      setRecentCheckIns(getCheckIns(c.id));
    }
  }, [today]);

  useEffect(() => { refresh(); }, [refresh]);

  // --- 没有学习周期：显示创建向导 ---
  if (!cycle) {
    if (showCycleSetup) {
      return <CycleSetup onCreated={() => { setShowCycleSetup(false); refresh(); }} />;
    }
    return (
      <div>
        <div className="welcome-hero">
          <h1>{t('dashboard.welcomeTitle')}</h1>
          <p>{t('ui.encouragement')}</p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setShowCycleSetup(true)}>
              {t('dashboard.createCycle')}
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/settings')}>
              {t('dashboard.importData')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 有学习周期 ---
  const activeGoals = goals.filter((g) => g.isActive);
  const cycleProgress = calculateCycleProgress(activeGoals);
  const isTodayStudyDay = isStudyDay(cycle, today);
  const dayIdx = getDayIndex(cycle, today);
  const todayOverride = overrides.find((o) => o.date === today);
  const isClosed = todayPlan?.status === 'closed';
  const healthGateEnabled = cycle.healthGateEnabled;
  const healthRequired = healthGateEnabled && !healthPassed;

  // 最近统计
  const recentLowDays = countRecentLowCompletion(recentCheckIns);
  const unclosedDays = countUnclosedDays(allPlans, today);

  // --- 健康前置 ---
  const handleHealthPass = () => {
    setHealthPassed(true);
  };

  // --- 申请当日特例 ---
  const handleDayException = () => {
    setHealthException(true);
    setHealthPassed(true);
    if (todayPlan) {
      const updated = { ...todayPlan, healthGateStatus: 'exception' as const };
      savePlan(updated);
      setTodayPlan(updated);
    }
  };

  // --- 输入暗号 ---
  const handlePhraseSubmit = () => {
    const phrase = cycle.launchPhrase || t('cycle.defaultLaunchPhrase');
    if (phraseInput.trim() !== phrase) {
      setPhraseError(t('dashboard.phraseError'));
      return;
    }
    setPhraseError('');

    // 检查是否今天已有计划
    const existing = allPlans.find((p) => p.date === today);
    if (existing) {
      const resumed = existing.status === 'notStarted'
        ? { ...existing, status: 'active' as const }
        : existing;
      if (resumed !== existing) savePlan(resumed);
      setTodayPlan(resumed);
      navigate('/today');
      return;
    }

    // 生成计划
    const generated = generateDailyPlan(cycle, goals, today, allPlans, recentCheckIns, overrides, healthPassed || !healthGateEnabled);
    const plan = healthException
      ? { ...generated, healthGateStatus: 'exception' as const }
      : generated;
    savePlan(plan);
    setTodayPlan(plan);
    setAllPlans((prev) => [...prev, plan]);
    navigate('/today');
  };

  // --- 渲染今日状态 ---
  const renderTodayStatus = () => {
    if (isClosed) {
      return (
        <div className="alert alert-success">
          ✅ {t('dashboard.closedMessage')}<br />
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={() => navigate('/today')}>
            {t('dashboard.viewFeedback')}
          </button>
        </div>
      );
    }

    if (todayOverride) {
      return (
        <div className="alert alert-info">
          📌 {t('dashboard.specialDay', {
            mode: t(MODE_KEYS[todayOverride.mode]),
            reason: todayOverride.reason,
          })}
        </div>
      );
    }

    if (!isTodayStudyDay) {
      return (
        <div className="alert alert-info">
          🌿 {t('dashboard.restMessage')}<br />
          {t('dashboard.markSpecialHint')}
        </div>
      );
    }

    if (healthRequired) {
      return (
        <div className="card">
          <div className="card-title">🏃 {t('dashboard.healthGate')}</div>
          <div className="card-body" style={{ marginTop: '8px' }}>
            <p>{cycle.healthGateText || t('dashboard.defaultHealthGate')}</p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-success" onClick={handleHealthPass}>✅ {t('dashboard.healthDone')}</button>
              <button className="btn btn-secondary" onClick={handleDayException}>🔓 {t('dashboard.healthException')}</button>
            </div>
          </div>
        </div>
      );
    }

    if (todayPlan && todayPlan.status !== 'notStarted') {
      return (
        <div className="alert alert-success">
          📋 {t('dashboard.planGenerated')}
          <button className="btn btn-primary btn-sm" style={{ marginLeft: '8px' }} onClick={() => navigate('/today')}>
            {t('dashboard.enterPlan')}
          </button>
        </div>
      );
    }

    // 等待输入暗号
    return (
      <div className="card">
        <div className="card-title">🔑 {t('dashboard.launchPhrase')}</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            {t('dashboard.launchHint')}
          </p>
          <div className="phrase-input-wrap">
            <input
              className="form-input"
              type="text"
              placeholder={t('dashboard.launchPlaceholder')}
              value={phraseInput}
              onChange={(e) => { setPhraseInput(e.target.value); setPhraseError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePhraseSubmit()}
            />
            <button className="btn btn-primary" onClick={handlePhraseSubmit}>{t('dashboard.launch')}</button>
          </div>
          {phraseError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '8px' }}>{phraseError}</p>}
        </div>
      </div>
    );
  };

  // --- 节奏概览 ---
  const renderRhythmOverview = () => {
    const recent7 = recentCheckIns.filter((c) => {
      const d = new Date(c.date);
      const t = new Date(today);
      const diff = Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff < 7;
    });

    return (
      <div className="card">
        <div className="card-title">📊 {t('dashboard.recentRhythm')}</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          {recent7.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>{t('common.none')}</p>
          ) : (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {recent7.map((ci) => {
                const rhythmColors: Record<string, string> = {
                  ahead: 'var(--color-success)',
                  stable: 'var(--color-primary)',
                  slightlyBehind: 'var(--color-warning)',
                  behind: '#d4a04a',
                  slipping: 'var(--color-danger)',
                };
                return (
                  <div
                    key={ci.id}
                    title={`${ci.date}: ${ci.todayCompletionPercent}% - ${t(RHYTHM_KEYS[ci.rhythmStatus])}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: rhythmColors[ci.rhythmStatus] || '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-bg)',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {ci.todayCompletionPercent}%
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 警告 ---
  const renderWarnings = () => {
    const warnings: string[] = [];
    if (recentLowDays >= 2) {
      warnings.push(t('dashboard.lowCompletionWarning'));
    }
    if (unclosedDays >= 3) {
      warnings.push(t('dashboard.unclosedWarning'));
    }
    if (activeGoals.length > 5) {
      warnings.push(t('dashboard.tooManyGoalsWarning', { count: activeGoals.length }));
    }

    if (warnings.length === 0) return null;
    return (
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        {warnings.map((w, i) => (
          <div key={i} className="alert alert-warning">{w}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">📚 {cycle.name}</h1>
      <p className="page-subtitle">
        {today} · {t('dashboard.dayIndex', { count: dayIdx })} · {isTodayStudyDay ? `📖 ${t('dashboard.studyDay')}` : `🌿 ${t('dashboard.restDay')}`} · {t('dashboard.cycleProgress', { percent: cycleProgress })}
      </p>

      {renderWarnings()}
      {renderTodayStatus()}

      <details className="learning-overview"><summary>{t('ui.reviewDetails')}</summary>
      <div className="grid-2">
        <div className="card stat-card">
          <div className="stat-value">{cycleProgress}%</div>
          <div className="stat-label">{t('dashboard.totalProgress')}</div>
          <div className="progress-bar" style={{ marginTop: '8px' }}>
            <div className="progress-bar-fill progress-fill-primary" style={{ width: `${cycleProgress}%` }} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{activeGoals.length}</div>
          <div className="stat-label">{t('dashboard.activeGoalCount')}</div>
        </div>
      </div>

      {renderRhythmOverview()}
      </details>

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings')}>
          {t('dashboard.markToday')}
        </button>
      </div>
    </div>
  );
}
