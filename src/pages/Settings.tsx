import React, { useRef, useState } from 'react';
import {
  clearAllData,
  deleteOverride,
  exportDataJSON,
  getActiveCycle,
  getOverrides,
  importDataJSON,
  saveCycle,
  saveOverride,
  type ImportResult,
} from '../storage';
import { DayOverride, generateId, todayStr } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import CycleSetup from './CycleSetup';

export default function Settings() {
  const { t } = useI18n();
  const cycle = getActiveCycle();
  const [showCycleEdit, setShowCycleEdit] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [showMarkDay, setShowMarkDay] = useState(false);
  const [markMode, setMarkMode] = useState<'rest' | 'holiday' | 'exam' | 'blocked'>('rest');
  const [markReason, setMarkReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = todayStr();

  const [phrase, setPhrase] = useState(cycle?.launchPhrase || t('cycle.defaultLaunchPhrase'));
  const [healthEnabled, setHealthEnabled] = useState(cycle?.healthGateEnabled ?? false);
  const [healthText, setHealthText] = useState(cycle?.healthGateText || '');
  const [hideAmounts, setHideAmounts] = useState(cycle?.hideRawAmountsInFeedback ?? true);
  const [maxMain, setMaxMain] = useState(cycle?.maxMainGoalsPerDay || 1);

  const handleSavePhrase = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, launchPhrase: phrase.trim(), updatedAt: new Date().toISOString() });
    alert(t('settings.phraseUpdated'));
  };

  const handleSaveHealth = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, healthGateEnabled: healthEnabled, healthGateText: healthText, updatedAt: new Date().toISOString() });
    alert(t('settings.healthUpdated'));
  };

  const handleSaveHide = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, hideRawAmountsInFeedback: hideAmounts, updatedAt: new Date().toISOString() });
    alert(t('settings.feedbackUpdated'));
  };

  const handleSaveMaxMain = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, maxMainGoalsPerDay: maxMain, updatedAt: new Date().toISOString() });
    alert(t('settings.mainGoalsUpdated'));
  };

  const handleCycleEdited = () => {
    const updatedCycle = getActiveCycle();
    if (updatedCycle) {
      setPhrase(updatedCycle.launchPhrase || t('cycle.defaultLaunchPhrase'));
      setHealthEnabled(updatedCycle.healthGateEnabled);
      setHealthText(updatedCycle.healthGateText);
      setHideAmounts(updatedCycle.hideRawAmountsInFeedback);
      setMaxMain(updatedCycle.maxMainGoalsPerDay);
    }
    setShowCycleEdit(false);
  };

  const handleMarkDay = () => {
    if (!cycle) return;
    const existing = getOverrides(cycle.id).find((override) => override.date === today);
    if (existing) deleteOverride(existing.id);
    const override: DayOverride = {
      id: generateId(), cycleId: cycle.id, date: today, mode: markMode,
      reason: markReason, createdAt: new Date().toISOString(),
    };
    saveOverride(override);
    setShowMarkDay(false);
    setMarkReason('');
    alert(t('settings.markedToday'));
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
      setImportText('');
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

  const handleImport = () => applyImportResult(importDataJSON(importText));

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => applyImportResult(importDataJSON(String(loadEvent.target?.result ?? '')));
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (confirm(t('settings.clearConfirm1')) && confirm(t('settings.clearConfirm2'))) {
      clearAllData();
      window.location.reload();
    }
  };

  if (showCycleEdit) return <CycleSetup onCreated={handleCycleEdited} editMode />;

  const coreKeys = ['core1', 'core2', 'core3', 'core4', 'core5', 'core6', 'core7', 'core8', 'core9'] as const;
  const flowKeys = ['flow1', 'flow2', 'flow3', 'flow4', 'flow5'] as const;

  return (
    <div>
      <h1 className="page-title">⚙️ {t('settings.title')}</h1>
      <p className="page-subtitle">{t('settings.subtitle')}</p>

      <div className="card settings-section">
        <h3>🔑 {t('settings.launchSection')}</h3>
        <div className="form-group">
          <label className="form-label">{t('settings.currentPhrase')}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="form-input" value={phrase} onChange={(event) => setPhrase(event.target.value)} />
            <button className="btn btn-primary" onClick={handleSavePhrase}>{t('common.save')}</button>
          </div>
        </div>
      </div>

      <div className="card settings-section">
        <h3>🏃 {t('settings.healthSection')}</h3>
        <div className="form-group"><label className="form-checkbox">
          <input type="checkbox" checked={healthEnabled} onChange={(event) => setHealthEnabled(event.target.checked)} />
          {t('cycle.enableHealth')}
        </label></div>
        {healthEnabled && <div className="form-group"><input className="form-input" value={healthText} onChange={(event) => setHealthText(event.target.value)} placeholder={t('settings.healthPlaceholder')} /></div>}
        <button className="btn btn-primary" onClick={handleSaveHealth}>{t('common.save')}</button>
      </div>

      <div className="card settings-section">
        <h3>📊 {t('settings.feedbackSection')}</h3>
        <div className="form-group"><label className="form-checkbox">
          <input type="checkbox" checked={hideAmounts} onChange={(event) => setHideAmounts(event.target.checked)} />
          {t('cycle.hideAmounts')}
        </label></div>
        <button className="btn btn-primary" onClick={handleSaveHide}>{t('common.save')}</button>
      </div>

      <div className="card settings-section">
        <h3>🎯 {t('settings.mainGoalsSection')}</h3>
        <div className="form-group">
          <label className="form-label">{t('cycle.maxMainGoals')}</label>
          <input className="form-input" type="number" min={1} max={5} value={maxMain} onChange={(event) => setMaxMain(Number(event.target.value))} style={{ maxWidth: '200px' }} />
        </div>
        <button className="btn btn-primary" onClick={handleSaveMaxMain}>{t('common.save')}</button>
      </div>

      <div className="card settings-section">
        <h3>📅 {t('settings.markSpecialSection')}</h3>
        {showMarkDay ? <div>
          <div className="form-group">
            <label className="form-label">{t('settings.type')}</label>
            <select className="form-select" value={markMode} onChange={(event) => setMarkMode(event.target.value as typeof markMode)}>
              {(['rest', 'holiday', 'exam', 'blocked'] as const).map((mode) => <option key={mode} value={mode}>{t(`plan.mode.${mode}`)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">{t('settings.reason')}</label>
            <input className="form-input" value={markReason} onChange={(event) => setMarkReason(event.target.value)} placeholder={t('settings.reasonPlaceholder')} />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={handleMarkDay}>{t('settings.confirmMark')}</button>
            <button className="btn btn-secondary" onClick={() => setShowMarkDay(false)}>{t('common.cancel')}</button>
          </div>
        </div> : <button className="btn btn-secondary" onClick={() => setShowMarkDay(true)}>📅 {t('settings.markToday')}</button>}
      </div>

      <div className="card settings-section">
        <h3>📦 {t('settings.cycleSection')}</h3>
        <button className="btn btn-secondary" onClick={() => setShowCycleEdit(true)}>⚙️ {t('settings.editCycle')}</button>
      </div>

      <div className="card settings-section">
        <h3>💾 {t('settings.dataSection')}</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button className="btn btn-primary" onClick={handleExport}>📥 {t('settings.export')}</button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>📤 {t('settings.importFile')}</button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileImport} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('settings.manualImport')}</label>
          <textarea className="form-textarea" value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={t('settings.jsonPlaceholder')} rows={4} />
          {importError && <p className="form-hint" style={{ color: 'var(--color-danger)' }}>{importError}</p>}
          {importSuccess && <p className="form-hint" style={{ color: 'var(--color-success)' }}>{importSuccess}</p>}
          <button className="btn btn-primary btn-sm" onClick={handleImport} style={{ marginTop: '8px' }} disabled={!importText.trim()}>{t('settings.import')}</button>
        </div>
        <hr className="divider" />
        <button className="btn btn-danger" onClick={handleClear}>🗑 {t('settings.clear')}</button>
        <p className="form-hint">{t('settings.clearHint')}</p>
      </div>

      <details className="card settings-section">
        <summary> {t('settings.helpSection')}</summary>
        <div className="card-body" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
          <p><strong>{t('settings.coreIdea')}</strong></p>
          <ul style={{ paddingLeft: '20px' }}>{coreKeys.map((key) => <li key={key}>{t(`settings.${key}`)}</li>)}</ul>
          <p style={{ marginTop: '12px' }}><strong>{t('settings.dailyFlow')}</strong></p>
          <ol style={{ paddingLeft: '20px' }}>{flowKeys.map((key) => <li key={key}>{t(`settings.${key}`)}</li>)}</ol>
        </div>
      </details>
    </div>
  );
}
