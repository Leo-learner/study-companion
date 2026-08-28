import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getCheckIns, getPlans } from '../storage';
import { useI18n } from '../i18n/I18nProvider';
import Icon from '../components/Icon';
import { MODE_CLASS } from '../components/StatusChips';
import { PlanMode } from '../types';

const FILTERS = [
  ['all', 'history.all'],
  ['closed', 'common.closed'],
  ['rest', 'history.special'],
  ['low', 'history.low'],
] as const;

/**
 * 每一天都在这里，包括休息日和 0% 的一天。
 * 刻意做成行卡而不是表格：表格读起来像成绩单。
 */
export default function History() {
  const { t } = useI18n();
  const cycle = getActiveCycle();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [daysView, setDaysView] = useState<7 | 30>(7);

  if (!cycle) {
    return (
      <div className="empty">
        <div className="empty-mark"><Icon name="book" size={30} /></div>
        <h1 className="h2">{t('goal.needCycle')}</h1>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </div>
    );
  }

  const checkIns = getCheckIns(cycle.id);
  let records = getPlans(cycle.id)
    .map((plan) => ({ plan, checkIn: checkIns.find((item) => item.planId === plan.id) }))
    .sort((a, b) => b.plan.date.localeCompare(a.plan.date));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysView);
  records = records.filter((record) => new Date(record.plan.date) >= cutoff);
  if (filter === 'low') records = records.filter((r) => r.checkIn && r.checkIn.todayCompletionPercent < 40);
  if (filter === 'rest') records = records.filter((r) => ['rest', 'holiday', 'exam', 'blocked'].includes(r.plan.mode));
  if (filter === 'closed') records = records.filter((r) => r.plan.status === 'closed');

  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{t('history.title')}</h1>
        <div className="sub">{t('historyNew.subtitle')}</div>
      </div>

      <div className="row-wrap" style={{ gap: 8 }}>
        <button className={`btn btn-sm ${daysView === 7 ? 'btn-soft' : 'btn-outline'}`} onClick={() => setDaysView(7)}>
          {t('history.last7')}
        </button>
        <button className={`btn btn-sm ${daysView === 30 ? 'btn-soft' : 'btn-outline'}`} onClick={() => setDaysView(30)}>
          {t('history.last30')}
        </button>
        <span style={{ width: 1, height: 20, background: 'var(--sc-line)' }} />
        {FILTERS.map(([value, key]) => (
          <button key={value} className={`btn btn-sm ${filter === value ? 'btn-soft' : 'btn-outline'}`}
                  aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {t(key)}
          </button>
        ))}
      </div>

      {records.length === 0 ? (
        <div className="empty">
          <div className="empty-mark"><Icon name="history" size={30} /></div>
          <h2 className="h2">{t('history.empty')}</h2>
        </div>
      ) : (
        <div className="stack-8">
          {records.map(({ plan, checkIn }) => {
            const pct = checkIn?.todayCompletionPercent ?? null;
            const isRestMode = ['rest', 'holiday', 'blocked'].includes(plan.mode);
            const weekday = weekdayLabels[new Date(`${plan.date}T00:00:00Z`).getUTCDay()];
            const barColor = isRestMode ? 'var(--sc-rest)' : 'var(--sc-primary)';
            return (
              <div className="hist-row" key={plan.id}>
                <div className="hist-date">
                  <span className="tnum" style={{ fontSize: 14, fontWeight: 500, color: 'var(--sc-ink)' }}>
                    {plan.date.slice(5)}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--sc-ink-3)' }}>{weekday}</span>
                </div>

                <div className="col" style={{ flex: 1, gap: 7, minWidth: 0 }}>
                  <div className="row-wrap" style={{ gap: 7 }}>
                    <span className={`chip ${MODE_CLASS[plan.mode as PlanMode]}`}>{t(`plan.mode.${plan.mode}` as never)}</span>
                    <span style={{ fontSize: 12, color: 'var(--sc-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {plan.notes || plan.blockers || t(`common.${plan.status}` as never)}
                    </span>
                  </div>
                  <div className="bar bar-sm">
                    <div className="bar-fill" style={{ width: `${isRestMode ? 100 : pct ?? 0}%`, background: barColor }} />
                  </div>
                </div>

                <div className="tnum" style={{ width: 46, flex: 'none', textAlign: 'right', fontSize: 13, fontWeight: 500,
                                               color: isRestMode ? 'var(--sc-rest)' : 'var(--sc-ink-2)' }}>
                  {isRestMode ? '—' : pct === null ? '—' : `${pct}%`}
                </div>

                {checkIn && (
                  <button className="btn btn-outline btn-sm" style={{ flex: 'none' }} onClick={() => navigate(`/checkin/${plan.id}`)}>
                    <Icon name="chev" size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="notice" style={{ background: 'var(--sc-primary-soft)' }}>
        <Icon name="pulse" size={17} style={{ marginTop: 2, color: 'var(--sc-primary)' }} />
        <div className="notice-body pretty">{t('historyNew.note')}</div>
      </div>
    </>
  );
}
