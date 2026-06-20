import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getPlans, getCheckIns } from '../storage';
import { DailyPlan, CheckIn } from '../types';

export default function History() {
  const cycle = getActiveCycle();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [daysView, setDaysView] = useState<7 | 30>(7);

  if (!cycle) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">请先创建学习周期</div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
      </div>
    );
  }

  const allPlans = getPlans(cycle.id);
  const allCheckIns = getCheckIns(cycle.id);

  // 按日期合并 Plan 和 CheckIn
  const records = allPlans
    .map((plan) => {
      const ci = allCheckIns.find((c) => c.planId === plan.id);
      return { plan, checkIn: ci };
    })
    .sort((a, b) => b.plan.date.localeCompare(a.plan.date));

  // 筛选
  let filtered = records;
  const now = new Date();
  if (daysView === 7) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
    filtered = filtered.filter((r) => new Date(r.plan.date) >= cutoff);
  } else if (daysView === 30) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    filtered = filtered.filter((r) => new Date(r.plan.date) >= cutoff);
  }

  if (filter === 'low') {
    filtered = filtered.filter((r) => r.checkIn && r.checkIn.todayCompletionPercent < 40);
  } else if (filter === 'rest') {
    filtered = filtered.filter((r) => ['rest', 'holiday', 'exam', 'blocked'].includes(r.plan.mode));
  } else if (filter === 'closed') {
    filtered = filtered.filter((r) => r.plan.status === 'closed');
  }

  const modeLabels: Record<string, string> = {
    normal: '📖 正常', light: '🌿 轻量', rest: '🌙 休息',
    holiday: '🎉 假日', exam: '📝 考试', blocked: '🚫 阻断',
  };

  const rhythmLabels: Record<string, string> = {
    ahead: '领先', stable: '稳定', slightlyBehind: '略落后',
    behind: '落后', slipping: '滑坡',
  };

  return (
    <div>
      <h1 className="page-title">📅 历史记录</h1>
      <p className="page-subtitle">回顾你的学习历程</p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className={`btn btn-sm ${daysView === 7 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDaysView(7)}>
          最近 7 天
        </button>
        <button className={`btn btn-sm ${daysView === 30 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDaysView(30)}>
          最近 30 天
        </button>
        <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>|</span>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>
          全部
        </button>
        <button className={`btn btn-sm ${filter === 'closed' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('closed')}>
          已收工
        </button>
        <button className={`btn btn-sm ${filter === 'rest' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('rest')}>
          特殊日
        </button>
        <button className={`btn btn-sm ${filter === 'low' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('low')}>
          低完成日
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-title">暂无记录</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="history-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>模式</th>
                <th>状态</th>
                <th>完成</th>
                <th>节奏</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ plan, checkIn }) => (
                <tr key={plan.id}>
                  <td>{plan.date}</td>
                  <td>{modeLabels[plan.mode] || plan.mode}</td>
                  <td>
                    {plan.status === 'closed' ? (
                      <span className="badge badge-success">已收工</span>
                    ) : plan.status === 'active' ? (
                      <span className="badge badge-primary">进行中</span>
                    ) : (
                      <span className="badge badge-neutral">未启动</span>
                    )}
                  </td>
                  <td>
                    {checkIn ? `${checkIn.todayCompletionPercent}%` : '-'}
                  </td>
                  <td>
                    {checkIn ? (
                      <span className={`rhythm-indicator rhythm-${checkIn.rhythmStatus}`}>
                        {rhythmLabels[checkIn.rhythmStatus]}
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    {checkIn && (
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/checkin/${plan.id}`)}>
                        详情
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
