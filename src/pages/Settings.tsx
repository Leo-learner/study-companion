import React, { useRef, useState } from 'react';
import {
  clearAllData, deleteOverride, exportDataJSON, getActiveCycle, getOverrides,
  importDataJSON, saveCycle, saveOverride, type ImportResult,
} from '../storage';
import { DayOverride, generateId, todayStr } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { useTheme } from '../theme';
import Icon from '../components/Icon';
import { MODE_CLASS, MODE_KEYS } from '../components/StatusChips';
import CycleSetup from './CycleSetup';
import { TranslationKey } from '../i18n/messages';

const SPECIAL_MODES: DayOverride['mode'][] = ['rest', 'holiday', 'exam', 'blocked'];
const MANUAL_KEYS: TranslationKey[] = [
  'settingsNew.manual1', 'settingsNew.manual2', 'settingsNew.manual3',
  'settingsNew.manual4', 'settingsNew.manual5', 'settingsNew.manual6',
];

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button type="button" className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on}
            aria-label={label} onClick={onToggle}>
      <span className="switch-knob" />
    </button>
  );
}

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const cycle = getActiveCycle();
  const [showCycleEdit, setShowCycleEdit] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [savedHint, setSavedHint] = useState('');
  const [clearArmed, setClearArmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = todayStr();

  const [phrase, setPhrase] = useState(cycle?.launchPhrase || t('cycle.defaultLaunchPhrase'));
  const [healthEnabled, setHealthEnabled] = useState(cycle?.healthGateEnabled ?? false);
  const [hideAmounts, setHideAmounts] = useState(cycle?.hideRawAmountsInFeedback ?? true);
  const [maxMain, setMaxMain] = useState(cycle?.maxMainGoalsPerDay || 1);
  const [special, setSpecial] = useState<DayOverride['mode'] | ''>(
    () => (cycle ? getOverrides(cycle.id).find((o) => o.date === today)?.mode ?? '' : ''),
  );

  /** 设置项即时生效并落库，不再用 alert 打断。 */
  const patchCycle = (patch: Partial<NonNullable<typeof cycle>>, hint: TranslationKey) => {
    if (!cycle) return;
    saveCycle({ ...cycle, ...patch, updatedAt: new Date().toISOString() });
    setSavedHint(t(hint));
    window.setTimeout(() => setSavedHint(''), 2200);
  };

  const handleCycleEdited = () => {
    const updated = getActiveCycle();
    if (updated) {
      setPhrase(updated.launchPhrase || t('cycle.defaultLaunchPhrase'));
      setHealthEnabled(updated.healthGateEnabled);
      setHideAmounts(updated.hideRawAmountsInFeedback);
      setMaxMain(updated.maxMainGoalsPerDay);
    }
    setShowCycleEdit(false);
  };

  const toggleSpecial = (mode: DayOverride['mode']) => {
    if (!cycle) return;
    const existing = getOverrides(cycle.id).find((o) => o.date === today);
    if (existing) deleteOverride(existing.id);
    if (special === mode) { setSpecial(''); return; }
    saveOverride({
      id: generateId(), cycleId: cycle.id, date: today, mode,
      reason: t(MODE_KEYS[mode]), createdAt: new Date().toISOString(),
    });
    setSpecial(mode);
  };

  const handleExport = () => {
    const blob = new Blob([exportDataJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `study-companion-backup-${today}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyImportResult = (result: ImportResult) => {
    if (result.success) {
      setImportSuccess(t('settings.importSuccess'));
      setImportError('');
      return;
    }
    const key = result.errorCode === 'invalidFormat'
      ? 'import.invalidFormat'
      : result.errorCode === 'missingFields'
        ? 'import.missingFields'
        : 'import.jsonParse';
    setImportError(t(key, { detail: result.detail ?? '' }));
    setImportSuccess('');
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => applyImportResult(importDataJSON(String(e.target?.result ?? '')));
    reader.readAsText(file);
  };

  // 清空数据是不可逆的：陶土色 + 两段确认，仍然不用红色
  const handleClear = () => {
    if (!clearArmed) { setClearArmed(true); return; }
    clearAllData();
    window.location.reload();
  };

  if (showCycleEdit) return <CycleSetup onCreated={handleCycleEdited} editMode />;

  return (
    <>
      <h1 className="h1">{t('settings.title')}</h1>

      {savedHint && (
        <div className="notice" style={{ background: 'var(--sc-primary-soft)' }}>
          <Icon name="check" size={17} style={{ marginTop: 2, color: 'var(--sc-primary)' }} />
          <div className="notice-body">{savedHint}</div>
        </div>
      )}

      <div className="settings-group">
        {/* 启动暗号 */}
        <div className="setting-row setting-stack">
          <div className="card-title">
            <Icon name="key" size={16} style={{ color: 'var(--sc-primary)' }} />
            {t('settings.launchSection')}
          </div>
          <input
            className="input input-ritual"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            onBlur={() => phrase.trim() && patchCycle({ launchPhrase: phrase.trim() }, 'settings.phraseUpdated')}
            aria-label={t('settings.currentPhrase')}
            disabled={!cycle}
          />
          <div className="note">{t('settingsNew.codewordHint')}</div>
        </div>

        {/* 健康前置 */}
        <div className="setting-row">
          <div className="col" style={{ flex: 1, gap: 5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settingsNew.healthToggle')}</div>
            <div className="note">{t('settingsNew.healthToggleHint')}</div>
          </div>
          <Switch
            on={healthEnabled}
            label={t('settingsNew.healthToggle')}
            onToggle={() => {
              const next = !healthEnabled;
              setHealthEnabled(next);
              patchCycle({ healthGateEnabled: next }, 'settings.healthUpdated');
            }}
          />
        </div>

        {/* 只显示百分比 */}
        <div className="setting-row">
          <div className="col" style={{ flex: 1, gap: 5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settingsNew.rawToggle')}</div>
            <div className="note">{t('settingsNew.rawToggleHint')}</div>
          </div>
          <Switch
            on={hideAmounts}
            label={t('settingsNew.rawToggle')}
            onToggle={() => {
              const next = !hideAmounts;
              setHideAmounts(next);
              patchCycle({ hideRawAmountsInFeedback: next }, 'settings.feedbackUpdated');
            }}
          />
        </div>

        {/* 深色模式 */}
        <div className="setting-row">
          <div className="col" style={{ flex: 1, gap: 5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settingsNew.darkToggle')}</div>
            <div className="note">{t('settingsNew.darkToggleHint')}</div>
          </div>
          <Switch on={theme === 'dark'} label={t('settingsNew.darkToggle')} onToggle={toggleTheme} />
        </div>

        {/* 每日最多主线目标 */}
        <div className="setting-row">
          <div className="col" style={{ flex: 1, gap: 5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settingsNew.maxMain')}</div>
            <div className="note">{t('settingsNew.maxMainHint')}</div>
          </div>
          <div className="row" style={{ gap: 8, flex: 'none' }}>
            <button className="btn btn-quiet btn-sm" style={{ width: 40, padding: 0 }} aria-label={t('common.decrease')}
                    onClick={() => { const v = Math.max(1, maxMain - 1); setMaxMain(v); patchCycle({ maxMainGoalsPerDay: v }, 'settings.mainGoalsUpdated'); }}>
              <Icon name="minus" size={16} />
            </button>
            <span style={{ minWidth: 22, textAlign: 'center', fontSize: 16, fontWeight: 500 }}>{maxMain}</span>
            <button className="btn btn-quiet btn-sm" style={{ width: 40, padding: 0 }} aria-label={t('common.increase')}
                    onClick={() => { const v = Math.min(3, maxMain + 1); setMaxMain(v); patchCycle({ maxMainGoalsPerDay: v }, 'settings.mainGoalsUpdated'); }}>
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>

        {/* 语言 */}
        <div className="setting-row">
          <div className="col" style={{ flex: 1, gap: 5 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t('settings.language')}</div>
            <div className="note">{t('settingsNew.langHint')}</div>
          </div>
          <div className="seg">
            <button className={`seg-btn${language === 'zh' ? ' on' : ''}`} onClick={() => setLanguage('zh')}>中文</button>
            <button className={`seg-btn${language === 'en' ? ' on' : ''}`} onClick={() => setLanguage('en')}>EN</button>
          </div>
        </div>
      </div>

      {/* 把今天标成特殊日 */}
      {cycle && (
        <div className="card card-flat">
          <div className="card-title">
            <Icon name="rest" size={16} style={{ color: 'var(--sc-rest)' }} />
            {t('dashboard.markToday')}
          </div>
          <div className="row-wrap" style={{ gap: 8 }}>
            {SPECIAL_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={special === mode}
                className={`btn btn-sm chip ${MODE_CLASS[mode]}`}
                style={special === mode
                  ? { background: 'var(--sc-rest)', color: '#fff', border: 'none', borderRadius: 'var(--sc-pill)' }
                  : { border: 'none', borderRadius: 'var(--sc-pill)' }}
                onClick={() => toggleSpecial(mode)}
              >
                {t(MODE_KEYS[mode])}
              </button>
            ))}
          </div>
          <div className="note">
            {special ? t('settingsNew.specialNoteSet') : t('settingsNew.specialNoteIdle')}
          </div>
        </div>
      )}

      {/* 周期设置 */}
      {cycle && (
        <button className="btn btn-outline" style={{ alignSelf: 'flex-start' }} onClick={() => setShowCycleEdit(true)}>
          <Icon name="plan" size={17} />
          {t('settings.cycleSection')}
        </button>
      )}

      {/* 数据 */}
      <div className="card card-flat">
        <div className="card-title">
          <Icon name="data" size={16} style={{ color: 'var(--sc-primary)' }} />
          {t('settingsNew.dataTitle')}
        </div>
        <div className="row-wrap" style={{ gap: 9 }}>
          <button className="btn btn-soft" onClick={handleExport}>{t('settings.export')}</button>
          <button className="btn btn-quiet" onClick={() => fileInputRef.current?.click()}>{t('settings.importFile')}</button>
          <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleFileImport} />
          <span className="spacer" />
          <button className="btn btn-caution" onClick={handleClear} onBlur={() => setClearArmed(false)}>
            {clearArmed ? t('common.confirmDelete') : t('settings.clear')}
          </button>
        </div>
        {importSuccess && <div className="note" style={{ color: 'var(--sc-primary)' }}>{importSuccess}</div>}
        {importError && <div className="note" style={{ color: 'var(--sc-rest)' }}>{importError}</div>}
        <div className="note">{t('settingsNew.dataHint')}</div>
      </div>

      {/* 隐私政策：商店要求可公开访问，App 内则读内置副本 */}
      <a className="card card-flat" href="privacy.html" target="_blank" rel="noreferrer"
         style={{ textDecoration: 'none' }}>
        <div className="row" style={{ gap: 9 }}>
          <Icon name="book" size={16} style={{ color: 'var(--sc-primary)' }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--sc-ink)' }}>
            {t('settingsNew.privacy')}
          </span>
          <Icon name="chev" size={16} style={{ color: 'var(--sc-ink-3)' }} />
        </div>
        <div className="note">{t('settingsNew.privacyHint')}</div>
      </a>

      {/* 使用说明 */}
      <div className="card card-quiet">
        <div className="card-title">
          <Icon name="book" size={16} style={{ color: 'var(--sc-ink-3)' }} />
          {t('settingsNew.manual')}
        </div>
        <div className="stack-8">
          {MANUAL_KEYS.map((key) => (
            <div className="row" key={key} style={{ alignItems: 'flex-start', gap: 10, fontSize: 12.5, lineHeight: 1.75, color: 'var(--sc-ink-2)' }}>
              <span style={{ color: 'var(--sc-primary)', flex: 'none' }}>—</span>
              <span>{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
