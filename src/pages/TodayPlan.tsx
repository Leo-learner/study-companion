import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getGoals, getPlanForDate, saveCheckIn, savePlan } from '../storage';
import {
  calculateCycleProgress, calculateExpectedProgress, calculateTodayCompletion,
  countRecentLowCompletion, detectRhythmStatus, isMinimumCompleted,
} from '../progress';
import { CheckIn, DailyPlan, generateId, StudyGoal, TaskItem, todayStr, UserState } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { buildCheckInMessages } from '../checkinMessages';
import Icon from '../components/Icon';
import { ModeChip, StateOption, STATE_NOTE_KEYS } from '../components/StatusChips';
import CheckInResult from '../components/CheckInResult';

const STATES: UserState[] = ['good', 'normal', 'tired', 'bad'];

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
  const [optOpen, setOptOpen] = useState(false);
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

  if (!cycle) {
    return (
      <div className="empty">
        <div className="empty-mark"><Icon name="book" size={30} /></div>
        <h1 className="h2">{t('goal.needCycle')}</h1>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </div>
    );
  }

  if (!plan) {
    return (
      <>
        <div className="page-head">
          <h1 className="h1">{t('today.title')}</h1>
          <div className="sub">{today}</div>
        </div>
        <div className="notice" style={{ background: 'var(--sc-primary-soft)' }}>
          <Icon name="spark" size={18} style={{ marginTop: 2, color: 'var(--sc-primary)' }} />
          <div className="notice-body pretty">{t('today.noPlan')}</div>
        </div>
        <button className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/')}>
          {t('common.backHome')}
        </button>
      </>
    );
  }

  if (checkInResult) {
    return <CheckInResult checkIn={checkInResult} plan={plan} cycle={cycle} />;
  }

  const isClosed = plan.status === 'closed';
  const activeGoals = goals.filter((g) => g.isActive);

  const persist = (next: DailyPlan) => { setPlan(next); savePlan(next); };

  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    if (isClosed) return;
    persist({ ...plan, tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)) });
  };

  const setAmount = (task: TaskItem, amount: number) => {
    const next = Math.max(0, Math.min(amount, task.targetAmount));
    const status: TaskItem['status'] =
      next >= task.targetAmount ? 'completed' : next > 0 ? 'partial' : 'notStarted';
    updateTask(task.id, { completionAmount: next, status });
  };

  /** 步进：目标量大的（刷题）按 5% 走，量小的（1 篇）按 1 走。 */
  const stepFor = (task: TaskItem) => Math.max(1, Math.round(task.targetAmount / 20));

  const handleClose = () => {
    if (isClosed) return;
    const todayCompletionPercent = calculateTodayCompletion(plan);
    const cumulativeCompletionPercent = calculateCycleProgress(activeGoals);
    const expectedProgressPercent = calculateExpectedProgress(cycle, today);
    const rhythmStatus = detectRhythmStatus(
      cumulativeCompletionPercent, expectedProgressPercent, countRecentLowCompletion(getCheckIns(cycle.id)),
    );
    const feedback = buildCheckInMessages(isMinimumCompleted(plan), rhythmStatus, userState);
    const checkIn: CheckIn = {
      id: generateId(), cycleId: cycle.id, planId: plan.id, date: today, userState,
      todayCompletionPercent, cumulativeCompletionPercent, expectedProgressPercent, rhythmStatus,
      summary: feedback.summary, summaryMessage: feedback.summaryMessage,
      suggestion: feedback.suggestion, suggestionMessages: feedback.suggestionMessages,
      blockers, isClosed: true, createdAt: new Date().toISOString(),
    };
    saveCheckIn(checkIn);
    const closed = { ...plan, status: 'closed' as const, userState, notes, blockers, closedAt: new Date().toISOString() };
    savePlan(closed);
    setPlan(closed);
    setCheckInResult(checkIn);
  };

  const minTasks = plan.tasks.filter((task) => task.level === 'minimum');
  const recTasks = plan.tasks.filter((task) => task.level === 'recommended');
  const optTasks = plan.tasks.filter((task) => task.level === 'optional');
  const optRemaining = optTasks.filter((task) => task.status !== 'completed' && task.status !== 'skipped').length;
  const mainGoals = plan.mainGoalIds
    .map((id) => goals.find((goal) => goal.id === id))
    .filter(Boolean) as StudyGoal[];
  const goalName = (task: TaskItem) => goals.find((g) => g.id === task.goalId)?.name;

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{t('today.title')}</h1>
        <div className="page-meta">
          <span style={{ whiteSpace: 'nowrap' }}>{today}</span>
          <span className="dot-sep">·</span>
          <ModeChip mode={plan.mode} />
        </div>
      </div>

      {isClosed && (
        <div className="notice" style={{ background: 'var(--sc-primary-soft)' }}>
          <Icon name="check" size={18} style={{ marginTop: 2, color: 'var(--sc-primary)' }} />
          <div className="notice-body pretty">{t('today.closed')}</div>
        </div>
      )}

      {/* 计划理由：用户信任系统的唯一理由，必须显眼可读 */}
      {plan.generatedReason && (
        <div className="why">
          <div className="why-label">
            <Icon name="spark" size={15} />
            {t('today.whyLabel')}
          </div>
          <div className="why-body pretty">{resolveMessage(plan.generatedReasonMessage, plan.generatedReason)}</div>
          {mainGoals.length > 0 && (
            <div className="why-foot">
              <span style={{ fontSize: 11.5, color: 'var(--sc-ink-2)' }}>{t('home.mainGoal')}</span>
              {mainGoals.map((goal) => (
                <span className="chip chip-solid" key={goal.id}>{goal.name}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 保底档：整屏最重的一块 —— 完成它就算今天没有断线 */}
      {minTasks.length > 0 && (
        <div className="stack-10">
          <div className="level-head level-min">
            <Icon name="min" size={17} />
            {t('today.levelMin')}
          </div>
          {minTasks.map((task) => {
            const pct = task.targetAmount ? Math.round((task.completionAmount / task.targetAmount) * 100) : 0;
            const step = stepFor(task);
            return (
              <div className="task-min" key={task.id}>
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div className="col" style={{ flex: 1, gap: 6 }}>
                    <div className="task-min-title">{resolveMessage(task.titleMessage, task.title)}</div>
                    <div className="task-min-meta">
                      {goalName(task) ? `${goalName(task)} · ` : ''}
                      {t('today.target', { amount: task.targetAmount, unit: task.unitName })}
                    </div>
                  </div>
                  <div
                    className="task-min-ring"
                    style={{ background: `conic-gradient(var(--sc-on-primary) ${pct * 3.6}deg, rgba(255,255,255,.22) 0)` }}
                  >
                    <div className="task-min-ring-inner">{pct}%</div>
                  </div>
                </div>

                <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span className="task-min-count">{task.completionAmount}</span>
                  <span style={{ fontSize: 14, opacity: .8 }}>/ {task.targetAmount} {task.unitName}</span>
                  <span className="spacer" />
                  <span style={{ fontSize: 12, opacity: .85 }}>
                    {task.status === 'completed'
                      ? t('task.status.completed')
                      : t('today.remaining', { count: task.targetAmount - task.completionAmount, unit: task.unitName })}
                  </span>
                </div>

                {!isClosed && (
                  <div className="row-wrap" style={{ gap: 8 }}>
                    <button
                      className="btn btn-sq btn-on-primary"
                      aria-label={t('common.decrease')}
                      onClick={() => setAmount(task, task.completionAmount - step)}
                    >
                      <Icon name="minus" size={18} />
                    </button>
                    <button
                      className="btn btn-on-primary"
                      style={{ flex: 1, minWidth: 76, borderRadius: 'var(--sc-r2)' }}
                      onClick={() => setAmount(task, task.completionAmount + step)}
                    >
                      <Icon name="plus" size={17} />
                      {step}
                    </button>
                    <button
                      className="btn btn-invert"
                      style={{ flex: 1.4, minWidth: 112, borderRadius: 'var(--sc-r2)' }}
                      onClick={() => setAmount(task, task.targetAmount)}
                    >
                      <Icon name="check" size={17} />
                      {t('today.markDone')}
                    </button>
                  </div>
                )}

                <div className="task-min-note pretty">{t('today.minNote')}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* 推荐档：白卡 + 苔绿左脊，跳过没有惩罚 */}
      {recTasks.length > 0 && (
        <div className="stack-10">
          <div className="level-head level-rec">
            <Icon name="rec" size={17} />
            {t('today.levelRec')}
          </div>
          {recTasks.map((task) => {
            const pct = task.targetAmount ? Math.round((task.completionAmount / task.targetAmount) * 100) : 0;
            const step = stepFor(task);
            const skipped = task.status === 'skipped';
            return (
              <div className={`task-rec${skipped ? ' task-skipped' : ''}`} key={task.id}>
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div className="col" style={{ flex: 1, gap: 5 }}>
                    <div className="task-rec-title">{resolveMessage(task.titleMessage, task.title)}</div>
                    <div className="note">
                      {goalName(task) ? `${goalName(task)} · ` : ''}
                      {t('today.target', { amount: task.targetAmount, unit: task.unitName })}
                    </div>
                  </div>
                  <span className={`chip ${task.status === 'completed' ? 'chip-primary' : skipped ? 'chip-opt' : 'chip-rec'}`}>
                    {t(`task.status.${task.status}` as never)}
                  </span>
                </div>

                <div className="bar bar-sm">
                  <div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--sc-rec)' }} />
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <span className="tnum" style={{ fontSize: 12.5, color: 'var(--sc-ink-2)' }}>
                    {task.completionAmount} / {task.targetAmount} {task.unitName}
                  </span>
                  <span className="spacer" />
                  {!isClosed && (
                    <>
                      <button
                        className="btn btn-quiet btn-sm"
                        style={{ width: 40, padding: 0 }}
                        aria-label={t('common.decrease')}
                        onClick={() => setAmount(task, task.completionAmount - step)}
                      >
                        <Icon name="minus" size={17} />
                      </button>
                      <button className="btn btn-quiet btn-sm" onClick={() => setAmount(task, task.completionAmount + step)}>
                        <Icon name="plus" size={16} />
                        {step}
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ color: 'var(--sc-ink-3)' }}
                        onClick={() => updateTask(task.id, skipped
                          ? { status: task.completionAmount > 0 ? 'partial' : 'notStarted' }
                          : { status: 'skipped', completionAmount: 0 })}
                      >
                        <Icon name="skip" size={16} />
                        {t('today.skip')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 可选档：默认折叠 —— 看不见 = 没压力 */}
      {optTasks.length > 0 && (
        <div className="stack-10">
          <button type="button" className="opt-toggle" aria-expanded={optOpen} onClick={() => setOptOpen((v) => !v)}>
            <Icon name="opt" size={17} style={{ color: 'var(--sc-opt)' }} />
            <span style={{ flex: 1 }}>
              {optOpen
                ? t('today.optSummaryOpen')
                : optRemaining === 0
                  ? t('today.optSummaryDone')
                  : t('today.optSummary', { count: optRemaining })}
            </span>
            <span className={`chev${optOpen ? ' open' : ''}`} style={{ display: 'flex' }}>
              <Icon name="chev" size={17} />
            </span>
          </button>

          {optOpen && (
            <>
              {optTasks.map((task) => (
                <div className={`task-opt${task.status === 'completed' ? ' task-skipped' : ''}`} key={task.id}>
                  <div className="col" style={{ flex: 1, gap: 4 }}>
                    <div style={{ fontSize: 14.5, color: 'var(--sc-ink)', lineHeight: 1.45 }}>
                      {resolveMessage(task.titleMessage, task.title)}
                    </div>
                    <div className="note">
                      {goalName(task) ? `${goalName(task)} · ` : ''}
                      {t('today.target', { amount: task.targetAmount, unit: task.unitName })}
                    </div>
                  </div>
                  {!isClosed && (
                    <button
                      className="btn btn-sq"
                      style={{ background: 'var(--sc-opt-soft)', color: 'var(--sc-opt)', border: 'none' }}
                      aria-label={t('today.markDone')}
                      onClick={() => setAmount(task, task.status === 'completed' ? 0 : task.targetAmount)}
                    >
                      <Icon name="check" size={18} />
                    </button>
                  )}
                </div>
              ))}
              <div className="note" style={{ padding: '0 4px' }}>{t('today.optNote')}</div>
            </>
          )}
        </div>
      )}

      {plan.tasks.length === 0 && (
        <div className="empty">
          <div className="empty-mark"><Icon name="rest" size={30} /></div>
          <h2 className="h2">{t('today.noTasks')}</h2>
          <p className="pretty muted">{resolveMessage(plan.generatedReasonMessage, plan.generatedReason)}</p>
        </div>
      )}

      {/* 收工前确认 */}
      {!isClosed && plan.status !== 'notStarted' && (
        <div className="card">
          <div className="row" style={{ gap: 9 }}>
            <Icon name="note" size={17} style={{ color: 'var(--sc-primary)' }} />
            <span className="h3">{t('today.wrapTitle')}</span>
          </div>

          <div className="stack-8">
            <div style={{ fontSize: 12.5, color: 'var(--sc-ink-2)' }}>{t('today.state')}</div>
            <div className="row-wrap" style={{ gap: 8 }}>
              {STATES.map((state) => (
                <StateOption key={state} state={state} selected={userState === state} onPick={() => setUserState(state)} />
              ))}
            </div>
            <div className="note">{t(STATE_NOTE_KEYS[userState])}</div>
          </div>

          <div className="field">
            <label className="label" htmlFor="today-note">{t('goal.notes')}</label>
            <textarea
              id="today-note"
              className="textarea"
              value={notes}
              rows={2}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t('today.notesPlaceholder')}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="today-block">{t('today.blockers')}</label>
            <input
              id="today-block"
              className="input"
              value={blockers}
              onChange={(event) => setBlockers(event.target.value)}
              placeholder={t('today.blockersPlaceholder')}
            />
            <div className="note">{t('today.blockHint')}</div>
          </div>

          <button className="btn btn-primary btn-hero btn-block" onClick={handleClose}>
            <Icon name="check" size={19} />
            {t('today.close')}
          </button>
          <div className="note" style={{ textAlign: 'center' }}>{t('today.finishHint')}</div>
        </div>
      )}
    </>
  );
}
