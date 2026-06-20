import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getPlans } from '../storage';
import { RhythmStatus } from '../types';

// 复用于路由访问的打卡详情页
export default function CheckInView() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const cycle = getActiveCycle();

  if (!cycle) return <div className="empty-state"><button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button></div>;

  const checkIns = getCheckIns(cycle.id);
  const ci = checkIns.find((c) => c.planId === planId);

  if (!ci) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">未找到打卡记录</div>
        <button className="btn btn-primary" onClick={() => navigate('/history')}>返回历史</button>
      </div>
    );
  }

  const plans = getPlans(cycle.id);
  const plan = plans.find((p) => p.id === planId);
  const hideAmounts = cycle.hideRawAmountsInFeedback ?? true;

  const rhythmLabels: Record<RhythmStatus, string> = {
    ahead: '略微领先', stable: '节奏稳定', slightlyBehind: '略低于标准',
    behind: '明显落后', slipping: '系统正在滑坡',
  };
  const rhythmClass: Record<RhythmStatus, string> = {
    ahead: 'rhythm-ahead', stable: 'rhythm-stable', slightlyBehind: 'rhythm-slightlyBehind',
    behind: 'rhythm-behind', slipping: 'rhythm-slipping',
  };

  const userStateLabels: Record<string, string> = { good: '😊 好', normal: '😐 一般', tired: '😔 累', bad: '😞 差' };

  return (
    <div>
      <h1 className="page-title">📋 打卡详情</h1>
      <p className="page-subtitle">{ci.date} · {userStateLabels[ci.userState] || ci.userState}</p>

      <div className="card">
        <div className="grid-3">
          <div className="stat-card">
            <div className="percent-display" style={{ justifyContent: 'center' }}>
              <span className="percent-number">{ci.todayCompletionPercent}</span><span className="percent-sign">%</span>
            </div>
            <div className="stat-label">今日完成量</div>
          </div>
          <div className="stat-card">
            <div className="percent-display" style={{ justifyContent: 'center' }}>
              <span className="percent-number">{ci.cumulativeCompletionPercent}</span><span className="percent-sign">%</span>
            </div>
            <div className="stat-label">累计完成</div>
          </div>
          <div className="stat-card">
            <div className="percent-display" style={{ justifyContent: 'center' }}>
              <span className="percent-number">{ci.expectedProgressPercent}</span><span className="percent-sign">%</span>
            </div>
            <div className="stat-label">标准进度</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📊 总结</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          <p>节奏状态：<span className={`rhythm-indicator ${rhythmClass[ci.rhythmStatus]}`}>{rhythmLabels[ci.rhythmStatus]}</span></p>
          <p style={{ marginTop: '8px' }}>{ci.summary}</p>
          <p style={{ marginTop: '8px', color: 'var(--color-primary-dark)' }}>💬 {ci.suggestion}</p>
          {ci.blockers && <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>🚫 {ci.blockers}</p>}
        </div>
      </div>

      {!hideAmounts && plan && (
        <div className="card">
          <div className="card-title">📋 任务详情</div>
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

      <button className="btn btn-secondary" onClick={() => navigate('/history')}>← 返回历史</button>
    </div>
  );
}
