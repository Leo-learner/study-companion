import React from 'react';
import { TaskItem } from '../types';
import { useI18n } from '../i18n/I18nProvider';
import Icon from './Icon';

interface Props {
  task: TaskItem;
  closed: boolean;
  primary?: boolean;
  onToggle: (task: TaskItem) => void;
  onAmount: (taskId: string, amount: number) => void;
  onUpdate: (taskId: string, updates: Partial<TaskItem>) => void;
}

export default function StudyTask({ task, closed, primary = false, onToggle, onAmount, onUpdate }: Props) {
  const { t, resolveMessage } = useI18n();
  const title = taskDisplayTitle(task, resolveMessage(task.titleMessage, task.title));
  const completed = task.status === 'completed';
  const skipped = task.status === 'skipped';
  return <article className={`study-task ${primary ? 'study-task-primary' : 'study-task-secondary'} is-${task.status}`} aria-label={title}>
    {primary && <header className="study-task-band"><span>{t('ui.minimum')}</span></header>}
    <div className="study-task-body">
      <h2 className="study-task-title">{title}</h2>
      <div className="study-task-controls">
        <label className="study-task-checkbox">
          <input type="checkbox" checked={completed} onChange={() => onToggle(task)} disabled={closed} aria-label={t('ui.taskComplete', {title})}/>
          {completed && <Icon name="check"/>}
        </label>
        {!skipped && task.targetAmount > 0 && <label className="study-task-amount">
          <input type="number" min={0} max={task.targetAmount} value={task.completionAmount} onChange={event => onAmount(task.id, Number(event.target.value))} disabled={closed} aria-label={t('ui.taskAmount', {title})}/>
          <span>/ {task.targetAmount} {task.unitName}</span>
        </label>}
        {skipped && <span className="task-state" role="status">{t('ui.skipped')}</span>}
      </div>
      <div className="study-task-actions">
        <button className="btn task-complete" type="button" disabled={closed} onClick={() => onToggle(task)}><Icon name="check"/>{completed ? t('ui.undoComplete') : t('ui.markComplete')}</button>
        {!closed && <button className="task-skip" type="button" onClick={() => onUpdate(task.id, {status: skipped ? 'notStarted' : 'skipped', completionAmount: 0})}>{skipped ? t('ui.restore') : t('today.skip')}</button>}
      </div>
    </div>
  </article>;
}

// Only display a combined quantity when all tasks share a unit.
export function taskGroupQuantity(tasks: TaskItem[]): { amount: number; unit: string } | null {
  if (!tasks.length || tasks.some(task => task.unitName !== tasks[0].unitName)) return null;
  return { amount: tasks.reduce((sum, task) => sum + task.targetAmount, 0), unit: tasks[0].unitName };
}

// Generated level/action prefixes already appear in the surrounding UI. User-written titles stay intact.
export function taskDisplayTitle(task: TaskItem, fallback: string): string {
  const name = task.titleMessage?.key === 'plan.taskTitle' ? task.titleMessage.values?.goalName : undefined;
  return typeof name === 'string' && name.trim() ? name : fallback;
}
