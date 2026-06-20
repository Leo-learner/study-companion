import React, { useState, useRef } from 'react';
import { getActiveCycle, saveCycle, exportDataJSON, importDataJSON, clearAllData, saveOverride, deleteOverride, getOverrides } from '../storage';
import { todayStr, DayOverride, generateId } from '../types';
import CycleSetup from './CycleSetup';

export default function Settings() {
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

  // --- 修改暗号 ---
  const [phrase, setPhrase] = useState(cycle?.launchPhrase || '开始学习');
  const handleSavePhrase = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, launchPhrase: phrase.trim(), updatedAt: new Date().toISOString() });
    alert('暗号已更新');
  };

  // --- 修改健康前置 ---
  const [healthEnabled, setHealthEnabled] = useState(cycle?.healthGateEnabled ?? false);
  const [healthText, setHealthText] = useState(cycle?.healthGateText || '');
  const handleSaveHealth = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, healthGateEnabled: healthEnabled, healthGateText: healthText, updatedAt: new Date().toISOString() });
    alert('健康前置规则已更新');
  };

  // --- 修改反馈显示 ---
  const [hideAmounts, setHideAmounts] = useState(cycle?.hideRawAmountsInFeedback ?? true);
  const handleSaveHide = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, hideRawAmountsInFeedback: hideAmounts, updatedAt: new Date().toISOString() });
    alert('反馈显示规则已更新');
  };

  // --- 修改最大主线目标 ---
  const [maxMain, setMaxMain] = useState(cycle?.maxMainGoalsPerDay || 1);
  const handleSaveMaxMain = () => {
    if (!cycle) return;
    saveCycle({ ...cycle, maxMainGoalsPerDay: maxMain, updatedAt: new Date().toISOString() });
    alert('每日主线目标数量已更新');
  };

  const handleCycleEdited = () => {
    const updatedCycle = getActiveCycle();
    if (updatedCycle) {
      setPhrase(updatedCycle.launchPhrase || '开始学习');
      setHealthEnabled(updatedCycle.healthGateEnabled);
      setHealthText(updatedCycle.healthGateText);
      setHideAmounts(updatedCycle.hideRawAmountsInFeedback);
      setMaxMain(updatedCycle.maxMainGoalsPerDay);
    }
    setShowCycleEdit(false);
  };

  // --- 标记特殊日 ---
  const handleMarkDay = () => {
    if (!cycle) return;
    const existing = getOverrides(cycle.id).find((o) => o.date === today);
    if (existing) {
      deleteOverride(existing.id);
    }
    const override: DayOverride = {
      id: generateId(),
      cycleId: cycle.id,
      date: today,
      mode: markMode,
      reason: markReason || '',
      createdAt: new Date().toISOString(),
    };
    saveOverride(override);
    setShowMarkDay(false);
    setMarkReason('');
    alert(`今天已标记为特殊日`);
  };

  // --- 导出 ---
  const handleExport = () => {
    const json = exportDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-companion-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- 导入 ---
  const handleImport = () => {
    setImportError('');
    setImportSuccess('');
    const result = importDataJSON(importText);
    if (result.success) {
      setImportSuccess('数据导入成功！请刷新页面查看。');
      setImportText('');
    } else {
      setImportError(result.error || '导入失败');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportText(text);
      const result = importDataJSON(text);
      if (result.success) {
        setImportSuccess('数据导入成功！请刷新页面查看。');
        setImportError('');
      } else {
        setImportError(result.error || '导入失败');
        setImportSuccess('');
      }
    };
    reader.readAsText(file);
  };

  // --- 清空 ---
  const handleClear = () => {
    if (confirm('确定要清空所有本地数据吗？此操作不可恢复。建议先导出备份。')) {
      if (confirm('再次确认：清空后所有学习数据将永久丢失。')) {
        clearAllData();
        window.location.reload();
      }
    }
  };

  if (showCycleEdit) {
    return <CycleSetup onCreated={handleCycleEdited} editMode />;
  }

  return (
    <div>
      <h1 className="page-title">⚙️ 设置</h1>
      <p className="page-subtitle">管理学习周期、数据和偏好。</p>

      {/* 修改暗号 */}
      <div className="card settings-section">
        <h3>🔑 启动暗号</h3>
        <div className="form-group">
          <label className="form-label">当前暗号</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input className="form-input" value={phrase} onChange={(e) => setPhrase(e.target.value)} />
            <button className="btn btn-primary" onClick={handleSavePhrase}>保存</button>
          </div>
        </div>
      </div>

      {/* 健康前置 */}
      <div className="card settings-section">
        <h3>🏃 健康前置规则</h3>
        <div className="form-group">
          <label className="form-checkbox">
            <input type="checkbox" checked={healthEnabled} onChange={(e) => setHealthEnabled(e.target.checked)} />
            开启健康前置
          </label>
        </div>
        {healthEnabled && (
          <div className="form-group">
            <input className="form-input" value={healthText} onChange={(e) => setHealthText(e.target.value)} placeholder="健康前置说明..." />
          </div>
        )}
        <button className="btn btn-primary" onClick={handleSaveHealth}>保存</button>
      </div>

      {/* 反馈显示 */}
      <div className="card settings-section">
        <h3>📊 反馈显示</h3>
        <div className="form-group">
          <label className="form-checkbox">
            <input type="checkbox" checked={hideAmounts} onChange={(e) => setHideAmounts(e.target.checked)} />
            打卡反馈中隐藏具体数量（只显示百分比）
          </label>
        </div>
        <button className="btn btn-primary" onClick={handleSaveHide}>保存</button>
      </div>

      {/* 主线目标数量 */}
      <div className="card settings-section">
        <h3>🎯 每日主线目标</h3>
        <div className="form-group">
          <label className="form-label">每天最多几个主线目标</label>
          <input className="form-input" type="number" min={1} max={5} value={maxMain} onChange={(e) => setMaxMain(Number(e.target.value))} style={{ maxWidth: '200px' }} />
        </div>
        <button className="btn btn-primary" onClick={handleSaveMaxMain}>保存</button>
      </div>

      {/* 标记特殊日 */}
      <div className="card settings-section">
        <h3>📅 标记今天为特殊日</h3>
        {showMarkDay ? (
          <div>
            <div className="form-group">
              <label className="form-label">类型</label>
              <select className="form-select" value={markMode} onChange={(e) => setMarkMode(e.target.value as typeof markMode)}>
                <option value="rest">休息日</option>
                <option value="holiday">放假日</option>
                <option value="exam">考试日</option>
                <option value="blocked">客观阻断日</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">原因</label>
              <input className="form-input" value={markReason} onChange={(e) => setMarkReason(e.target.value)} placeholder="说明原因..." />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" onClick={handleMarkDay}>确认标记</button>
              <button className="btn btn-secondary" onClick={() => setShowMarkDay(false)}>取消</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-secondary" onClick={() => setShowMarkDay(true)}>
            📅 标记今天
          </button>
        )}
      </div>

      {/* 编辑周期 */}
      <div className="card settings-section">
        <h3>📦 学习周期管理</h3>
        <button className="btn btn-secondary" onClick={() => setShowCycleEdit(true)}>
          ⚙️ 编辑学习周期
        </button>
      </div>

      {/* 数据管理 */}
      <div className="card settings-section">
        <h3>💾 数据管理</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <button className="btn btn-primary" onClick={handleExport}>📥 导出 JSON</button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>📤 从文件导入</button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileImport} />
        </div>

        <div className="form-group">
          <label className="form-label">手动粘贴 JSON 导入</label>
          <textarea className="form-textarea" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="粘贴 JSON 数据..." rows={4} />
          {importError && <p className="form-hint" style={{ color: 'var(--color-danger)' }}>{importError}</p>}
          {importSuccess && <p className="form-hint" style={{ color: 'var(--color-success)' }}>{importSuccess}</p>}
          <button className="btn btn-primary btn-sm" onClick={handleImport} style={{ marginTop: '8px' }} disabled={!importText.trim()}>导入</button>
        </div>

        <hr className="divider" />

        <button className="btn btn-danger" onClick={handleClear}>🗑 清空所有本地数据</button>
        <p className="form-hint">清空前建议先导出备份。</p>
      </div>

      {/* 使用说明 */}
      <div className="card settings-section">
        <h3>📖 使用说明</h3>
        <div className="card-body" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
          <p><strong>核心理念</strong></p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>学习系统的目标是长期稳定，不是每天完美。</li>
            <li>每天只生成今天的任务，不提前把未来每天排死。</li>
            <li>每天最多只有一个主线目标，避免多线并行导致内耗。</li>
            <li>每个学习日必须有极低启动成本的保底任务。</li>
            <li>未完成任务不默认累加到第二天，不制造欠债雪球。</li>
            <li>允许休息日、休整日、放假日、考试日和客观阻断日。</li>
            <li>健康前置比学习任务更优先。</li>
            <li>收工后当天结束，不再追加强制学习任务。</li>
            <li>打卡反馈优先显示百分比和趋势，减少具体数量带来的压力。</li>
          </ul>
          <p style={{ marginTop: '12px' }}><strong>每日流程</strong></p>
          <ol style={{ paddingLeft: '20px' }}>
            <li>进入首页，完成健康前置（如果开启）。</li>
            <li>输入暗号启动今日计划。</li>
            <li>进入今日任务页，完成保底任务。</li>
            <li>状态好时完成推荐任务和可选任务。</li>
            <li>点击收工，查看打卡反馈。</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
