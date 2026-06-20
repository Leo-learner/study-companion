import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getPlans } from '../storage';
import { useI18n } from '../i18n/I18nProvider';

export default function History() {
  const { t } = useI18n();
  const cycle = getActiveCycle();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [daysView, setDaysView] = useState<7 | 30>(7);

  if (!cycle) return <div className="empty-state"><div className="empty-state-icon">📚</div><div className="empty-state-title">{t('goal.needCycle')}</div><button className="btn btn-primary" onClick={() => navigate('/')}>{t('common.backHome')}</button></div>;

  const checkIns = getCheckIns(cycle.id);
  let records = getPlans(cycle.id).map((plan) => ({ plan, checkIn: checkIns.find((item) => item.planId === plan.id) })).sort((a, b) => b.plan.date.localeCompare(a.plan.date));
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysView);
  records = records.filter((record) => new Date(record.plan.date) >= cutoff);
  if (filter === 'low') records = records.filter((record) => record.checkIn && record.checkIn.todayCompletionPercent < 40);
  if (filter === 'rest') records = records.filter((record) => ['rest', 'holiday', 'exam', 'blocked'].includes(record.plan.mode));
  if (filter === 'closed') records = records.filter((record) => record.plan.status === 'closed');

  return <div>
    <h1 className="page-title">📅 {t('history.title')}</h1>
    <p className="page-subtitle">{t('history.subtitle')}</p>
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
      <button className={`btn btn-sm ${daysView === 7 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDaysView(7)}>{t('history.last7')}</button>
      <button className={`btn btn-sm ${daysView === 30 ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setDaysView(30)}>{t('history.last30')}</button>
      <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>|</span>
      {([['all', 'history.all'], ['closed', 'common.closed'], ['rest', 'history.special'], ['low', 'history.low']] as const).map(([value, key]) => <button key={value} className={`btn btn-sm ${filter === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(value)}>{t(key)}</button>)}
    </div>
    {records.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📭</div><div className="empty-state-title">{t('history.empty')}</div></div> : <div className="card" style={{ overflow: 'auto' }}><table className="history-table">
      <thead><tr>{(['date', 'mode', 'status', 'completion', 'rhythm', 'actions'] as const).map((key) => <th key={key}>{t(`history.${key}`)}</th>)}</tr></thead>
      <tbody>{records.map(({ plan, checkIn }) => <tr key={plan.id}>
        <td>{plan.date}</td><td>{t(`plan.mode.${plan.mode}`)}</td>
        <td><span className={`badge ${plan.status === 'closed' ? 'badge-success' : plan.status === 'active' ? 'badge-primary' : 'badge-neutral'}`}>{t(`common.${plan.status}`)}</span></td>
        <td>{checkIn ? `${checkIn.todayCompletionPercent}%` : '-'}</td>
        <td>{checkIn ? <span className={`rhythm-indicator rhythm-${checkIn.rhythmStatus}`}>{t(`rhythm.${checkIn.rhythmStatus}`)}</span> : '-'}</td>
        <td>{checkIn && <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/checkin/${plan.id}`)}>{t('history.details')}</button>}</td>
      </tr>)}</tbody>
    </table></div>}
  </div>;
}
