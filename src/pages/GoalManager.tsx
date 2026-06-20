import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, saveGoal, deleteGoal } from '../storage';
import { calculateGoalProgress } from '../progress';
import {
  StudyGoal,
  GoalCategory,
  GOAL_CATEGORY_LABELS,
  Priority,
  Difficulty,
  generateId,
} from '../types';

const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: '简单', normal: '中等', hard: '困难' };
const PRIORITY_LABELS: Record<Priority, string> = { high: '高', medium: '中', low: '低' };

export default function GoalManager() {
  const cycle = getActiveCycle();
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudyGoal | null>(null);
  const navigate = useNavigate();

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
    if (cycle) setGoals(getGoals(cycle.id));
  }, [cycle]);

  if (!cycle) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📚</div>
        <div className="empty-state-title">请先创建学习周期</div>
        <button className="btn btn-primary" onClick={() => navigate('/')}>返回首页</button>
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
      unitName: unitName.trim() || '个',
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
    if (confirm('确定要删除这个目标吗？')) {
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
  const unitSuggestions: Record<GoalCategory, string[]> = {
    course: ['节', '章', '课', '分钟', '小时'],
    problems: ['题', '套', '页', '道'],
    memory: ['个', '词', '条', '页'],
    reading: ['页', '章', '本', '篇'],
    project: ['阶段', '功能', '模块', '个'],
    custom: ['个', '次', '分钟', '项'],
  };

  return (
    <div>
      <h1 className="page-title">🎯 学习目标管理</h1>
      <p className="page-subtitle">管理你在当前学习周期中的所有目标。</p>

      {goals.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <div className="empty-state-title">还没有学习目标</div>
          <div className="empty-state-desc">添加你的第一个学习目标，系统会根据目标生成每日任务。</div>
        </div>
      )}

      {!showForm && (
        <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginBottom: '16px' }}>
          ＋ 添加学习目标
        </button>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-title">{editingGoal ? '✏️ 编辑目标' : '✨ 新增目标'}</div>
          <div className="card-body" style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label className="form-label">目标名称</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：数据结构课程" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">目标类型</label>
                <select className="form-select" value={category} onChange={(e) => { setCategory(e.target.value as GoalCategory); setUnitName(''); }}>
                  {(Object.keys(GOAL_CATEGORY_LABELS) as GoalCategory[]).map((k) => (
                    <option key={k} value={k}>{GOAL_CATEGORY_LABELS[k]}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">单位</label>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <input
                    className="form-input"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="例如：章、题、页"
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
                <label className="form-label">总量 ({unitName || '单位'})</label>
                <input className="form-input" type="number" min={1} value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">已完成 ({unitName || '单位'})</label>
                <input className="form-input" type="number" min={0} max={totalAmount} value={completedAmount} onChange={(e) => setCompletedAmount(Number(e.target.value))} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">优先级</label>
                <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">难度</label>
                <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                  <option value="easy">简单</option>
                  <option value="normal">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">保底任务建议</label>
              <input className="form-input" value={minHint} onChange={(e) => setMinHint(e.target.value)} placeholder="每天最少做什么？（留空则由系统自动生成）" />
            </div>
            <div className="form-group">
              <label className="form-label">推荐任务建议</label>
              <input className="form-input" value={recHint} onChange={(e) => setRecHint(e.target.value)} placeholder="正常状态下推荐做什么？" />
            </div>
            <div className="form-group">
              <label className="form-label">可选任务建议</label>
              <input className="form-input" value={optHint} onChange={(e) => setOptHint(e.target.value)} placeholder="状态好时额外做什么？" />
            </div>

            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="自由备注..." />
            </div>

            <div className="form-group">
              <label className="form-checkbox">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                激活此目标
              </label>
            </div>
          </div>
          <div className="card-footer">
            <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>💾 保存</button>
            <button className="btn btn-secondary" onClick={resetForm}>取消</button>
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
                      {goal.isActive ? '激活' : '停用'}
                    </span>
                  </div>
                  <div className="card-subtitle">
                    {GOAL_CATEGORY_LABELS[goal.category]} · {DIFFICULTY_LABELS[goal.difficulty]} · 优先级{PRIORITY_LABELS[goal.priority]}
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
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(goal)}>✏️ 编辑</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(goal)}>
                  {goal.isActive ? '⏸ 停用' : '▶️ 启用'}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>完成量：</span>
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
