import { describe, expect, it } from 'vitest';
import { generateDailyPlan } from '../src/planner';
import {
  calculateExpectedProgress,
  calculateTodayCompletion,
  getStreakDays,
  isMinimumCompleted,
} from '../src/progress';
import { DailyPlan, StudyCycle, StudyGoal, TaskItem, localDateStr } from '../src/types';

const cycle: StudyCycle = {
  id: 'cycle-1',
  name: '测试周期',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  status: 'active',
  dayRule: { type: 'weekday' },
  healthGateEnabled: false,
  healthGateText: '',
  launchPhrase: '开始学习',
  maxMainGoalsPerDay: 1,
  hideRawAmountsInFeedback: true,
  createdAt: '',
  updatedAt: '',
};

const goal: StudyGoal = {
  id: 'goal-1',
  cycleId: cycle.id,
  name: '测试目标',
  category: 'reading',
  unitName: '页',
  totalAmount: 100,
  completedAmount: 0,
  priority: 'medium',
  difficulty: 'normal',
  isActive: true,
  minimumTaskHint: '',
  recommendedTaskHint: '',
  optionalTaskHint: '',
  notes: '',
  createdAt: '',
  updatedAt: '',
};

function task(level: TaskItem['level'], status: TaskItem['status']): TaskItem {
  return {
    id: `${level}-${status}`,
    goalId: goal.id,
    title: '测试任务',
    level,
    type: 'read',
    targetAmount: 10,
    unitName: '页',
    completionAmount: status === 'completed' ? 10 : 0,
    status,
    description: '',
    notes: '',
  };
}

function plan(date: string, status: DailyPlan['status'], tasks: TaskItem[] = []): DailyPlan {
  return {
    id: date,
    cycleId: cycle.id,
    date,
    dayIndex: 1,
    mode: 'normal',
    healthGateStatus: 'notRequired',
    mainGoalIds: [],
    tasks,
    status,
    generatedReason: '',
    userState: '',
    notes: '',
    blockers: '',
    createdAt: '',
    closedAt: '',
  };
}

describe('date-only calculations', () => {
  it('formats a local calendar date without converting it to UTC', () => {
    expect(localDateStr(new Date(2026, 5, 20, 1, 30))).toBe('2026-06-20');
  });

  it('counts weekday progress without timezone drift', () => {
    expect(calculateExpectedProgress(cycle, '2026-06-02')).toBe(40);
  });
});

describe('progress calculations', () => {
  it('returns 100% for a completed recommended-only plan', () => {
    expect(calculateTodayCompletion(plan('2026-06-20', 'active', [task('recommended', 'completed')]))).toBe(100);
  });

  it('does not count a skipped minimum task as completed', () => {
    expect(isMinimumCompleted(plan('2026-06-20', 'active', [task('minimum', 'skipped')]))).toBe(false);
  });

  it('counts consecutive closed days through today', () => {
    const plans = [
      plan('2026-06-18', 'closed'),
      plan('2026-06-19', 'closed'),
      plan('2026-06-20', 'closed'),
    ];
    expect(getStreakDays(plans, '2026-06-20')).toBe(3);
  });

  it('starts the streak from yesterday when today is still open', () => {
    const plans = [plan('2026-06-18', 'closed'), plan('2026-06-19', 'closed')];
    expect(getStreakDays(plans, '2026-06-20')).toBe(2);
  });
});

describe('daily plan generation', () => {
  it('creates an active plan that can enter the close-out flow', () => {
    const result = generateDailyPlan(cycle, [goal], '2026-06-01', [], [], [], true);
    expect(result.status).toBe('active');
    expect(result.healthGateStatus).toBe('notRequired');
    expect(result.tasks.length).toBeGreaterThan(0);
  });
});
