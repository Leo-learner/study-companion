import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { TaskItem } from '../types';
import StudyTask, { taskDisplayTitle, taskGroupQuantity } from './StudyTask';

const task: TaskItem = {
  id: 'task', goalId: 'goal', title: '自定义练习', level: 'minimum', type: 'practice',
  targetAmount: 3, unitName: '道', completionAmount: 0, status: 'notStarted', description: '', notes: '',
};
function render(updates: Partial<TaskItem> = {}, closed = false, language = 'zh') {
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ settings: { language } }) });
  return renderToStaticMarkup(<I18nProvider><StudyTask task={{ ...task, ...updates }} primary closed={closed} onToggle={() => {}} onAmount={() => {}} onUpdate={() => {}}/></I18nProvider>);
}
afterEach(() => vi.unstubAllGlobals());

describe('selected task presentation', () => {
  it('keeps custom task titles intact', () => expect(taskDisplayTitle(task, task.title)).toBe(task.title));
  it('shortens only generated titles', () => expect(taskDisplayTitle({ ...task, titleMessage: { key: 'plan.taskTitle', values: { goalName: '高等数学' } } }, 'fallback')).toBe('高等数学'));
  it('preserves the fallback for missing metadata', () => expect(taskDisplayTitle({ ...task, titleMessage: { key: 'plan.taskTitle', values: {} } }, 'fallback')).toBe('fallback'));
  it('sums only compatible units', () => {
    expect(taskGroupQuantity([task, { ...task, targetAmount: 8 }])).toEqual({ amount: 11, unit: '道' });
    expect(taskGroupQuantity([task, { ...task, unitName: '页' }])).toBeNull();
    expect(taskGroupQuantity([])).toBeNull();
  });
  it('has accessible amount and completion controls', () => {
    const html = render();
    expect(html).toContain('aria-label="完成量：自定义练习"');
    expect(html).toContain('aria-label="完成：自定义练习"');
    expect(html).toContain('标记完成');
    expect(html).toContain('max="3"');
  });
  it('shows completed and partial state without changing the target', () => {
    expect(render({ status: 'completed', completionAmount: 3 })).toContain('撤销完成');
    expect(render({ status: 'partial', completionAmount: 1 })).toContain('value="1"');
  });
  it('provides restoration for skipped tasks', () => {
    const html = render({ status: 'skipped' });
    expect(html).toContain('已跳过');
    expect(html).toContain('恢复');
    expect(html).not.toContain('type="number"');
  });
  it('locks closed plans and removes skip actions', () => {
    const html = render({ status: 'completed', completionAmount: 3 }, true);
    expect((html.match(/disabled=""/g) || []).length).toBe(3);
    expect(html).not.toContain('class="task-skip"');
  });
  it('renders translated primary actions', () => expect(render({}, false, 'en')).toContain('Mark complete'));
});
