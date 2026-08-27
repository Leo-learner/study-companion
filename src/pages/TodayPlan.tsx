import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getGoals, getPlanForDate, saveCheckIn, savePlan } from '../storage';
import { calculateCycleProgress, calculateExpectedProgress, calculateTodayCompletion, countRecentLowCompletion, detectRhythmStatus, isMinimumCompleted } from '../progress';
import { CheckIn, DailyPlan, generateId, RhythmStatus, StudyGoal, TaskItem, todayStr, UserState } from '../types';
import { TranslationKey } from '../i18n/messages';
import { useI18n } from '../i18n/I18nProvider';
import { buildCheckInMessages } from '../checkinMessages';
import StudyTask, { taskGroupQuantity } from '../components/StudyTask';
import Icon from '../components/Icon';

export default function TodayPlan() {
  const { t, resolveMessage } = useI18n();
  const cycle = getActiveCycle();
  const cycleId = cycle?.id;
  const today = todayStr();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [userState, setUserState] = useState<UserState>('normal');
  const [notes, setNotes] = useState('');
  const [blockers, setBlockers] = useState('');
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<CheckIn | null>(null);

  useEffect(() => {
    if (!cycleId) return;
    const saved = getPlanForDate(cycleId, today);
    setPlan(saved || null);
    setUserState(saved?.userState || 'normal');
    setNotes(saved?.notes || '');
    setBlockers(saved?.blockers || '');
    setGoals(getGoals(cycleId));
  }, [cycleId, today]);

  if (!cycle) return <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">{t('goal.needCycle')}</div><button className="btn btn-primary" onClick={() => navigate('/')}>{t('common.backHome')}</button></div>;
  if (!plan) return <div><h1 className="page-title">📋 {t('today.title')}</h1><div className="alert alert-info">{t('today.noPlan')}</div><button className="btn btn-primary" onClick={() => navigate('/')}>🏠 {t('common.backHome')}</button></div>;

  const isClosed = plan.status === 'closed';
  const activeGoals = goals.filter((goal) => goal.isActive);

  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    if (isClosed) return;
    const updated = { ...plan, tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, ...updates } : task) };
    setPlan(updated);
    savePlan(updated);
  };

  const updateTaskAmount = (taskId: string, amount: number) => {
    const task = plan.tasks.find((item) => item.id === taskId);
    if (!task || isClosed) return;
    const newAmount = Math.max(0, Math.min(amount, task.targetAmount));
    const status: TaskItem['status'] = newAmount >= task.targetAmount ? 'completed' : newAmount > 0 ? 'partial' : 'notStarted';
    updateTask(taskId, { completionAmount: newAmount, status });
  };

  const toggleTask = (task: TaskItem) => {
    if (isClosed) return;
    const status: TaskItem['status'] = task.status === 'completed' ? 'notStarted' : 'completed';
    updateTask(task.id, { status, completionAmount: status === 'completed' ? task.targetAmount : 0 });
  };

  const handleClose = () => {
    if (isClosed) return;
    const todayCompletionPercent = calculateTodayCompletion(plan);
    const cumulativeCompletionPercent = calculateCycleProgress(activeGoals);
    const expectedProgressPercent = calculateExpectedProgress(cycle, today);
    const rhythmStatus = detectRhythmStatus(cumulativeCompletionPercent, expectedProgressPercent, countRecentLowCompletion(getCheckIns(cycle.id)));
    const minimumComplete = isMinimumCompleted(plan);
    const feedback = buildCheckInMessages(minimumComplete, rhythmStatus, userState);
    const checkIn: CheckIn = {
      id: generateId(), cycleId: cycle.id, planId: plan.id, date: today, userState,
      todayCompletionPercent, cumulativeCompletionPercent, expectedProgressPercent, rhythmStatus,
      summary: feedback.summary, summaryMessage: feedback.summaryMessage,
      suggestion: feedback.suggestion, suggestionMessages: feedback.suggestionMessages,
      blockers, isClosed: true, createdAt: new Date().toISOString(),
    };
    saveCheckIn(checkIn);
    const updatedPlan = { ...plan, status: 'closed' as const, userState, notes, blockers, closedAt: new Date().toISOString() };
    savePlan(updatedPlan);
    setPlan(updatedPlan);
    setCheckInResult(checkIn);
    setShowCheckIn(true);
  };

  if (showCheckIn && checkInResult) return <CheckInResultView checkIn={checkInResult} plan={plan} cycle={cycle} />;

  const minTasks = plan.tasks.filter(task => task.level === 'minimum');
  const recommendedTasks = plan.tasks.filter(task => task.level === 'recommended');
  const optionalTasks = plan.tasks.filter(task => task.level === 'optional');
  const renderTask = (task: TaskItem, primary = false) => <StudyTask key={task.id} task={task} primary={primary} closed={isClosed} onToggle={toggleTask} onAmount={updateTaskAmount} onUpdate={updateTask}/>;
  const renderGroup = (tasks: TaskItem[], label: TranslationKey) => {
    if (!tasks.length) return null;
    const quantity = taskGroupQuantity(tasks);
    return <details className="task-disclosure">
      <summary><span>{t(label)} · {quantity ? `${quantity.amount} ${quantity.unit}` : t('ui.taskCount', {count: tasks.length})}</span><Icon name="chevron"/></summary>
      <div className="task-disclosure-content">{tasks.map(task => renderTask(task))}</div>
    </details>;
  };

  return <div className="today-page">
    <header className="today-heading"><h1 className="page-title">{t('today.title')}</h1><p className="page-subtitle">{t('ui.encouragement')}</p></header>
    {isClosed && <div className="alert alert-success" role="status">{t('today.closed')}</div>}
    <div className="today-workspace">
      <section className="today-primary" aria-label={t('ui.minimum')}>
        {minTasks.map(task => renderTask(task, true))}
        {!minTasks.length && <div className="card empty-state"><h2 className="empty-state-title">{t(plan.tasks.length ? 'ui.noMinimum' : 'today.noTasks')}</h2><p className="empty-state-desc">{resolveMessage(plan.generatedReasonMessage, plan.generatedReason)}</p></div>}
      </section>
      <aside className="today-secondary" aria-label={t('today.closeTitle')}>
        {(recommendedTasks.length > 0 || optionalTasks.length > 0) && <div className="task-disclosure-group">{renderGroup(recommendedTasks, 'ui.recommended')}{renderGroup(optionalTasks, 'ui.optional')}</div>}
        <details className="task-disclosure mood-disclosure">
          <summary><span>{t('ui.moodNotes')}</span><Icon name="chevron"/></summary>
          <div className="task-disclosure-content">
            <fieldset className="mood-fieldset" disabled={isClosed}><legend className="form-label">{t('today.state')}</legend><div className="mood-options">{(['good', 'normal', 'tired', 'bad'] as UserState[]).map(state => <button key={state} type="button" className={`btn btn-sm ${userState === state ? 'btn-selected' : 'btn-secondary'}`} aria-pressed={userState === state} onClick={() => setUserState(state)}>{t(`today.state.${state}`)}</button>)}</div></fieldset>
            <div className="form-group"><label className="form-label" htmlFor="today-notes">{t('goal.notes')}</label><textarea id="today-notes" className="form-textarea" value={notes} onChange={event => setNotes(event.target.value)} placeholder={t('today.notesPlaceholder')} disabled={isClosed}/></div>
            <div className="form-group"><label className="form-label" htmlFor="today-blockers">{t('today.blockers')}</label><input id="today-blockers" className="form-input" value={blockers} onChange={event => setBlockers(event.target.value)} placeholder={t('today.blockersPlaceholder')} disabled={isClosed}/></div>
          </div>
        </details>
        {plan.status !== 'notStarted' && <div className="today-finish"><button className="btn btn-secondary" type="button" onClick={handleClose} disabled={isClosed}>{isClosed ? t('common.closed') : t('ui.finish')}</button></div>}
      </aside>
    </div>
  </div>;
}

