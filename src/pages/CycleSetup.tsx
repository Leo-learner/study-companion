import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, saveCycle, archiveCycle } from '../storage';
import { StudyCycle, DayRule, DayRuleType, generateId, todayStr } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { translate, TranslationKey } from '../i18n/messages';
import Icon from '../components/Icon';

interface Props {
  onCreated?: () => void;
  editMode?: boolean;
}

const WEEKDAY_KEYS: TranslationKey[] = [
  'cycle.weekday0', 'cycle.weekday1', 'cycle.weekday2', 'cycle.weekday3',
  'cycle.weekday4', 'cycle.weekday5', 'cycle.weekday6',
];

const RULE_TYPES: Array<{ type: DayRuleType; key: TranslationKey }> = [
  { type: 'weekday', key: 'cycle.weekdays' },
  { type: 'cycle', key: 'cycle.cycleRule' },
  { type: 'customWeek', key: 'cycle.customWeek' },
];

export default function CycleSetup({ onCreated, editMode }: Props) {
  const existing = getActiveCycle();
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const previousLanguage = useRef(language);
  const [archiveArmed, setArchiveArmed] = useState(false);

  const [name, setName] = useState(existing?.name || '');
  const [startDate, setStartDate] = useState(existing?.startDate || todayStr());
  const [endDate, setEndDate] = useState(existing?.endDate || '');
  const [dayRuleType, setDayRuleType] = useState<DayRuleType>(existing?.dayRule?.type || 'weekday');
  const [studyDays, setStudyDays] = useState(existing?.dayRule?.studyDays || 3);
  const [restDays, setRestDays] = useState(existing?.dayRule?.restDays || 1);
  const [activeWeekdays, setActiveWeekdays] = useState<number[]>(existing?.dayRule?.activeWeekdays || [1, 2, 3, 4, 5]);
  const [healthGateEnabled, setHealthGateEnabled] = useState(existing?.healthGateEnabled ?? false);
  const [healthGateText, setHealthGateText] = useState(existing ? existing.healthGateText : t('cycle.defaultHealthText'));
  const [launchPhrase, setLaunchPhrase] = useState(existing ? existing.launchPhrase : t('cycle.defaultLaunchPhrase'));
  const [maxMainGoalsPerDay, setMaxMainGoalsPerDay] = useState(existing?.maxMainGoalsPerDay || 1);
  const [hideAmounts, setHideAmounts] = useState(existing?.hideRawAmountsInFeedback ?? true);

  useEffect(() => {
    if (!existing) {
      const oldLanguage = previousLanguage.current;
      setHealthGateText((current) =>
        current === translate(oldLanguage, 'cycle.defaultHealthText') ? t('cycle.defaultHealthText') : current);
      setLaunchPhrase((current) =>
        current === translate(oldLanguage, 'cycle.defaultLaunchPhrase') ? t('cycle.defaultLaunchPhrase') : current);
    }
    previousLanguage.current = language;
  }, [existing?.id, language, t]);

  const toggleWeekday = (d: number) => {
    setActiveWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  };

  const buildDayRule = (): DayRule => {
    const base: DayRule = { type: dayRuleType };
    if (dayRuleType === 'cycle') { base.studyDays = studyDays; base.restDays = restDays; }
    else if (dayRuleType === 'customWeek') { base.activeWeekdays = activeWeekdays; }
    return base;
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const cycle: StudyCycle = {
      id: existing?.id || generateId(),
      name: name.trim(),
      startDate,
      endDate,
      status: 'active',
      dayRule: buildDayRule(),
      healthGateEnabled,
      healthGateText,
      launchPhrase: launchPhrase.trim() || t('cycle.defaultLaunchPhrase'),
      maxMainGoalsPerDay,
      hideRawAmountsInFeedback: hideAmounts,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveCycle(cycle);
    if (onCreated) onCreated();
    else navigate('/goals');
  };

  const handleArchive = () => {
    if (!existing) return;
    if (!archiveArmed) { setArchiveArmed(true); return; }
    archiveCycle(existing.id);
    navigate('/');
  };

  // 预览：让人看到系统会怎么理解这个周期，而不是填完就交
  const totalDays = startDate && endDate
    ? Math.max(0, Math.round((new Date(`${endDate}T00:00:00Z`).getTime() - new Date(`${startDate}T00:00:00Z`).getTime()) / 86400000) + 1)
    : 0;
  const studyRatio = dayRuleType === 'weekday' ? 5 / 7
    : dayRuleType === 'cycle' ? studyDays / Math.max(1, studyDays + restDays)
      : activeWeekdays.length / 7;
  const studyDayCount = Math.round(totalDays * studyRatio);

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{editMode ? t('cycle.editTitle') : t('cycle.createTitle')}</h1>
        <div className="sub pretty">{t('setupNew.subtitle')}</div>
      </div>

      <div className="card">
        <div className="field">
          <label className="label" htmlFor="c-name">{t('cycle.name')}</label>
          <input id="c-name" className="input" value={name} onChange={(e) => setName(e.target.value)}
                 placeholder={t('cycle.namePlaceholder')} style={{ minHeight: 46, fontSize: 15 }} />
        </div>

        <div className="row-wrap" style={{ gap: 10 }}>
          <div className="field" style={{ flex: 1, minWidth: 130 }}>
            <label className="label" htmlFor="c-start">{t('cycle.startDate')}</label>
            <input id="c-start" className="input tnum" type="date" value={startDate}
                   onChange={(e) => setStartDate(e.target.value)} style={{ minHeight: 46, fontSize: 15 }} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: 130 }}>
            <label className="label" htmlFor="c-end">{t('cycle.endDate')}</label>
            <input id="c-end" className="input tnum" type="date" value={endDate}
                   onChange={(e) => setEndDate(e.target.value)} style={{ minHeight: 46, fontSize: 15 }} />
          </div>
        </div>

        <div className="field">
          <span className="label">{t('cycle.dayRule')}</span>
          <div className="row-wrap" style={{ gap: 8 }}>
            {RULE_TYPES.map(({ type, key }) => (
              <button key={type} type="button" aria-pressed={dayRuleType === type}
                      className={`btn btn-sm ${dayRuleType === type ? 'btn-soft' : 'btn-outline'}`}
                      style={{ borderRadius: 'var(--sc-pill)' }}
                      onClick={() => setDayRuleType(type)}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        {dayRuleType === 'cycle' && (
          <div className="row-wrap" style={{ gap: 10 }}>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label className="label" htmlFor="c-study">{t('cycle.studyDays')}</label>
              <input id="c-study" className="input" type="number" min={1} value={studyDays}
                     onChange={(e) => setStudyDays(Number(e.target.value))} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 120 }}>
              <label className="label" htmlFor="c-rest">{t('cycle.restDays')}</label>
              <input id="c-rest" className="input" type="number" min={0} value={restDays}
                     onChange={(e) => setRestDays(Number(e.target.value))} />
            </div>
          </div>
        )}

        {dayRuleType === 'customWeek' && (
          <div className="field">
            <span className="label">{t('cycle.weekdays')}</span>
            <div className="row-wrap" style={{ gap: 6 }}>
              {WEEKDAY_KEYS.map((key, idx) => {
                const on = activeWeekdays.includes(idx);
                return (
                  <button key={key} type="button" aria-pressed={on}
                          onClick={() => toggleWeekday(idx)}
                          style={{
                            width: 44, height: 44, borderRadius: 'var(--sc-r2)', cursor: 'pointer', fontSize: 13.5,
                            background: on ? 'var(--sc-primary-soft)' : 'var(--sc-surface-2)',
                            border: `1px solid ${on ? 'var(--sc-primary)' : 'var(--sc-line)'}`,
                            color: on ? 'var(--sc-primary)' : 'var(--sc-ink-2)',
                          }}>
                    {t(key)}
                  </button>
                );
              })}
            </div>
            <div className="note">{t('setupNew.restDaysHint')}</div>
          </div>
        )}

        <div className="field">
          <label className="label" htmlFor="c-phrase">{t('cycle.launchPhrase')}</label>
          <input id="c-phrase" className="input input-ritual" value={launchPhrase}
                 onChange={(e) => setLaunchPhrase(e.target.value)} />
          <div className="note">{t('settingsNew.codewordHint')}</div>
        </div>

        <div className="field">
          <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={healthGateEnabled} onChange={(e) => setHealthGateEnabled(e.target.checked)} />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settingsNew.healthToggle')}</span>
          </label>
          <div className="note">{t('settingsNew.healthToggleHint')}</div>
          {healthGateEnabled && (
            <input className="input" value={healthGateText} onChange={(e) => setHealthGateText(e.target.value)}
                   placeholder={t('cycle.defaultHealthText')} />
          )}
        </div>

        <div className="field">
          <label className="row" style={{ gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideAmounts} onChange={(e) => setHideAmounts(e.target.checked)} />
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settingsNew.rawToggle')}</span>
          </label>
          <div className="note">{t('settingsNew.rawToggleHint')}</div>
        </div>

        <div className="field">
          <label className="label" htmlFor="c-max">{t('settingsNew.maxMain')}</label>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-quiet btn-sm" style={{ width: 40, padding: 0 }} aria-label={t('common.decrease')}
                    onClick={() => setMaxMainGoalsPerDay((v) => Math.max(1, v - 1))}>
              <Icon name="minus" size={16} />
            </button>
            <span id="c-max" style={{ minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: 500 }}>{maxMainGoalsPerDay}</span>
            <button className="btn btn-quiet btn-sm" style={{ width: 40, padding: 0 }} aria-label={t('common.increase')}
                    onClick={() => setMaxMainGoalsPerDay((v) => Math.min(3, v + 1))}>
              <Icon name="plus" size={16} />
            </button>
          </div>
          <div className="note">{t('settingsNew.maxMainHint')}</div>
        </div>

        {/* 系统会怎么理解这个周期 */}
        {totalDays > 0 && (
          <div className="field" style={{ paddingTop: 4, borderTop: '1px solid var(--sc-line-soft)' }}>
            <span className="label">{t('setupNew.previewLabel')}</span>
            <div className="pretty" style={{ padding: '14px 16px', background: 'var(--sc-primary-soft)',
                                             borderRadius: 'var(--sc-r2)', fontSize: 13.5, lineHeight: 1.8, color: 'var(--sc-ink)' }}>
              {t('setupNew.preview', { days: totalDays, study: studyDayCount })}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-lg btn-block" onClick={handleSave} disabled={!name.trim() || !endDate}>
          <Icon name="plan" size={18} />
          {editMode ? t('common.save') : t('dashboard.createCycle')}
        </button>
      </div>

      <div className="row-wrap" style={{ gap: 10 }}>
        <button className="btn btn-ghost" onClick={() => (onCreated ? onCreated() : navigate('/'))}>
          {t('common.cancel')}
        </button>
        <span className="spacer" />
        {existing && editMode && (
          <button className="btn btn-caution btn-sm" onClick={handleArchive} onBlur={() => setArchiveArmed(false)}>
            {archiveArmed ? t('common.confirmDelete') : t('cycle.archive')}
          </button>
        )}
      </div>
    </>
  );
}
