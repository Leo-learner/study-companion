import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, saveGoal, deleteGoal } from '../storage';
import { calculateGoalProgress } from '../progress';
import { StudyGoal, GoalCategory, Priority, Difficulty, generateId } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import { TranslationKey } from '../i18n/messages';
import Icon from '../components/Icon';

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

/** 六个类别各有底色，让目标列表一眼能分组。 */
const CATEGORY_STYLE: Record<GoalCategory, { bg: string; fg: string }> = {
  course: { bg: 'var(--sc-primary-soft)', fg: 'var(--sc-primary)' },
  problems: { bg: 'var(--sc-rec-soft)', fg: 'var(--sc-rec)' },
  memory: { bg: 'var(--sc-low-soft)', fg: 'var(--sc-low)' },
  reading: { bg: 'var(--sc-exam-soft)', fg: 'var(--sc-exam)' },
  project: { bg: 'var(--sc-rest-soft)', fg: 'var(--sc-rest)' },
  custom: { bg: 'var(--sc-opt-soft)', fg: 'var(--sc-opt)' },
};

const CATEGORIES: GoalCategory[] = ['course', 'problems', 'memory', 'reading', 'project', 'custom'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

export default function GoalManager() {
  const cycle = getActiveCycle();
  const cycleId = cycle?.id;
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { language, t } = useI18n();

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
      <div className="empty">
        <div className="empty-mark"><Icon name="book" size={30} /></div>
        <h1 className="h2">{t('goal.needCycle')}</h1>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>{t('common.backHome')}</button>
      </div>
    );
  }

  const resetForm = () => {
    setName(''); setCategory('course'); setUnitName(''); setTotalAmount(100); setCompletedAmount(0);
    setPriority('medium'); setDifficulty('normal'); setIsActive(true);
    setMinHint(''); setRecHint(''); setOptHint(''); setNotes('');
    setEditingGoal(null); setShowForm(false);
  };

  const openEdit = (goal: StudyGoal) => {
    setName(goal.name); setCategory(goal.category); setUnitName(goal.unitName);
    setTotalAmount(goal.totalAmount); setCompletedAmount(goal.completedAmount);
    setPriority(goal.priority); setDifficulty(goal.difficulty); setIsActive(goal.isActive);
    setMinHint(goal.minimumTaskHint); setRecHint(goal.recommendedTaskHint);
    setOptHint(goal.optionalTaskHint); setNotes(goal.notes);
    setEditingGoal(goal); setShowForm(true);
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

  // 删除用陶土色 + 就地二次确认，不用红色、不用系统弹窗
  const handleDelete = (id: string) => {
    if (pendingDelete !== id) { setPendingDelete(id); return; }
    deleteGoal(id);
    setGoals(getGoals(cycle.id));
    setPendingDelete(null);
  };

  const handleToggleActive = (goal: StudyGoal) => {
    saveGoal({ ...goal, isActive: !goal.isActive, updatedAt: new Date().toISOString() });
    setGoals(getGoals(cycle.id));
  };

  const handleBump = (goal: StudyGoal) => {
    const step = Math.max(1, Math.round(goal.totalAmount / 20));
    const amount = Math.max(0, Math.min(goal.completedAmount + step, goal.totalAmount));
    saveGoal({ ...goal, completedAmount: amount, updatedAt: new Date().toISOString() });
    setGoals(getGoals(cycle.id));
  };

  const activeCount = goals.filter((g) => g.isActive).length;

  return (
    <>
      <div className="row-wrap" style={{ alignItems: 'flex-end', gap: 12 }}>
        <div className="page-head" style={{ flex: 1, minWidth: 180 }}>
          <h1 className="h1">{t('goal.pageTitle')}</h1>
          <div className="sub">{t('goal.countSubtitle', { active: activeCount, total: goals.length })}</div>
        </div>
        <button className="btn btn-primary" onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          <Icon name={showForm ? 'minus' : 'plus'} size={17} />
          {showForm ? t('common.cancel') : t('goal.add')}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ borderColor: 'var(--sc-primary)' }}>
          <div className="card-title">{editingGoal ? t('goal.edit') : t('goal.add')}</div>

          <div className="field">
            <label className="label" htmlFor="g-name">{t('goal.name')}</label>
            <input id="g-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('goal.namePlaceholder')} />
          </div>

          <div className="row-wrap" style={{ gap: 10 }}>
            <div className="field" style={{ flex: 1, minWidth: 110 }}>
              <label className="label" htmlFor="g-total">{t('goal.totalAmount')}</label>
              <input id="g-total" className="input" type="number" min={1} value={totalAmount}
                     onChange={(e) => setTotalAmount(Number(e.target.value))} />
            </div>
            <div className="field" style={{ width: 130 }}>
              <label className="label" htmlFor="g-unit">{t('goal.unit')}</label>
              <input id="g-unit" className="input" value={unitName} onChange={(e) => setUnitName(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 110 }}>
              <label className="label" htmlFor="g-done">{t('goal.completedAmount')}</label>
              <input id="g-done" className="input" type="number" min={0} value={completedAmount}
                     onChange={(e) => setCompletedAmount(Number(e.target.value))} />
            </div>
          </div>

          <div className="field">
            <span className="label">{t('goal.category')}</span>
            <div className="row-wrap" style={{ gap: 8 }}>
              {CATEGORIES.map((c) => {
                const on = category === c;
                const s = CATEGORY_STYLE[c];
                return (
                  <button key={c} type="button" className="btn btn-sm" aria-pressed={on}
                          style={{ background: on ? s.fg : s.bg, color: on ? '#fff' : s.fg, border: 'none', borderRadius: 'var(--sc-pill)' }}
                          onClick={() => setCategory(c)}>
                    {t(CATEGORY_KEYS[c])}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="row-wrap" style={{ gap: 18 }}>
            <div className="field">
              <span className="label">{t('goal.priority')}</span>
              <div className="row-wrap" style={{ gap: 6 }}>
                {PRIORITIES.map((p) => (
                  <button key={p} type="button" className={`btn btn-sm ${priority === p ? 'btn-soft' : 'btn-outline'}`}
                          aria-pressed={priority === p} onClick={() => setPriority(p)}>
                    {t(PRIORITY_KEYS[p])}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label">{t('goal.difficulty')}</span>
              <div className="row-wrap" style={{ gap: 6 }}>
                {DIFFICULTIES.map((d) => (
                  <button key={d} type="button" className={`btn btn-sm ${difficulty === d ? 'btn-soft' : 'btn-outline'}`}
                          aria-pressed={difficulty === d} onClick={() => setDifficulty(d)}>
                    {t(DIFFICULTY_KEYS[d])}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="g-min">{t('goal.minimumHint')}</label>
            <input id="g-min" className="input" value={minHint} onChange={(e) => setMinHint(e.target.value)} placeholder={t('goal.minimumPlaceholder')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="g-rec">{t('goal.recommendedHint')}</label>
            <input id="g-rec" className="input" value={recHint} onChange={(e) => setRecHint(e.target.value)} placeholder={t('goal.recommendedPlaceholder')} />
          </div>
          <div className="field">
            <label className="label" htmlFor="g-opt">{t('goal.optionalHint')}</label>
            <input id="g-opt" className="input" value={optHint} onChange={(e) => setOptHint(e.target.value)} placeholder={t('goal.optionalPlaceholder')} />
          </div>

          <div className="row-wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={!name.trim()}>
              {t('common.save')}
            </button>
            <button className="btn btn-outline" onClick={resetForm}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <div className="grid-2">
        {goals.map((goal) => {
          const pct = calculateGoalProgress(goal);
          const s = CATEGORY_STYLE[goal.category];
          const confirming = pendingDelete === goal.id;
          return (
            <div className="card card-flat" key={goal.id} style={{ opacity: goal.isActive ? 1 : .55 }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                <div className="col" style={{ flex: 1, gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => openEdit(goal)}
                    style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer',
                             fontSize: 16, fontWeight: 500, color: 'var(--sc-ink)', lineHeight: 1.4 }}
                  >
                    {goal.name}
                  </button>
                  <div className="row-wrap" style={{ gap: 7 }}>
                    <span className="chip" style={{ background: s.bg, color: s.fg }}>{t(CATEGORY_KEYS[goal.category])}</span>
                    <span className="note">{t(DIFFICULTY_KEYS[goal.difficulty])}</span>
                    <span className="dot-sep">·</span>
                    <span className="note">{t(PRIORITY_KEYS[goal.priority])}</span>
                  </div>
                </div>
                <span className={`chip ${goal.isActive ? 'chip-primary' : 'chip-opt'}`}>
                  {goal.isActive ? t('common.enabled') : t('common.disabled')}
                </span>
              </div>

              <div className="stack-8">
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="row" style={{ alignItems: 'baseline', gap: 8 }}>
                  <span className="num" style={{ fontSize: 22, color: 'var(--sc-ink)' }}>{pct}%</span>
                  <span className="spacer" />
                  <span className="tnum" style={{ fontSize: 12, color: 'var(--sc-ink-3)' }}>
                    {goal.completedAmount} / {goal.totalAmount} {goal.unitName}
                  </span>
                </div>
              </div>

              <div className="row-wrap" style={{ gap: 8, borderTop: '1px solid var(--sc-line-soft)', paddingTop: 12 }}>
                <button className="btn btn-quiet btn-sm" onClick={() => handleBump(goal)}>
                  <Icon name="plus" size={16} />
                  {t('goal.bump')}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => handleToggleActive(goal)}>
                  {goal.isActive ? t('goal.pause') : t('goal.resume')}
                </button>
                <span className="spacer" />
                <button
                  className="btn btn-caution btn-sm"
                  onClick={() => handleDelete(goal.id)}
                  onBlur={() => setPendingDelete((p) => (p === goal.id ? null : p))}
                >
                  {confirming ? t('common.confirmDelete') : t('common.delete')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && !showForm && (
        <div className="empty">
          <div className="empty-mark"><Icon name="goal" size={30} /></div>
          <h2 className="h2">{t('goal.emptyTitle')}</h2>
          <button className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} onClick={() => setShowForm(true)}>
            <Icon name="plus" size={18} />
            {t('goal.add')}
          </button>
        </div>
      )}

      {goals.length > 0 && <div className="note">{t('goal.note')}</div>}
    </>
  );
}