function CheckInResultView({ checkIn, plan, cycle }: { checkIn: CheckIn; plan: DailyPlan; cycle: ReturnType<typeof getActiveCycle> }) {
  const { t, resolveMessage } = useI18n();
  const navigate = useNavigate();
  const hideAmounts = cycle?.hideRawAmountsInFeedback ?? true;
  const suggestion = checkIn.suggestionMessages?.map((message) => resolveMessage(message, '')).filter(Boolean).join(' ') || checkIn.suggestion;
  return <div>
    <h1 className="page-title">✅ {t('today.feedbackTitle')}</h1>
    <p className="page-subtitle">{t('today.finishedSubtitle', { date: checkIn.date })}</p>
    <div className="card"><div className="grid-3">{[
      [checkIn.todayCompletionPercent, 'today.completion'], [checkIn.cumulativeCompletionPercent, 'today.cumulative'], [checkIn.expectedProgressPercent, 'today.expected'],
    ].map(([value, key]) => <div className="stat-card" key={key}><div className="percent-display" style={{ justifyContent: 'center' }}><span className="percent-number">{value}</span><span className="percent-sign">%</span></div><div className="stat-label">{t(key as TranslationKey)}</div></div>)}</div></div>
    <div className="card"><div className="card-title">📊 {t('today.summary')}</div><div className="card-body" style={{ marginTop: '8px' }}>
      <p style={{ marginBottom: '8px' }}>{t('today.rhythm')}<span className={`rhythm-indicator rhythm-${checkIn.rhythmStatus}`}>{t(`rhythm.${checkIn.rhythmStatus}`)}</span></p>
      <p>{resolveMessage(checkIn.summaryMessage, checkIn.summary)}</p>
      <p style={{ marginTop: '8px', color: 'var(--color-primary-dark)' }}>💬 {suggestion}</p>
      {checkIn.blockers && <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>🚫 {t('today.blockerLabel', { text: checkIn.blockers })}</p>}
    </div></div>
    {!hideAmounts && plan.tasks.length > 0 && <div className="card"><div className="card-title">📋 {t('today.amountDetails')}</div><div className="card-body">{plan.tasks.map((task) => <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}><span>{resolveMessage(task.titleMessage, task.title)}</span><span>{task.completionAmount}/{task.targetAmount} {task.unitName}</span></div>)}</div></div>}
    <div style={{ display: 'flex', gap: '12px' }}><button className="btn btn-primary" onClick={() => navigate('/')}>🏠 {t('common.backHome')}</button><button className="btn btn-secondary" onClick={() => navigate('/history')}>📅 {t('today.viewHistory')}</button></div>
  </div>;
}
