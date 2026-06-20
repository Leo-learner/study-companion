import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getPlans } from '../storage';
import { TranslationKey } from '../i18n/messages';
import { useI18n } from '../i18n/I18nProvider';

export default function CheckInView() {
  const { t, resolveMessage } = useI18n();
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const cycle = getActiveCycle();

  if (!cycle) return <div className="empty-state"><button className="btn btn-primary" onClick={() => navigate('/')}>{t('common.backHome')}</button></div>;
  const checkIn = getCheckIns(cycle.id).find((item) => item.planId === planId);
  if (!checkIn) return <div className="empty-state"><div className="empty-state-icon">🔍</div><div className="empty-state-title">{t('checkin.notFound')}</div><button className="btn btn-primary" onClick={() => navigate('/history')}>{t('checkin.backHistory')}</button></div>;

  const plan = getPlans(cycle.id).find((item) => item.id === planId);
  const hideAmounts = cycle.hideRawAmountsInFeedback ?? true;
  const stateIcons = { good: '😊', normal: '😐', tired: '😔', bad: '😞' };
  const suggestion = checkIn.suggestionMessages?.map((message) => resolveMessage(message, '')).filter(Boolean).join(' ') || checkIn.suggestion;

  return <div>
    <h1 className="page-title">📋 {t('checkin.detailTitle')}</h1>
    <p className="page-subtitle">{checkIn.date} · {stateIcons[checkIn.userState]} {t(`today.state.${checkIn.userState}`)}</p>
    <div className="card"><div className="grid-3">{[
      [checkIn.todayCompletionPercent, 'today.completion'], [checkIn.cumulativeCompletionPercent, 'today.cumulative'], [checkIn.expectedProgressPercent, 'today.expected'],
    ].map(([value, key]) => <div className="stat-card" key={key}><div className="percent-display" style={{ justifyContent: 'center' }}><span className="percent-number">{value}</span><span className="percent-sign">%</span></div><div className="stat-label">{t(key as TranslationKey)}</div></div>)}</div></div>
    <div className="card"><div className="card-title">📊 {t('checkin.summary')}</div><div className="card-body" style={{ marginTop: '8px' }}>
      <p>{t('today.rhythm')}<span className={`rhythm-indicator rhythm-${checkIn.rhythmStatus}`}>{t(`rhythm.${checkIn.rhythmStatus}`)}</span></p>
      <p style={{ marginTop: '8px' }}>{resolveMessage(checkIn.summaryMessage, checkIn.summary)}</p>
      <p style={{ marginTop: '8px', color: 'var(--color-primary-dark)' }}>💬 {suggestion}</p>
      {checkIn.blockers && <p style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>🚫 {checkIn.blockers}</p>}
    </div></div>
    {!hideAmounts && plan && <div className="card"><div className="card-title">📋 {t('checkin.taskDetails')}</div><div className="card-body">{plan.tasks.map((task) => <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.85rem' }}><span>{resolveMessage(task.titleMessage, task.title)}</span><span>{task.completionAmount}/{task.targetAmount} {task.unitName}</span></div>)}</div></div>}
    <button className="btn btn-secondary" onClick={() => navigate('/history')}>← {t('checkin.backHistory')}</button>
  </div>;
}
