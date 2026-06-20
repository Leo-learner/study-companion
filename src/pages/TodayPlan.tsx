import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getGoals, getPlanForDate, saveCheckIn, savePlan } from '../storage';
import { calculateCycleProgress, calculateExpectedProgress, calculateTodayCompletion, countRecentLowCompletion, detectRhythmStatus, isMinimumCompleted } from '../progress';
import { CheckIn, DailyPlan, generateId, RhythmStatus, StudyGoal, TaskItem, todayStr, UserState } from '../types';
import { TranslationKey } from '../i18n/messages';
import { useI18n } from '../i18n/I18nProvider';
import { buildCheckInMessages } from '../checkinMessages';

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
    setPlan(getPlanForDate(cycleId, today) || null);
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

  const renderTask = (task: TaskItem) => {
    const goal = goals.find((item) => item.id === task.goalId);
    const icon = task.level === 'minimum' ? '🔹 ' : task.level === 'recommended' ? '📌 ' : '💡 ';
    return <div key={task.id} className={`task-item ${task.level}`}>
      <div className="task-check"><input type="checkbox" checked={task.status === 'completed'} onChange={() => toggleTask(task)} disabled={isClosed} /></div>
      <div className="task-content">
        <div className="task-title">{icon}{resolveMessage(task.titleMessage, task.title)}</div>
        {task.description && <div className="task-desc">{resolveMessage(task.descriptionMessage, task.description)}</div>}
        <div className="task-meta">
          {goal && `${goal.name} · `}{t('today.target', { amount: task.targetAmount, unit: task.unitName })}
          {task.status === 'partial' && ` · ${t('today.completed', { amount: task.completionAmount })}`}
        </div>
      </div>
      <div className="task-amount">
        {task.status !== 'skipped' && task.targetAmount > 0 && <input className="task-amount-input" type="number" min={0} max={task.targetAmount} value={task.completionAmount} onChange={(event) => updateTaskAmount(task.id, Number(event.target.value))} disabled={isClosed} />}
        {!isClosed && <button className="btn btn-secondary btn-sm" style={{ marginLeft: '4px', fontSize: '0.7rem' }} onClick={() => updateTask(task.id, { status: 'skipped', completionAmount: 0 })} title={t('today.skipTitle')}>{t('today.skip')}</button>}
      </div>
    </div>;
  };

  const minTasks = plan.tasks.filter((task) => task.level === 'minimum');
  const recommendedTasks = plan.tasks.filter((task) => task.level === 'recommended');
  const optionalTasks = plan.tasks.filter((task) => task.level === 'optional');
  const mainGoals = plan.mainGoalIds.map((id) => goals.find((goal) => goal.id === id)).filter(Boolean) as StudyGoal[];
  const modeKey = `plan.mode.${plan.mode}` as TranslationKey;
  const stateIcons: Record<UserState, string> = { good: '😊', normal: '😐', tired: '😔', bad: '😞' };

  return <div>
    <h1 className="page-title">📋 {t('today.title')}</h1>
    <p className="page-subtitle">{today} · {t(modeKey)}</p>
    {plan.generatedReason && <div className="alert alert-info">{resolveMessage(plan.generatedReasonMessage, plan.generatedReason)}</div>}
    {isClosed && <div className="alert alert-success">✅ {t('today.closed')}</div>}
    {mainGoals.length > 0 && <div className="card"><div className="card-title">🎯 {t('today.mainGoal')}</div><div className="card-body">{mainGoals.map((goal) => <span key={goal.id} className="badge badge-primary" style={{ marginRight: '8px' }}>{goal.name}</span>)}</div></div>}
    {minTasks.length > 0 && <TaskGroup heading={`🔹 ${t('today.minimumHeading')}`} color="var(--color-primary-dark)">{minTasks.map(renderTask)}</TaskGroup>}
    {recommendedTasks.length > 0 && <TaskGroup heading={`📌 ${t('today.recommendedHeading')}`} color="var(--color-success)">{recommendedTasks.map(renderTask)}</TaskGroup>}
    {optionalTasks.length > 0 && <TaskGroup heading={`💡 ${t('today.optionalHeading')}`} color="var(--color-text-muted)">{optionalTasks.map(renderTask)}</TaskGroup>}
    {plan.tasks.length === 0 && <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-title">{t('today.noTasks')}</div><div className="empty-state-desc">{resolveMessage(plan.generatedReasonMessage, plan.generatedReason)}</div></div>}
    {!isClosed && plan.status !== 'notStarted' && <div className="card">
      <div className="card-title">📝 {t('today.closeTitle')}</div>
      <div className="card-body">
        <div className="form-group"><label className="form-label">{t('today.state')}</label><div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{(['good', 'normal', 'tired', 'bad'] as UserState[]).map((state) => <button key={state} className={`btn btn-sm ${userState === state ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUserState(state)}>{stateIcons[state]} {t(`today.state.${state}`)}</button>)}</div></div>
        <div className="form-group"><label className="form-label">{t('goal.notes')}</label><textarea className="form-textarea" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('today.notesPlaceholder')} /></div>
        <div className="form-group"><label className="form-label">{t('today.blockers')}</label><input className="form-input" value={blockers} onChange={(event) => setBlockers(event.target.value)} placeholder={t('today.blockersPlaceholder')} /></div>
        <button className="btn btn-success btn-lg btn-block" onClick={handleClose}>✅ {t('today.close')}</button>
        <p className="form-hint" style={{ textAlign: 'center' }}>{t('today.closeHint')}</p>
      </div>
    </div>}
  </div>;
}

function TaskGroup({ heading, color, children }: { heading: string; color: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '16px' }}><h3 style={{ fontSize: '1rem', marginBottom: '8px', color }}>{heading}</h3>{children}</div>;
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
