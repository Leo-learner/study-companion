import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, getGoals, getPlans, getCheckIns, getOverrides, savePlan } from '../storage';
import { generateDailyPlan } from '../planner';
import { isStudyDay, getDayIndex, calculateCycleProgress, countRecentLowCompletion, countUnclosedDays } from '../progress';
import { StudyCycle, StudyGoal, DailyPlan, CheckIn, DayOverride, todayStr } from '../types';
import CycleSetup from './CycleSetup';

export default function Dashboard() {
  const [cycle, setCycle] = useState<StudyCycle | null>(null);
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [todayPlan, setTodayPlan] = useState<DailyPlan | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckIn[]>([]);
  const [allPlans, setAllPlans] = useState<DailyPlan[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [healthPassed, setHealthPassed] = useState(false);
  const [healthException, setHealthException] = useState(false);
  const [phraseInput, setPhraseInput] = useState('');
  const [phraseError, setPhraseError] = useState('');
  const [showCycleSetup, setShowCycleSetup] = useState(false);
  const navigate = useNavigate();

  const today = todayStr();

  const refresh = useCallback(() => {
    const c = getActiveCycle();
    setCycle(c || null);
    if (c) {
      setGoals(getGoals(c.id));
      setAllPlans(getPlans(c.id));
      setOverrides(getOverrides(c.id));
      const plan = getPlans(c.id).find((p) => p.date === today) || null;
      setTodayPlan(plan);
      setHealthPassed(plan?.healthGateStatus === 'passed' || plan?.healthGateStatus === 'exception');
      setHealthException(plan?.healthGateStatus === 'exception');
      setRecentCheckIns(getCheckIns(c.id));
    }
  }, [today]);

  useEffect(() => { refresh(); }, [refresh]);

  // --- 没有学习周期：显示创建向导 ---
  if (!cycle) {
    if (showCycleSetup) {
      return <CycleSetup onCreated={() => { setShowCycleSetup(false); refresh(); }} />;
    }
    return (
      <div>
        <div className="welcome-hero">
          <h1>📚 学习系统陪跑器</h1>
          <p>
            这是一个通用学习系统，不是高压打卡器。<br />
            它会帮助你把长期目标拆成每天可以承受的任务，<br />
            并允许你根据状态滚动调整。
          </p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setShowCycleSetup(true)}>
              ✨ 创建学习周期
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/settings')}>
              📥 导入已有数据
            </button>
          </div>
        </div>
        <div className="card">
          <div className="card-body" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            <strong>💡 使用说明</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>创建一个学习周期，设定开始和结束日期。</li>
              <li>添加学习目标（课程、刷题、背诵、阅读等）。</li>
              <li>每天输入启动暗号，系统根据你的进度生成当日任务。</li>
              <li>每天最多一个主线目标，避免多线并行内耗。</li>
              <li>完成保底任务就算今天没有断线。</li>
              <li>未完成的任务不会累加到第二天，不制造欠债雪球。</li>
              <li>状态不好时系统会自动降强度。</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // --- 有学习周期 ---
  const activeGoals = goals.filter((g) => g.isActive);
  const cycleProgress = calculateCycleProgress(activeGoals);
  const isTodayStudyDay = isStudyDay(cycle, today);
  const dayIdx = getDayIndex(cycle, today);
  const todayOverride = overrides.find((o) => o.date === today);
  const isClosed = todayPlan?.status === 'closed';
  const healthGateEnabled = cycle.healthGateEnabled;
  const healthRequired = healthGateEnabled && !healthPassed;

  // 最近统计
  const recentLowDays = countRecentLowCompletion(recentCheckIns);
  const unclosedDays = countUnclosedDays(allPlans, today);

  // --- 健康前置 ---
  const handleHealthPass = () => {
    setHealthPassed(true);
  };

  // --- 申请当日特例 ---
  const handleDayException = () => {
    setHealthException(true);
    setHealthPassed(true);
    if (todayPlan) {
      const updated = { ...todayPlan, healthGateStatus: 'exception' as const };
      savePlan(updated);
      setTodayPlan(updated);
    }
  };

  // --- 输入暗号 ---
  const handlePhraseSubmit = () => {
    const phrase = cycle.launchPhrase || '开始学习';
    if (phraseInput.trim() !== phrase) {
      setPhraseError('暗号不正确，请重试。');
      return;
    }
    setPhraseError('');

    // 检查是否今天已有计划
    const existing = allPlans.find((p) => p.date === today);
    if (existing) {
      const resumed = existing.status === 'notStarted'
        ? { ...existing, status: 'active' as const }
        : existing;
      if (resumed !== existing) savePlan(resumed);
      setTodayPlan(resumed);
      navigate('/today');
      return;
    }

    // 生成计划
    const generated = generateDailyPlan(cycle, goals, today, allPlans, recentCheckIns, overrides, healthPassed || !healthGateEnabled);
    const plan = healthException
      ? { ...generated, healthGateStatus: 'exception' as const }
      : generated;
    savePlan(plan);
    setTodayPlan(plan);
    setAllPlans((prev) => [...prev, plan]);
    navigate('/today');
  };

  // --- 渲染今日状态 ---
  const renderTodayStatus = () => {
    if (isClosed) {
      return (
        <div className="alert alert-success">
          ✅ 今天已收工。好好休息，明天继续。<br />
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '8px' }} onClick={() => navigate('/today')}>
            查看今日反馈
          </button>
        </div>
      );
    }

    if (todayOverride) {
      const labels: Record<string, string> = {
        rest: '休息日', holiday: '放假日', exam: '考试日', blocked: '客观阻断日',
      };
      return (
        <div className="alert alert-info">
          📌 今天已标记为{labels[todayOverride.mode] || '特殊日'}：{todayOverride.reason}
        </div>
      );
    }

    if (!isTodayStudyDay) {
      return (
        <div className="alert alert-info">
          🌿 今天是休息日。好好恢复，可以回顾一下学习内容。<br />
          如果想标记今天为特殊日，请前往设置页。
        </div>
      );
    }

    if (healthRequired) {
      return (
        <div className="card">
          <div className="card-title">🏃 健康前置</div>
          <div className="card-body" style={{ marginTop: '8px' }}>
            <p>{cycle.healthGateText || '请完成户外活动 / 运动 / 睡眠恢复等健康例行。'}</p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-success" onClick={handleHealthPass}>✅ 我已完成</button>
              <button className="btn btn-secondary" onClick={handleDayException}>🔓 今日特例放行</button>
            </div>
          </div>
        </div>
      );
    }

    if (todayPlan && todayPlan.status !== 'notStarted') {
      return (
        <div className="alert alert-success">
          📋 今日计划已生成。
          <button className="btn btn-primary btn-sm" style={{ marginLeft: '8px' }} onClick={() => navigate('/today')}>
            进入今日任务
          </button>
        </div>
      );
    }

    // 等待输入暗号
    return (
      <div className="card">
        <div className="card-title">🔑 输入启动暗号</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            输入暗号以生成今日学习计划
          </p>
          <div className="phrase-input-wrap">
            <input
              className="form-input"
              type="text"
              placeholder="输入暗号..."
              value={phraseInput}
              onChange={(e) => { setPhraseInput(e.target.value); setPhraseError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePhraseSubmit()}
            />
            <button className="btn btn-primary" onClick={handlePhraseSubmit}>启动</button>
          </div>
          {phraseError && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '8px' }}>{phraseError}</p>}
        </div>
      </div>
    );
  };

  // --- 节奏概览 ---
  const renderRhythmOverview = () => {
    const recent7 = recentCheckIns.filter((c) => {
      const d = new Date(c.date);
      const t = new Date(today);
      const diff = Math.floor((t.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff < 7;
    });

    return (
      <div className="card">
        <div className="card-title">📊 最近 7 天节奏</div>
        <div className="card-body" style={{ marginTop: '8px' }}>
          {recent7.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>暂无数据</p>
          ) : (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {recent7.map((ci) => {
                const rhythmColors: Record<string, string> = {
                  ahead: 'var(--color-success)',
                  stable: 'var(--color-primary)',
                  slightlyBehind: 'var(--color-warning)',
                  behind: '#d4a04a',
                  slipping: 'var(--color-danger)',
                };
                return (
                  <div
                    key={ci.id}
                    title={`${ci.date}: ${ci.todayCompletionPercent}% - ${ci.rhythmStatus}`}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      background: rhythmColors[ci.rhythmStatus] || '#ccc',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {ci.todayCompletionPercent}%
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- 警告 ---
  const renderWarnings = () => {
    const warnings: string[] = [];
    if (recentLowDays >= 2) {
      warnings.push('最近完成率偏低，系统已自动降强度。今天完成保底任务就算成功。');
    }
    if (unclosedDays >= 3) {
      warnings.push('你已经连续多天未收工。建议今天收工一次，帮助系统校准节奏。');
    }
    if (activeGoals.length > 5) {
      warnings.push('当前激活目标较多（' + activeGoals.length + ' 个），考虑停用部分低优先级目标。');
    }

    if (warnings.length === 0) return null;
    return (
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        {warnings.map((w, i) => (
          <div key={i} className="alert alert-warning">{w}</div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <h1 className="page-title">📚 {cycle.name}</h1>
      <p className="page-subtitle">
        {today} · 第 {dayIdx} 天 · {isTodayStudyDay ? '📖 学习日' : '🌿 休息日'} · 周期进度 {cycleProgress}%
      </p>

      {renderWarnings()}
      {renderTodayStatus()}

      <div className="grid-2">
        <div className="card stat-card">
          <div className="stat-value">{cycleProgress}%</div>
          <div className="stat-label">周期总进度</div>
          <div className="progress-bar" style={{ marginTop: '8px' }}>
            <div className="progress-bar-fill progress-fill-primary" style={{ width: `${cycleProgress}%` }} />
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{activeGoals.length}</div>
          <div className="stat-label">激活目标数</div>
        </div>
      </div>

      {renderRhythmOverview()}

      <div style={{ marginTop: 'var(--spacing-lg)' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/settings')}>
          标记今天为特殊日
        </button>
      </div>
    </div>
  );
}
