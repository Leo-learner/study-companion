import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveCycle, saveCycle, archiveCycle } from '../storage';
import { StudyCycle, DayRule, DayRuleType, generateId, todayStr, DEFAULT_LAUNCH_PHRASE } from '../types';

interface Props {
  onCreated?: () => void;
  editMode?: boolean;
}

export default function CycleSetup({ onCreated, editMode }: Props) {
  const existing = getActiveCycle();
  const navigate = useNavigate();

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
  const [healthGateText, setHealthGateText] = useState(existing?.healthGateText || '完成户外活动 / 运动 / 睡眠恢复');
  const [launchPhrase, setLaunchPhrase] = useState(existing?.launchPhrase || DEFAULT_LAUNCH_PHRASE);
  const [maxMainGoalsPerDay, setMaxMainGoalsPerDay] = useState(existing?.maxMainGoalsPerDay || 1);
  const [hideAmounts, setHideAmounts] = useState(existing?.hideRawAmountsInFeedback ?? true);

  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];

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
      launchPhrase: launchPhrase.trim() || DEFAULT_LAUNCH_PHRASE,
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
    if (existing && confirm('确定要归档当前学习周期吗？归档后可以创建新周期。')) {
      archiveCycle(existing.id);
      navigate('/');
    }
  };

  return (
    <div>
      <h1 className="page-title">{editMode ? '⚙️ 编辑学习周期' : '✨ 创建学习周期'}</h1>
      <p className="page-subtitle">设置你的学习周期规则，系统将据此生成每日任务。</p>

      <div className="card">
        <div className="form-group">
          <label className="form-label">学习周期名称</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：春季备考周期、编程学习计划"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">开始日期</label>
            <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">结束日期</label>
            <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">学习日规则</label>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <label className="form-checkbox">
              <input type="radio" name="dayRule" checked={dayRuleType === 'weekday'} onChange={() => setDayRuleType('weekday')} />
              周一至周五学习，周末休息
            </label>
            <label className="form-checkbox">
              <input type="radio" name="dayRule" checked={dayRuleType === 'cycle'} onChange={() => setDayRuleType('cycle')} />
              学习 N 天休 M 天
            </label>
            <label className="form-checkbox">
              <input type="radio" name="dayRule" checked={dayRuleType === 'customWeek'} onChange={() => setDayRuleType('customWeek')} />
              自定义每周学习日
            </label>
          </div>

          {dayRuleType === 'cycle' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">学习天数</label>
                <input className="form-input" type="number" min={1} max={30} value={studyDays} onChange={(e) => setStudyDays(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">休息天数</label>
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
                  周{weekdayLabels[d]}
                </button>
              ))}
            </div>
          )}
        </div>

        <hr className="divider" />

        <div className="form-group">
          <label className="form-checkbox">
            <input type="checkbox" checked={healthGateEnabled} onChange={(e) => setHealthGateEnabled(e.target.checked)} />
            <span>开启健康前置</span>
          </label>
          <p className="form-hint">开启后，每天需要先完成健康例行才能启动学习计划。</p>
        </div>

        {healthGateEnabled && (
          <div className="form-group">
            <label className="form-label">健康前置说明</label>
            <input
              className="form-input"
              value={healthGateText}
              onChange={(e) => setHealthGateText(e.target.value)}
              placeholder="完成户外活动 / 运动 / 睡眠恢复 / 休息检查"
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">启动暗号</label>
          <input
            className="form-input"
            value={launchPhrase}
            onChange={(e) => setLaunchPhrase(e.target.value)}
            placeholder={DEFAULT_LAUNCH_PHRASE}
          />
          <p className="form-hint">每天输入暗号后才能生成当日学习计划。</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">每日最多几个主线目标</label>
            <input
              className="form-input"
              type="number"
              min={1}
              max={5}
              value={maxMainGoalsPerDay}
              onChange={(e) => setMaxMainGoalsPerDay(Number(e.target.value))}
            />
            <p className="form-hint">默认 1 个，避免多线并行导致内耗。</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input type="checkbox" checked={hideAmounts} onChange={(e) => setHideAmounts(e.target.checked)} />
            <span>打卡反馈中隐藏具体数量（只显示百分比）</span>
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={!name.trim()}>
          {editMode ? '💾 保存修改' : '✅ 创建学习周期'}
        </button>
        {!onCreated && (
          <button className="btn btn-secondary btn-lg" onClick={() => navigate('/')}>取消</button>
        )}
        {existing && (
          <button className="btn btn-danger btn-lg" onClick={handleArchive} style={{ marginLeft: 'auto' }}>
            📦 归档当前周期
          </button>
        )}
      </div>
    </div>
  );
}
