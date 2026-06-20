import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getGoals, getPlans } from '../storage';
import { calculateCycleProgress, calculateGoalProgress, countRecentLowCompletion, getStreakDays, isMinimumCompleted } from '../progress';
import { todayStr } from '../types';
import { useI18n } from '../i18n/I18nProvider';

export default function Review() {
  const { t } = useI18n();
  const cycle = getActiveCycle();
  const navigate = useNavigate();
  if (!cycle) return <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">{t('goal.needCycle')}</div><button className="btn btn-primary" onClick={() => navigate('/')}>{t('common.backHome')}</button></div>;

  const goals = getGoals(cycle.id);
  const activeGoals = goals.filter((goal) => goal.isActive);
  const plans = getPlans(cycle.id);
  const checkIns = getCheckIns(cycle.id);
  const cycleProgress = calculateCycleProgress(activeGoals);
  const totalDays = plans.length;
  const closedDays = plans.filter((plan) => plan.status === 'closed').length;
  const restDays = plans.filter((plan) => ['rest', 'holiday'].includes(plan.mode)).length;
  const blockedDays = plans.filter((plan) => plan.mode === 'blocked').length;
  const minimumDays = plans.filter((plan) => plan.status === 'closed' && isMinimumCompleted(plan)).length;
  const streakDays = getStreakDays(plans, todayStr());
  const recentLowDays = countRecentLowCompletion(checkIns, 40, 14);
  const recent7 = [...checkIns].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse();
  const trendValues = recent7.map((checkIn) => checkIn.todayCompletionPercent);
  const trendUp = trendValues.length >= 2 && trendValues[trendValues.length - 1] > trendValues[0];
  const suggestions: string[] = [];
  if (recentLowDays >= 3) suggestions.push(`⚠️ ${t('review.lowCompletionSuggestion', { count: recentLowDays })}`);
  if (activeGoals.length > 4) suggestions.push(`📋 ${t('review.tooManyGoalsSuggestion', { count: activeGoals.length })}`);
  if (plans.filter((plan) => plan.healthGateStatus === 'exception').length >= 3) suggestions.push(`🏃 ${t('review.healthSuggestion')}`);
  if (cycleProgress < 30 && totalDays > 14) suggestions.push(`📉 ${t('review.slowProgressSuggestion')}`);
  if (closedDays === 0 && totalDays > 3) suggestions.push(`💡 ${t('review.noCloseSuggestion')}`);
  if (suggestions.length === 0) suggestions.push(`✅ ${t('review.healthySuggestion')}`);

  const stats = [
    [`${cycleProgress}%`, 'dashboard.totalProgress'], [streakDays, 'review.streak'], [`${closedDays}/${totalDays}`, 'review.closedTotal'],
    [restDays, 'review.restCount'], [blockedDays, 'review.blockedCount'], [minimumDays, 'review.minimumCount'],
  ] as const;

  return <div>
    <h1 className="page-title">📊 {t('review.title')}</h1><p className="page-subtitle">{t('review.subtitle')}</p>
    <div className="card"><div className="card-title">📈 {t('review.overview')}</div><div className="grid-3" style={{ marginTop: '12px' }}>{stats.map(([value, key]) => <div className="stat-card" key={key}><div className="stat-value">{value}</div><div className="stat-label">{t(key)}</div></div>)}</div></div>
    <div className="card"><div className="card-title">🎯 {t('review.goalProgress')}</div><div className="card-body" style={{ marginTop: '8px' }}>
      {goals.map((goal) => { const progress = calculateGoalProgress(goal); return <div key={goal.id} style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px', flexWrap: 'wrap' }}><span style={{ fontSize: '0.9rem' }}>{goal.name}{!goal.isActive && <span className="badge badge-neutral" style={{ marginLeft: '6px' }}>{t('common.disabled')}</span>}</span><span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{progress}% ({goal.completedAmount}/{goal.totalAmount} {goal.unitName})</span></div>
        <div className="progress-bar"><div className="progress-bar-fill progress-fill-primary" style={{ width: `${progress}%` }} /></div>
      </div>; })}
      {goals.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>{t('review.noGoals')}</p>}
    </div></div>
    <div className="card"><div className="card-title">📉 {t('review.trend')}</div><div className="card-body" style={{ marginTop: '8px' }}>
      {recent7.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>{t('common.none')}</p> : <div><div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '8px 0' }}>{recent7.map((checkIn) => <div key={checkIn.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{checkIn.todayCompletionPercent}%</span><div style={{ width: '100%', height: `${Math.max(4, checkIn.todayCompletionPercent)}%`, background: checkIn.todayCompletionPercent >= 60 ? 'var(--color-success)' : checkIn.todayCompletionPercent >= 30 ? 'var(--color-warning)' : 'var(--color-danger)', borderRadius: '4px 4px 0 0', minHeight: '4px' }} /><span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{checkIn.date.slice(5)}</span></div>)}</div>
        {trendValues.length >= 2 && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>{trendUp ? `📈 ${t('review.trendUp')}` : `📉 ${t('review.trendDown')}`}</p>}</div>}
    </div></div>
    <div className="card"><div className="card-title">💡 {t('review.suggestions')}</div><div className="card-body" style={{ marginTop: '8px' }}>{suggestions.map((suggestion) => <p key={suggestion} style={{ marginBottom: '8px', lineHeight: 1.8 }}>{suggestion}</p>)}</div></div>
  </div>;
}
