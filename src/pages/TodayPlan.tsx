import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getPlanForDate, getGoals, savePlan, getCheckIns, saveCheckIn, getOverrides } from '../storage';
import { generateDailyPlan } from '../planner';
import { calculateTodayCompletion, calculateCycleProgress, calculateExpectedProgress, detectRhythmStatus, countRecentLowCompletion, isMinimumCompleted } from '../progress';
import {
  DailyPlan,
  TaskItem,
  CheckIn,
  UserState,
  RhythmStatus,
  todayStr,
  generateId,
  StudyGoal,
} from '../types';

export default function TodayPlan() {
  const cycle = getActiveCycle();
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
    if (!cycle) return;
    const existing = getPlanForDate(cycle.id, today);
    setPlan(existing || null);
    setGoals(getGoals(cycle.id));
  }, [cycle, today]);

  if (!cycle) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">请先创建学习周期</div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  // 如果今天还没有计划，提供生成入口
  if (!plan) {
    return (
      <div>
        <h1 className="page-title">📋 今日任务</h1>
        <div className="alert alert-info">
          今天还没有生成学习计划。请先到首页输入暗号启动。
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>🏠 返回首页</button>
      </div>
    );
  }

  const isClosed = plan.status === 'closed';
  const activeGoals = goals.filter((g) => g.isActive);

  // --- 更新任务状态 ---
  const updateTask = (taskId: string, updates: Partial<TaskItem>) => {
    if (isClosed) return;
    const updated = {
      ...plan,
      tasks: plan.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
    };
    setPlan(updated);
    savePlan(updated);
  };

  // --- 更新任务完成量 ---
  const updateTaskAmount = (taskId: string, amount: number) => {
    if (isClosed) return;
    const task = plan.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newAmount = Math.max(0, Math.min(amount, task.targetAmount));
    const newStatus: TaskItem['status'] = newAmount >= task.targetAmount ? 'completed' : newAmount > 0 ? 'partial' : 'notStarted';
    updateTask(taskId, { completionAmount: newAmount, status: newStatus });
  };

  // --- 切换任务状态 ---
  const toggleTask = (task: TaskItem) => {
    if (isClosed) return;
    const newStatus: TaskItem['status'] = task.status === 'completed' ? 'notStarted' : 'completed';
    const newAmount = newStatus === 'completed' ? task.targetAmount : 0;
    updateTask(task.id, { status: newStatus, completionAmount: newAmount });
  };

  // --- 跳过任务 ---
  const skipTask = (taskId: string) => {
    if (isClosed) return;
    updateTask(taskId, { status: 'skipped', completionAmount: 0 });
  };

  // --- 收工 ---
  const handleClose = () => {
    if (!plan) return;

    const todayComp = calculateTodayCompletion(plan);
    const cumulativeProgress = calculateCycleProgress(activeGoals);
    const expectedProgress = calculateExpectedProgress(cycle, today);
    const recentCheckIns = getCheckIns(cycle.id);
    const recentLowDays = countRecentLowCompletion(recentCheckIns);
    const rhythmStatus = detectRhythmStatus(cumulativeProgress, expectedProgress, recentLowDays);
    const minCompleted = isMinimumCompleted(plan);

    // 生成总结
    let summary = '';
    let suggestion = '';

    if (minCompleted) {
      summary += '保底任务已完成，今天没有断线。';
    } else {
      summary += '保底任务未完成，但没关系，明天可以重新开始。';
    }

    switch (rhythmStatus) {
      case 'ahead':
        suggestion = '你现在略微领先，保持节奏即可，不需要加码。';
        break;
      case 'stable':
        suggestion = '节奏稳定，继续按今天这种强度推进。';
        break;
      case 'slightlyBehind':
        suggestion = '略低于标准，不需要补债，明天滚动调整。';
        break;
      case 'behind':
        suggestion = '已经明显落后，但不要一次性追赶，先用保底任务把线接回来。';
        break;
      case 'slipping':
        suggestion = '系统正在滑坡，建议降强度不断线，优先恢复节奏。';
        break;
    }

    if (userState === 'tired' || userState === 'bad') {
      suggestion = '今天状态不好，系统已自动降强度。完成保底任务就算成功。' + (suggestion ? ' ' + suggestion : '');
    }

    const checkIn: CheckIn = {
      id: generateId(),
      cycleId: cycle.id,
      planId: plan.id,
      date: today,
      userState,
      todayCompletionPercent: todayComp,
      cumulativeCompletionPercent: cumulativeProgress,
      expectedProgressPercent: expectedProgress,
      rhythmStatus,
      summary,
      suggestion,
      blockers,
      isClosed: true,
      createdAt: new Date().toISOString(),
    };

    saveCheckIn(checkIn);

    // 更新计划状态
    const updatedPlan = {
      ...plan,
      status: 'closed' as const,
      userState,
      notes,
      blockers,
      closedAt: new Date().toISOString(),
    };
    savePlan(updatedPlan);
    setPlan(updatedPlan);
    setCheckInResult(checkIn);
    setShowCheckIn(true);
  };

  // --- 收工后展示打卡反馈 ---
  if (showCheckIn && checkInResult) {
    return <CheckInResultView checkIn={checkInResult} plan={plan} cycle={cycle} />;
  }

  // --- 任务卡片渲染 ---
  const renderTask = (task: TaskItem) => {
    const isMin = task.level === 'minimum';
    const isOpt = task.level === 'optional';
    const goal = goals.find((g) => g.id === task.goalId);

    return (
      <div key={task.id} className={`task-item ${task.level}`}>
        <div className="task-check">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={() => toggleTask(task)}
            disabled={isClosed}
          />
        </div>
        <div className="task-content">
          <div className="task-title">
            {isMin && '🔹 '}
            {task.level === 'recommended' && '📌 '}
            {isOpt && '💡 '}
            {task.title}
          </div>
          {task.description && <div className="task-desc">{task.description}</div>}
          <div className="task-meta">
            {goal && `${goal.name} · `}
            目标: {task.targetAmount} {task.unitName}
            {task.status === 'partial' && ` · 已完成: ${task.completionAmount}`}
          </div>
        </div>
        <div className="task-amount">
          {task.status !== 'skipped' && task.targetAmount > 0 && (
            <input
              className="task-amount-input"
              type="number"
              min={0}
              max={task.targetAmount}
              value={task.completionAmount}
              onChange={(e) => updateTaskAmount(task.id, Number(e.target.value))}
              disabled={isClosed}
            />
          )}
          {!isClosed && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: '4px', fontSize: '0.7rem' }}
              onClick={() => skipTask(task.id)}
              title="跳过此任务"
            >
              跳过
            </button>
          )}
        </div>
      </div>
    );
  };

  const modeLabel: Record<string, string> = {
    normal: '📖 正常模式',
    light: '🌿 轻量模式',
    rest: '🌙 休息日',
    holiday: '🎉 放假日',
    exam: '📝 考试日',
    blocked: '🚫 客观阻断日',
  };

  const minTasks = plan.tasks.filter((t) => t.level === 'minimum');
  const recTasks = plan.tasks.filter((t) => t.level === 'recommended');
  const optTasks = plan.tasks.filter((t) => t.level === 'optional');

  const mainGoals = plan.mainGoalIds.map((id) => goals.find((g) => g.id === id)).filter(Boolean) as StudyGoal[];

  return (
    <div>
      <h1 className="page-title">📋 今日任务</h1>
      <p className="page-subtitle">{today} · {modeLabel[plan.mode] || plan.mode}</p>

      {plan.generatedReason && (
        <div className="alert alert-info">{plan.generatedReason}</div>
      )}

      {isClosed && (
        <div className="alert alert-success">✅ 今日已收工。好好休息！</div>
      )}

      {mainGoals.length > 0 && (
        <div className="card">
          <div className="card-title">🎯 今日主线目标</div>
          <div className="card-body">
            {mainGoals.map((g) => (
              <span key={g.id} className="badge badge-primary" style={{ marginRight: '8px' }}>
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 保底任务 */}
      {minTasks.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: 'var(--color-primary-dark)' }}>
            🔹 保底任务 — 完成就算今天没有断线
          </h3>
          {minTasks.map(renderTask)}
        </div>
      )}

      {/* 推荐任务 */}
      {recTasks.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: 'var(--color-success)' }}>
            📌 推荐任务 — 正常状态时推进
          </h3>
          {recTasks.map(renderTask)}
        </div>
      )}

      {/* 可选任务 */}
      {optTasks.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
            💡 可选任务 — 状态好时再做，可不做
          </h3>
          {optTasks.map(renderTask)}
        </div>
      )}

      {plan.tasks.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">今日没有任务</div>
          <div className="empty-state-desc">{plan.generatedReason}</div>
        </div>
      )}

      {!isClosed && plan.status !== 'notStarted' && (
        <div className="card">
          <div className="card-title">📝 收工前确认</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">今天的状态</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['good', 'normal', 'tired', 'bad'] as UserState[]).map((s) => {
                  const labels: Record<UserState, string> = { good: '😊 好', normal: '😐 一般', tired: '😔 累', bad: '😞 差' };
                  return (
                    <button
                      key={s}
                      className={`btn btn-sm ${userState === s ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setUserState(s)}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="今天的学习心得..." />
            </div>
            <div className="form-group">
              <label className="form-label">客观阻断说明（如有）</label>
              <input className="form-input" value={blockers} onChange={(e) => setBlockers(e.target.value)} placeholder="例如：临时加班、身体不适..." />
            </div>
            <button className="btn btn-success btn-lg btn-block" onClick={handleClose}>
              ✅ 收工 — 结束今天的学习
            </button>
            <p className="form-hint" style={{ textAlign: 'center' }}>收工后当天结束，不再追加任务。</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 收工后的打卡反馈视图 ---
function CheckInResultView({ checkIn, plan, cycle }: { checkIn: CheckIn; plan: DailyPlan; cycle: ReturnType<typeof getActiveCycle> }) {
  const navigate = useNavigate();
  const hideAmounts = cycle?.hideRawAmountsInFeedback ?? true;

  const rhythmLabels: Record<RhythmStatus, string> = {
    ahead: '略微领先',
    stable: '节奏稳定',
    slightlyBehind: '略低于标准',
    behind: '明显落后',
    slipping: '系统正在滑坡',
  };

  const rhythmClass: Record<RhythmStatus, string> = {
    ahead: 'rhythm-ahead',
    stable: 'rhythm-stable',
    slightlyBehind: 'rhythm-slightlyBehind',
    behind: 'rhythm-behind',
    slipping: 'rhythm-slipping',
  };

  return (
    <div>
      <h1 className="page-title">✅ 收工反馈</h1>
      <p className="page-subtitle">{checkIn.date} · 今日学习已结束</p>

      <div className="card">
        <div className="grid-3">
          <div className="stat-card">
            <div className="percent-display" style={{ justifyContent: 'center' }}>
              <span className="percent-number">{checkIn.todayCompletionPercent}</span>
              <span className="percent-sign">%</span>
            </div>
            <div className="stat-label">今日完成量</div>
          </div>
          <div className="stat-card">
            <div className="percent-display" style={{ justifyContent: 'center' }}>
              <span className="percent-number">{checkIn.cumulativeCompletionPercent}</span>
              <span className="percent-sign">%</span>
            </div>
            <div className="stat-label">累计完成</div>
          </div>
          <div className="stat-card">
            <div className="percent-display" style={{ justifyContent: 'center' }}>
              <span className="percent-number">{checkIn.expectedProgressPercent}</span>
              <span className="percent-sign">%</span>
            </div>
            <div className="stat-label">标准进度</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📊 今日总结</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          <p style={{ marginBottom: '8px' }}>
            节奏状态：
            <span className={`rhythm-indicator ${rhythmClass[checkIn.rhythmStatus]}`}>
              {rhythmLabels[checkIn.rhythmStatus]}
            </span>
          </p>
          <p>{checkIn.summary}</p>
          <p style={{ marginTop: '8px', color: 'var(--color-primary-dark)' }}>💬 {checkIn.suggestion}</p>
          {checkIn.blockers && (
            <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>🚫 客观阻断：{checkIn.blockers}</p>
          )}
        </div>
      </div>

      {!hideAmounts && plan.tasks.length > 0 && (
        <div className="card">
          <div className="card-title">📋 具体完成量</div>
          <div className="card-body">
            {plan.tasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}>
                <span>{t.title}</span>
                <span>{t.completionAmount}/{t.targetAmount} {t.unitName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>🏠 返回首页</button>
        <button className="btn btn-secondary" onClick={() => navigate('/history')}>📅 查看历史</button>
      </div>
    </div>
  );
}
