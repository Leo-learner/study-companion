import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, getPlans, getCheckIns } from '../storage';
import { calculateCycleProgress, calculateGoalProgress, getStreakDays, isMinimumCompleted } from '../progress';
import { countRecentLowCompletion } from '../progress';
import { todayStr } from '../types';

export default function Review() {
  const cycle = getActiveCycle();
  const navigate = useNavigate();
  const today = todayStr();

  if (!cycle) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">请先创建学习周期</div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const allGoals = getGoals(cycle.id);
  const activeGoals = allGoals.filter((g) => g.isActive);
  const allPlans = getPlans(cycle.id);
  const allCheckIns = getCheckIns(cycle.id);
  const cycleProgress = calculateCycleProgress(activeGoals);

  // 统计
  const totalDays = allPlans.length;
  const closedDays = allPlans.filter((p) => p.status === 'closed').length;
  const restDays = allPlans.filter((p) => ['rest', 'holiday'].includes(p.mode)).length;
  const blockedDays = allPlans.filter((p) => p.mode === 'blocked').length;
  const minCompletedDays = allPlans.filter((p) => p.status === 'closed' && isMinimumCompleted(p)).length;
  const streakDays = getStreakDays(allPlans, today);
  const recentLowDays = countRecentLowCompletion(allCheckIns, 40, 14);

  // 最近7天趋势
  const recent7 = allCheckIns
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .reverse();

  // 趋势计算
  const trendValues = recent7.map((c) => c.todayCompletionPercent);
  const trendUp = trendValues.length >= 2 && trendValues[trendValues.length - 1] > trendValues[0];

  // 生成建议
  const suggestions: string[] = [];

  if (recentLowDays >= 3) {
    suggestions.push('⚠️ 最近低完成天数较多（' + recentLowDays + ' 天），建议降强度、优先恢复节奏。');
  }
  if (activeGoals.length > 4) {
    suggestions.push('📋 当前激活目标较多（' + activeGoals.length + ' 个），考虑停用部分低优先级目标。');
  }
  if (allPlans.length > 0) {
    const skippedHealth = allPlans.filter((p) => p.healthGateStatus === 'exception').length;
    if (skippedHealth >= 3) {
      suggestions.push('🏃 你已经连续多次绕过健康前置了。学习系统要长期运行，健康规则不能长期失效。');
    }
  }
  if (cycleProgress < 30 && totalDays > 14) {
    suggestions.push('📉 周期进度明显偏慢，但不要一次性追赶，先用保底任务把线接回来。');
  }
  if (closedDays === 0 && totalDays > 3) {
    suggestions.push('💡 你还没有收工过任何一天。建议今天完成学习后点击收工，帮助系统校准节奏。');
  }
  if (suggestions.length === 0) {
    suggestions.push('✅ 系统运行总体健康，继续保持当前的节奏。');
  }

  return (
    <div>
      <h1 className="page-title">📊 学习复盘</h1>
      <p className="page-subtitle">轻量复盘，帮助你了解当前学习状态。</p>

      <div className="card">
        <div className="card-title">📈 周期总览</div>
        <div className="grid-3" style={{ marginTop: '12px' }}>
          <div className="stat-card">
            <div className="stat-value">{cycleProgress}%</div>
            <div className="stat-label">周期总进度</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{streakDays}</div>
            <div className="stat-label">连续收工天数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{closedDays}/{totalDays}</div>
            <div className="stat-label">收工/总天数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{restDays}</div>
            <div className="stat-label">休息日数量</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{blockedDays}</div>
            <div className="stat-label">客观阻断次数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{minCompletedDays}</div>
            <div className="stat-label">保底完成次数</div>
          </div>
        </div>
      </div>

      {/* 目标完成度 */}
      <div className="card">
        <div className="card-title">🎯 各目标进度</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          {allGoals.map((goal) => {
            const progress = calculateGoalProgress(goal);
            return (
              <div key={goal.id} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    {goal.name}
                    {!goal.isActive && <span className="badge badge-neutral" style={{ marginLeft: '6px' }}>停用</span>}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    {progress}% ({goal.completedAmount}/{goal.totalAmount} {goal.unitName})
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar-fill progress-fill-primary" style={{ width: `${progress}%` }} />
                </div>
              </div>
            );
          })}
          {allGoals.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>暂无目标</p>}
        </div>
      </div>

      {/* 最近7天趋势 */}
      <div className="card">
        <div className="card-title">📉 最近 7 天完成趋势</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          {recent7.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>暂无数据</p>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '8px 0' }}>
                {recent7.map((ci) => {
                  const h = Math.max(4, ci.todayCompletionPercent);
                  return (
                    <div key={ci.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{ci.todayCompletionPercent}%</span>
                      <div style={{
                        width: '100%',
                        height: `${h}%`,
                        background: ci.todayCompletionPercent >= 60 ? 'var(--color-success)' : ci.todayCompletionPercent >= 30 ? 'var(--color-warning)' : 'var(--color-danger)',
                        borderRadius: '4px 4px 0 0',
                        minHeight: '4px',
                      }} />
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{ci.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '8px' }}>
                {trendUp ? '📈 趋势向上，继续保持！' : trendValues.length >= 2 ? '📉 趋势有所下降，注意恢复节奏。' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 系统建议 */}
      <div className="card">
        <div className="card-title">💡 系统建议</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          {suggestions.map((s, i) => (
            <p key={i} style={{ marginBottom: '8px', lineHeight: 1.8 }}>{s}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
