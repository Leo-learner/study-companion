import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, saveCycle, archiveCycle } from '../storage';
import { StudyCycle, DayRule, DayRuleType, generateId, todayStr } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { translate, TranslationKey } from '../i18n/messages';

interface Props {
  onCreated?: () => void;
  editMode?: boolean;
}

export default function CycleSetup({ onCreated, editMode }: Props) {
  const existing = getActiveCycle();
  const navigate = useNavigate();
  const { language, t } = useI18n();
  const previousLanguage = useRef(language);

  const [name, setName] = useState(existing?.name || '');
  const [startDate, setStartDate] = useState(existing?.startDate || todayStr());
  const [endDate, setEndDate] = useState(existing?.endDate || '');
  const [dayRuleType, setDayRuleType] = useState<DayRuleType>(existing?.dayRule?.type || 'weekday');
  const [studyDays, setStudyDays] = useState(existing?.dayRule?.studyDays || 3);
  const [restDays, setRestDays] = useState(existing?.dayRule?.restDays || 1);
  const [activeWeekdays, setActiveWeekdays] = useState<number[]>(
    existing?.dayRule?.activeWeekdays || [1, 2, 3, 4, 5]
  );
  const [healthGateEnabled, setHealthGateEnabled] = useState(existing?.healthGateEnabled ?? false);
  const [healthGateText, setHealthGateText] = useState(
    existing ? existing.healthGateText : t('cycle.defaultHealthText'),
  );
  const [launchPhrase, setLaunchPhrase] = useState(
    existing ? existing.launchPhrase : t('cycle.defaultLaunchPhrase'),
  );
  const [maxMainGoalsPerDay, setMaxMainGoalsPerDay] = useState(existing?.maxMainGoalsPerDay || 1);
  const [hideAmounts, setHideAmounts] = useState(existing?.hideRawAmountsInFeedback ?? true);

  const weekdayKeys: TranslationKey[] = [
    'cycle.weekday0', 'cycle.weekday1', 'cycle.weekday2', 'cycle.weekday3',
    'cycle.weekday4', 'cycle.weekday5', 'cycle.weekday6',
  ];

  useEffect(() => {
    if (!existing) {
      const oldLanguage = previousLanguage.current;
      setHealthGateText((current) =>
        current === translate(oldLanguage, 'cycle.defaultHealthText')
          ? t('cycle.defaultHealthText')
          : current,
      );
      setLaunchPhrase((current) =>
        current === translate(oldLanguage, 'cycle.defaultLaunchPhrase')
          ? t('cycle.defaultLaunchPhrase')
          : current,
      );
    }
    previousLanguage.current = language;
  }, [existing?.id, language, t]);

  const toggleWeekday = (d: number) => {
    setActiveWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const buildDayRule = (): DayRule => {
    const base: DayRule = { type: dayRuleType };
    if (dayRuleType === 'cycle') {
      base.studyDays = studyDays;
      base.restDays = restDays;
    } else if (dayRuleType === 'customWeek') {
      base.activeWeekdays = activeWeekdays;
    }
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
    if (existing && confirm(t('cycle.archiveConfirm'))) {
      archiveCycle(existing.id);
      navigate('/');
    }
  };

  return (
    <div>
      <h1 className="page-title">{editMode ? `⚙️ ${t('cycle.editTitle')}` : `✨ ${t('cycle.createTitle')}`}</h1>
      <p className="page-subtitle">{t('cycle.subtitle')}</p>

      <div className="card">
        <div className="form-group">
          <label className="form-label">{t('cycle.name')}</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('cycle.namePlaceholder')}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('cycle.startDate')}</label>
            <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('cycle.endDate')}</label>
            <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('cycle.dayRule')}</label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <label className="form-checkbox">
              <input type="radio" name="dayRule" checked={dayRuleType === 'weekday'} onChange={() => setDayRuleType('weekday')} />
              {t('cycle.weekdays')}
            </label>
            <label className="form-checkbox">
              <input type="radio" name="dayRule" checked={dayRuleType === 'cycle'} onChange={() => setDayRuleType('cycle')} />
              {t('cycle.cycleRule')}
            </label>
            <label className="form-checkbox">
              <input type="radio" name="dayRule" checked={dayRuleType === 'customWeek'} onChange={() => setDayRuleType('customWeek')} />
              {t('cycle.customWeek')}
            </label>
          </div>

          {dayRuleType === 'cycle' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('cycle.studyDays')}</label>
                <input className="form-input" type="number" min={1} max={30} value={studyDays} onChange={(e) => setStudyDays(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('cycle.restDays')}</label>
                <input className="form-input" type="number" min={1} max={30} value={restDays} onChange={(e) => setRestDays(Number(e.target.value))} />
              </div>
            </div>
          )}

          {dayRuleType === 'customWeek' && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <button
                  key={d}
                  className={`btn btn-sm ${activeWeekdays.includes(d) ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => toggleWeekday(d)}
                >
                  {t(weekdayKeys[d])}
                </button>
              ))}
            </div>
          )}
        </div>

        <hr className="divider" />

        <div className="form-group">
          <label className="form-checkbox">
            <input type="checkbox" checked={healthGateEnabled} onChange={(e) => setHealthGateEnabled(e.target.checked)} />
            <span>{t('cycle.enableHealth')}</span>
          </label>
          <p className="form-hint">{t('cycle.healthHint')}</p>
        </div>

        {healthGateEnabled && (
          <div className="form-group">
            <label className="form-label">{t('cycle.healthText')}</label>
            <input
              className="form-input"
              value={healthGateText}
              onChange={(e) => setHealthGateText(e.target.value)}
              placeholder={t('cycle.healthPlaceholder')}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('cycle.launchPhrase')}</label>
          <input
            className="form-input"
            value={launchPhrase}
            onChange={(e) => setLaunchPhrase(e.target.value)}
            placeholder={t('cycle.defaultLaunchPhrase')}
          />
          <p className="form-hint">{t('cycle.launchPhraseHint')}</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('cycle.maxMainGoals')}</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={5}
              value={maxMainGoalsPerDay}
              onChange={(e) => setMaxMainGoalsPerDay(Number(e.target.value))}
            />
            <p className="form-hint">{t('cycle.maxMainGoalsHint')}</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input type="checkbox" checked={hideAmounts} onChange={(e) => setHideAmounts(e.target.checked)} />
            <span>{t('cycle.hideAmounts')}</span>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={!name.trim()}>
          {editMode ? `💾 ${t('cycle.saveChanges')}` : `✅ ${t('cycle.create')}`}
        </button>
        {!onCreated && (
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/')}>{t('common.cancel')}</button>
        )}
        {existing && (
          <button className="btn btn-danger btn-lg" onClick={handleArchive} style={{ marginLeft: 'auto' }}>
            📦 {t('cycle.archive')}
          </button>
        )}
      </div>
    </div>
  );
}
