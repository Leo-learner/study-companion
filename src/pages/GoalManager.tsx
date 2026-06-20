import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, saveGoal, deleteGoal } from '../storage';
import { calculateGoalProgress } from '../progress';
import {
  StudyGoal,
  GoalCategory,
  Priority,
  Difficulty,
  generateId,
} from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { TranslationKey } from '../i18n/messages';

const CATEGORY_KEYS: Record<GoalCategory, TranslationKey> = {
  course: 'goal.category.course', problems: 'goal.category.problems', memory: 'goal.category.memory',
  reading: 'goal.category.reading', project: 'goal.category.project', custom: 'goal.category.custom',
};
const DIFFICULTY_KEYS: Record<Difficulty, TranslationKey> = {
  easy: 'goal.difficulty.easy', normal: 'goal.difficulty.normal', hard: 'goal.difficulty.hard',
};
const PRIORITY_KEYS: Record<Priority, TranslationKey> = {
  high: 'goal.priority.high', medium: 'goal.priority.medium', low: 'goal.priority.low',
};

export default function GoalManager() {
  const cycle = getActiveCycle();
  const cycleId = cycle?.id;
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);
  const navigate = useNavigate();
  const { language, t } = useI18n();

  // 表单状态
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('course');
  const [unitName, setUnitName] = useState('');
  const [totalAmount, setTotalAmount] = useState(100);
  const [completedAmount, setCompletedAmount] = useState(0);
  const [priority, setPriority] = useState<Priority>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [isActive, setIsActive] = useState(true);
  const [minHint, setMinHint] = useState('');
  const [recHint, setRecHint] = useState('');
  const [optHint, setOptHint] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (cycleId) setGoals(getGoals(cycleId));
  }, [cycleId]);

  if (!cycle) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">{t('goal.needCycle')}</div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </div>
    );
  }

  const resetForm = () => {
    setName('');
    setCategory('course');
    setUnitName('');
    setTotalAmount(100);
    setCompletedAmount(0);
    setPriority('medium');
    setDifficulty('normal');
    setIsActive(true);
    setMinHint('');
    setRecHint('');
    setOptHint('');
    setNotes('');
    setEditingGoal(null);
    setShowForm(false);
  };

  const openEdit = (goal: StudyGoal) => {
    setName(goal.name);
    setCategory(goal.category);
    setUnitName(goal.unitName);
    setTotalAmount(goal.totalAmount);
    setCompletedAmount(goal.completedAmount);
    setPriority(goal.priority);
    setDifficulty(goal.difficulty);
    setIsActive(goal.isActive);
    setMinHint(goal.minimumTaskHint);
    setRecHint(goal.recommendedTaskHint);
    setOptHint(goal.optionalTaskHint);
    setNotes(goal.notes);
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const goal: StudyGoal = {
      id: editingGoal?.id || generateId(),
      cycleId: cycle.id,
      name: name.trim(),
      category,
      unitName: unitName.trim() || (language === 'zh' ? '个' : 'items'),
      totalAmount,
      completedAmount: Math.min(completedAmount, totalAmount),
      priority,
      difficulty,
      isActive,
      minimumTaskHint: minHint.trim(),
      recommendedTaskHint: recHint.trim(),
      optionalTaskHint: optHint.trim(),
      notes,
      createdAt: editingGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveGoal(goal);
    setGoals(getGoals(cycle.id));
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm(t('goal.deleteConfirm'))) {
      deleteGoal(id);
      setGoals(getGoals(cycle.id));
    }
  };

  const handleToggleActive = (goal: StudyGoal) => {
    const updated = { ...goal, isActive: !goal.isActive, updatedAt: new Date().toISOString() };
    saveGoal(updated);
    setGoals(getGoals(cycle.id));
  };

  const handleUpdateProgress = (goal: StudyGoal, newAmount: number) => {
    const amount = Math.max(0, Math.min(newAmount, goal.totalAmount));
    const updated = { ...goal, completedAmount: amount, updatedAt: new Date().toISOString() };
    saveGoal(updated);
    setGoals(getGoals(cycle.id));
  };

  // 单位建议
  const unitSuggestions: Record<GoalCategory, string[]> = language === 'zh'
    ? {
        course: ['节', '章', '课', '分钟', '小时'], problems: ['题', '套', '页', '道'],
        memory: ['个', '词', '条', '页'], reading: ['页', '章', '本', '篇'],
        project: ['阶段', '功能', '模块', '个'], custom: ['个', '次', '分钟', '项'],
      }
    : {
        course: ['lessons', 'chapters', 'classes', 'minutes', 'hours'], problems: ['problems', 'sets', 'pages', 'questions'],
        memory: ['items', 'words', 'entries', 'pages'], reading: ['pages', 'chapters', 'books', 'articles'],
        project: ['stages', 'features', 'modules', 'items'], custom: ['items', 'times', 'minutes', 'tasks'],
      };

  return (
    <div>
      <h1 className="page-title">🎯 {t('goal.pageTitle')}</h1>
      <p className="page-subtitle">{t('goal.subtitle')}</p>

      {goals.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">{t('goal.emptyTitle')}</div>
          <div className="empty-state-desc">{t('goal.emptyDescription')}</div>
        </div>
      )}

      {!showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: '16px' }}>
          ＋ {t('goal.add')}
        </button>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-title">{editingGoal ? `✏️ ${t('goal.edit')}` : `✨ ${t('goal.new')}`}</div>
          <div className="card-body" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">{t('goal.name')}</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('goal.namePlaceholder')} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('goal.category')}</label>
                <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value as GoalCategory); setUnitName(''); }}>
                  {(Object.keys(CATEGORY_KEYS) as GoalCategory[]).map((k) => (
                    <option key={k} value={k}>{t(CATEGORY_KEYS[k])}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('goal.unit')}</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder={t('goal.unitPlaceholder')}
                    style={{ flex: 1 }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {unitSuggestions[category].map((u) => (
                    <button key={u} className="btn btn-secondary btn-sm" onClick={() => setUnitName(u)}>{u}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('goal.totalAmount', { unit: unitName || t('common.units') })}</label>
                <input className="form-input" type="number" min={1} value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('goal.completedAmount', { unit: unitName || t('common.units') })}</label>
                <input className="form-input" type="number" min={0} max={totalAmount} value={completedAmount} onChange={(e) => setCompletedAmount(Number(e.target.value))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('goal.priority')}</label>
                <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="high">{t('goal.priority.high')}</option>
                  <option value="medium">{t('goal.priority.medium')}</option>
                  <option value="low">{t('goal.priority.low')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('goal.difficulty')}</label>
                <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                  <option value="easy">{t('goal.difficulty.easy')}</option>
                  <option value="normal">{t('goal.difficulty.normal')}</option>
                  <option value="hard">{t('goal.difficulty.hard')}</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('goal.minimumHint')}</label>
              <input className="form-input" value={minHint} onChange={(e) => setMinHint(e.target.value)} placeholder={t('goal.minimumPlaceholder')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('goal.recommendedHint')}</label>
              <input className="form-input" value={recHint} onChange={(e) => setRecHint(e.target.value)} placeholder={t('goal.recommendedPlaceholder')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('goal.optionalHint')}</label>
              <input className="form-input" value={optHint} onChange={(e) => setOptHint(e.target.value)} placeholder={t('goal.optionalPlaceholder')} />
            </div>

            <div className="form-group">
              <label className="form-label">{t('goal.notes')}</label>
              <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('goal.notesPlaceholder')} />
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                {t('goal.activate')}
              </label>
            </div>
          </div>
          <div className="card-footer">
            <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>💾 {t('common.save')}</button>
            <button className="btn btn-secondary" onClick={resetForm}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* 目标列表 */}
      <div className="grid-2">
        {goals.map((goal) => {
          const progress = calculateGoalProgress(goal);
          return (
            <div key={goal.id} className="card" style={{ opacity: goal.isActive ? 1 : 0.6 }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {goal.name}
                    <span className={`badge ${goal.isActive ? 'badge-success' : 'badge-neutral'}`}>
                      {goal.isActive ? t('common.enabled') : t('common.disabled')}
                    </span>
                  </div>
                  <div className="card-subtitle">
                    {t('goal.cardSubtitle', {
                      category: t(CATEGORY_KEYS[goal.category]),
                      difficulty: t(DIFFICULTY_KEYS[goal.difficulty]),
                      priority: t(PRIORITY_KEYS[goal.priority]),
                    })}
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="progress-bar" style={{ marginBottom: '4px' }}>
                  <div className="progress-bar-fill progress-fill-primary" style={{ width: `${progress}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{progress}%</span>
                  <span>{goal.completedAmount} / {goal.totalAmount} {goal.unitName}</span>
                </div>
                {goal.notes && (
                  <p style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>📝 {goal.notes}</p>
                )}
              </div>
              <div className="card-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)}>✏️ {t('goal.edit')}</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(goal)}>
                  {goal.isActive ? `⏸ ${t('goal.pause')}` : `▶️ ${t('goal.enable')}`}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{t('goal.progressAmount')}</span>
                  <input
                    className="task-amount-input"
                    type="number"
                    min={0}
                    max={goal.totalAmount}
                    value={goal.completedAmount}
                    onChange={(e) => handleUpdateProgress(goal, Number(e.target.value))}
                    style={{ width: '60px' }}
                  />
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(goal.id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
