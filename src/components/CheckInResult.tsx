import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIn, DailyPlan, StudyCycle } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import Icon from '../components/Icon';
import { RhythmChip } from './StatusChips';
import { isMinimumCompleted } from '../progress';

/**
 * 收工反馈。信息主次是刻意的：
 * 今日完成度独占一块实心主色卡（用户此刻最想知道的就是「今天算不算数」），
 * 累计/应有进度退到白卡里做对照，而不是三个百分比等权并排。
 */
export default function CheckInResult({
  checkIn, plan, cycle,
}: { checkIn: CheckIn; plan: DailyPlan; cycle: StudyCycle }) {
  const { t, resolveMessage } = useI18n();
  const navigate = useNavigate();
  const [showRaw, setShowRaw] = useState(!(cycle.hideRawAmountsInFeedback ?? true));

  const minMet = isMinimumCompleted(plan);
  const eased = checkIn.userState === 'tired' || checkIn.userState === 'bad';
  const suggestion =
    checkIn.suggestionMessages?.map((m) => resolveMessage(m, '')).filter(Boolean).join(' ') || checkIn.suggestion;

  const adviceBg = eased ? 'var(--sc-rest-soft)' : 'var(--sc-primary-soft)';
  const adviceFg = eased ? 'var(--sc-rest)' : 'var(--sc-primary)';

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{t('checkin.title')}</h1>
        <div className="sub">{checkIn.date}</div>
      </div>

      {/* 今天算不算数 —— 唯一的大字 */}
      <div className="verdict">
        <div style={{ fontSize: 12, fontWeight: 500, opacity: .85 }}>{t('checkin.todayDone')}</div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 12 }}>
          <span className="verdict-num">{checkIn.todayCompletionPercent}%</span>
        </div>
        <div className="bar" style={{ background: 'rgba(255,255,255,.22)' }}>
          <div
            className="bar-fill"
            style={{ width: `${Math.min(100, checkIn.todayCompletionPercent)}%`, background: 'var(--sc-on-primary)' }}
          />
        </div>
        <div className="verdict-line pretty">{minMet ? t('checkin.minMet') : t('checkin.minMissed')}</div>
      </div>

      {/* 放到周期里看：应有进度只是参考线 */}
      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          <span className="card-label" style={{ flex: 1 }}>{t('checkin.cycleCompare')}</span>
          <RhythmChip status={checkIn.rhythmStatus} />
        </div>
        <div className="bar">
          <div className="bar-fill" style={{ width: `${Math.min(100, checkIn.cumulativeCompletionPercent)}%` }} />
          <div className="bar-mark" style={{ left: `${Math.min(100, checkIn.expectedProgressPercent)}%` }} />
        </div>
        <div className="row-wrap" style={{ gap: 18 }}>
          <div className="col" style={{ gap: 3 }}>
            <span className="note">{t('checkin.cumulative')}</span>
            <span className="tnum" style={{ fontSize: 19, fontWeight: 500, color: 'var(--sc-primary)' }}>
              {checkIn.cumulativeCompletionPercent}%
            </span>
          </div>
          <div className="col" style={{ gap: 3 }}>
            <span className="note">{t('home.expected')}</span>
            <span className="tnum" style={{ fontSize: 19, fontWeight: 500, color: 'var(--sc-ink-2)' }}>
              {checkIn.expectedProgressPercent}%
            </span>
          </div>
          <div className="note" style={{ flex: 1, minWidth: 120 }}>{t('checkin.compareNote')}</div>
        </div>
      </div>

      {/* 一句话建议 */}
      <div className="advice" style={{ background: adviceBg }}>
        <Icon name="spark" size={18} style={{ marginTop: 2, color: adviceFg }} />
        <div className="col" style={{ gap: 5 }}>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: adviceFg }}>{t('checkin.adviceLabel')}</div>
          <div className="advice-body pretty">{resolveMessage(checkIn.summaryMessage, checkIn.summary)}</div>
          {suggestion && <div className="pretty" style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--sc-ink-2)' }}>{suggestion}</div>}
        </div>
      </div>

      {/* 阻断：记录，不追责 */}
      {checkIn.blockers && (
        <div className="col" style={{ gap: 6, padding: '15px 17px', background: 'var(--sc-low-soft)', borderRadius: 'var(--sc-r3)' }}>
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--sc-low)' }}>{t('today.blockers')}</div>
          <div style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--sc-ink)' }}>{checkIn.blockers}</div>
          <div className="note">{t('checkin.blockRecorded')}</div>
        </div>
      )}

      {/* 明天会怎么排 —— 消除「明天要还债」的恐惧 */}
      <div className="card card-quiet">
        <div className="card-label">{t('checkin.tomorrow')}</div>
        <div className="pretty" style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--sc-ink)' }}>
          {eased ? t('checkin.tomorrowLight') : t('checkin.tomorrowNormal')}
        </div>
      </div>

      {/* 具体数量默认隐藏，减少数字压力 */}
      {showRaw && plan.tasks.length > 0 && (
        <div className="card card-flat">
          <div className="card-label">{t('today.amountDetails')}</div>
          <div className="stack-8">
            {plan.tasks.map((task) => (
              <div className="row" key={task.id} style={{ fontSize: 13 }}>
                <span style={{ flex: 1, color: 'var(--sc-ink-2)' }}>{resolveMessage(task.titleMessage, task.title)}</span>
                <span className="tnum" style={{ color: 'var(--sc-ink-3)' }}>
                  {task.completionAmount}/{task.targetAmount} {task.unitName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="row-wrap" style={{ gap: 10 }}>
        <button className="btn btn-outline" style={{ flex: 1, minWidth: 130 }} onClick={() => navigate('/')}>
          {t('common.backHome')}
        </button>
        <button
          className="btn btn-outline"
          style={{ flex: 1, minWidth: 130, color: 'var(--sc-ink-2)', fontSize: 13 }}
          onClick={() => setShowRaw((v) => !v)}
        >
          {showRaw ? t('checkin.hideRaw') : t('checkin.showRaw')}
        </button>
      </div>
    </>
  );
}
