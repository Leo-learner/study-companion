// ============================================================
// 每日计划生成逻辑
// ============================================================
import {
  StudyCycle,
  StudyGoal,
  DailyPlan,
  CheckIn,
  DayOverride,
  TaskItem,
  PlanMode,
  PlanStatus,
  HealthGateStatus,
  GoalCategory,
  generateId,
} from './types';
import { isStudyDay, getDayIndex, calculateGoalProgress, countRecentLowCompletion } from './progress';
import type { LocalizedMessage, TranslationKey } from './i18n/messages';

function getHealthGateStatus(cycle: StudyCycle, healthGatePassed: boolean): HealthGateStatus {
  if (!cycle.healthGateEnabled) return 'notRequired';
  return healthGatePassed ? 'passed' : 'pending';
}

// --- 主线目标排序分数 ---
function goalPickScore(goal: StudyGoal, wasMainYesterday: boolean, yesterdayCompletionLow: boolean): number {
  const progress = calculateGoalProgress(goal);
  let score = 0;

  // 优先落后于标准进度的目标（进度越低分越高）
  score += (100 - progress) * 0.5;

  // 优先级加成
  if (goal.priority === 'high') score += 30;
  else if (goal.priority === 'medium') score += 15;

  // 容易启动的目标优先
  if (goal.difficulty === 'easy') score += 10;
  else if (goal.difficulty === 'hard') score -= 5;

  // 如果昨天是主线但完成很差，适当降权，避免连续受挫
  if (wasMainYesterday && yesterdayCompletionLow) {
    score -= 15;
  }

  return score;
}

// --- 生成任务标题 ---
function generateTaskTitle(
  goal: StudyGoal,
  level: 'minimum' | 'recommended' | 'optional',
  type: string
): string {
  const hint =
    level === 'minimum'
      ? goal.minimumTaskHint
      : level === 'recommended'
        ? goal.recommendedTaskHint
        : goal.optionalTaskHint;

  if (hint && hint.trim()) return hint.trim();

  // 没有自定义提示时生成默认标题
  const categoryMap: Record<string, string> = {
    course: '学习',
    problems: '练习',
    memory: '背诵',
    reading: '阅读',
    project: '开发',
    custom: '完成',
  };
  const action = categoryMap[goal.category] || '推进';
  const levelLabel = level === 'minimum' ? '保底' : level === 'recommended' ? '推荐' : '可选';
  return `[${levelLabel}] ${action} ${goal.name}`;
}

const taskActionKeys: Record<GoalCategory, TranslationKey> = {
  course: 'plan.action.course',
  problems: 'plan.action.problems',
  memory: 'plan.action.memory',
  reading: 'plan.action.reading',
  project: 'plan.action.project',
  custom: 'plan.action.custom',
};

const taskLevelKeys: Record<'minimum' | 'recommended' | 'optional', TranslationKey> = {
  minimum: 'plan.level.minimum',
  recommended: 'plan.level.recommended',
  optional: 'plan.level.optional',
};

// --- 生成保底任务目标量 ---
function getMinimumAmount(goal: StudyGoal): number {
  // 保底任务量 = 总量的 2-5%，最少1个单位
  const pct = goal.difficulty === 'hard' ? 0.02 : goal.difficulty === 'easy' ? 0.05 : 0.03;
  const amount = Math.max(1, Math.round(goal.totalAmount * pct));
  return Math.min(amount, goal.totalAmount - goal.completedAmount);
}

// --- 生成推荐任务目标量 ---
function getRecommendedAmount(goal: StudyGoal): number {
  // 推荐任务量 = 总量的 5-15%
  const pct = goal.difficulty === 'hard' ? 0.05 : goal.difficulty === 'easy' ? 0.15 : 0.08;
  const amount = Math.max(2, Math.round(goal.totalAmount * pct));
  return Math.min(amount, goal.totalAmount - goal.completedAmount);
}

// --- 生成可选任务目标量 ---
function getOptionalAmount(goal: StudyGoal): number {
  const pct = goal.difficulty === 'hard' ? 0.08 : goal.difficulty === 'easy' ? 0.20 : 0.12;
  const amount = Math.max(3, Math.round(goal.totalAmount * pct));
  return Math.min(amount, goal.totalAmount - goal.completedAmount);
}

// --- 根据目标类型映射任务类型 ---
function mapGoalCategoryToTaskType(cat: GoalCategory): TaskItem['type'] {
  const map: Record<GoalCategory, TaskItem['type']> = {
    course: 'learn',
    problems: 'practice',
    memory: 'memorize',
    reading: 'read',
    project: 'develop',
    custom: 'custom',
  };
  return map[cat];
}

// --- 创建单个任务 ---
function createTask(
  goal: StudyGoal,
  level: 'minimum' | 'recommended' | 'optional'
): TaskItem {
  const type = mapGoalCategoryToTaskType(goal.category);
  const hint =
    level === 'minimum'
      ? goal.minimumTaskHint
      : level === 'recommended'
        ? goal.recommendedTaskHint
        : goal.optionalTaskHint;
  const amount =
    level === 'minimum'
      ? getMinimumAmount(goal)
      : level === 'recommended'
        ? getRecommendedAmount(goal)
        : getOptionalAmount(goal);

  return {
    id: generateId(),
    goalId: goal.id,
    title: generateTaskTitle(goal, level, type),
    titleMessage: hint.trim()
      ? undefined
      : {
          key: 'plan.taskTitle',
          values: {
            level: { key: taskLevelKeys[level] },
            action: { key: taskActionKeys[goal.category] },
            goalName: goal.name,
          },
        },
    level,
    type,
    targetAmount: amount,
    unitName: goal.unitName,
    completionAmount: 0,
    status: 'notStarted',
    description: level === 'optional' ? '（可不做）状态好时再完成' : '',
    descriptionMessage: level === 'optional' ? { key: 'plan.optionalDescription' } : undefined,
    notes: '',
  };
}

// --- 主生成函数 ---
export function generateDailyPlan(
  cycle: StudyCycle,
  goals: StudyGoal[],
  date: string,
  historyPlans: DailyPlan[],
  historyCheckIns: CheckIn[],
  overrides: DayOverride[],
  healthGatePassed: boolean,
  userStateHint?: 'good' | 'normal' | 'tired' | 'bad'
): DailyPlan {
  const activeGoals = goals.filter((g) => g.isActive && g.cycleId === cycle.id);

  // 1. 没有激活目标
  if (activeGoals.length === 0) {
    return {
      id: generateId(),
      cycleId: cycle.id,
      date,
      dayIndex: getDayIndex(cycle, date),
      mode: 'normal',
      healthGateStatus: getHealthGateStatus(cycle, healthGatePassed),
      mainGoalIds: [],
      tasks: [],
      status: 'active',
      generatedReason: '没有激活的学习目标，请先创建一个学习目标。',
      generatedReasonMessage: { key: 'plan.noActiveGoals' },
      userState: '',
      notes: '',
      blockers: '',
      createdAt: new Date().toISOString(),
      closedAt: '',
    };
  }

  // 2. 检查日期覆盖
  const override = overrides.find((o) => o.cycleId === cycle.id && o.date === date);
  if (override) {
    return createOverridePlan(cycle, date, override.mode, override.reason, healthGatePassed);
  }

  // 3. 检查是否是休息日（非学习日）
  if (!isStudyDay(cycle, date)) {
    return createRestPlan(
      cycle,
      date,
      'rest',
      '今天是休息日，好好恢复。',
      { key: 'plan.restReason' },
      healthGatePassed,
    );
  }

  // 4. 健康前置检查
  if (cycle.healthGateEnabled && !healthGatePassed) {
    return {
      id: generateId(),
      cycleId: cycle.id,
      date,
      dayIndex: getDayIndex(cycle, date),
      mode: 'normal',
      healthGateStatus: 'pending',
      mainGoalIds: [],
      tasks: [],
      status: 'active',
      generatedReason: '健康前置未完成，请先完成健康例行再启动今日计划。',
      generatedReasonMessage: { key: 'plan.healthPending' },
      userState: '',
      notes: '',
      blockers: '',
      createdAt: new Date().toISOString(),
      closedAt: '',
    };
  }

  // 5. 连续低完成检测 → 自动降级为 light 模式
  const recentLowDays = countRecentLowCompletion(historyCheckIns, 40, 5);
  let mode: PlanMode = 'normal';
  if (recentLowDays >= 2) {
    mode = 'light';
  }
  if (userStateHint === 'tired' || userStateHint === 'bad') {
    mode = 'light';
  }

  // 6. 选择主线目标
  const maxMain = cycle.maxMainGoalsPerDay || 1;
  const yesterdayPlan = historyPlans
    .filter((p) => p.cycleId === cycle.id)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const yesterdayMainIds = yesterdayPlan?.mainGoalIds || [];
  const yesterdayCompletion =
    yesterdayPlan && yesterdayPlan.status === 'closed'
      ? historyCheckIns.filter((c) => c.planId === yesterdayPlan.id)[0]?.todayCompletionPercent || 0
      : 0;
  const yesterdayLow = yesterdayCompletion < 40;

  const scored = activeGoals
    .map((g) => ({
      goal: g,
      score: goalPickScore(g, yesterdayMainIds.includes(g.id), yesterdayLow),
    }))
    .sort((a, b) => b.score - a.score);

  const mainGoals = scored.slice(0, maxMain).map((s) => s.goal);

  // 7. 生成任务
  const tasks: TaskItem[] = [];
  for (const goal of mainGoals) {
    // 保底任务总是生成
    tasks.push(createTask(goal, 'minimum'));

    // 轻量模式不生成推荐和可选任务
    if (mode !== 'light') {
      tasks.push(createTask(goal, 'recommended'));
      tasks.push(createTask(goal, 'optional'));
    }
  }

  // 8. 生成原因说明
  let reason = '';
  let reasonMessage: LocalizedMessage;
  if (mode === 'light') {
    reason = '最近完成率偏低，今天自动切换轻量模式，只保留保底任务。';
    reasonMessage = { key: 'plan.lightReason' };
  } else {
    const goalNames = mainGoals.map((g) => g.name).join('、');
    reason = `今日主线目标：${goalNames}。按正常节奏推进。`;
    reasonMessage = { key: 'plan.mainGoalReason', values: { goalNames: mainGoals.map((g) => g.name) } };
  }

  return {
    id: generateId(),
    cycleId: cycle.id,
    date,
    dayIndex: getDayIndex(cycle, date),
    mode,
    healthGateStatus: getHealthGateStatus(cycle, healthGatePassed),
    mainGoalIds: mainGoals.map((g) => g.id),
    tasks,
    status: 'active',
    generatedReason: reason,
    generatedReasonMessage: reasonMessage,
    userState: '',
    notes: '',
    blockers: '',
    createdAt: new Date().toISOString(),
    closedAt: '',
  };
}

// --- 创建休息日计划 ---
function createRestPlan(
  cycle: StudyCycle,
  date: string,
  mode: PlanMode,
  reason: string,
  reasonMessage: LocalizedMessage,
  healthGatePassed: boolean
): DailyPlan {
  return {
    id: generateId(),
    cycleId: cycle.id,
    date,
    dayIndex: getDayIndex(cycle, date),
    mode,
    healthGateStatus: getHealthGateStatus(cycle, healthGatePassed),
    mainGoalIds: [],
    tasks: [
      {
        id: generateId(),
        goalId: '',
        title: '今天是休息日，可以回顾一下学习内容，或做一些轻松的复习。',
        titleMessage: { key: 'plan.restTaskTitle' },
        level: 'optional',
        type: 'review',
        targetAmount: 0,
        unitName: '',
        completionAmount: 0,
        status: 'notStarted',
        description: '休息日不强制学习，好好恢复。',
        descriptionMessage: { key: 'plan.restTaskDescription' },
        notes: '',
      },
    ],
    status: 'active',
    generatedReason: reason,
    generatedReasonMessage: reasonMessage,
    userState: '',
    notes: '',
    blockers: '',
    createdAt: new Date().toISOString(),
    closedAt: '',
  };
}

// --- 创建覆盖日计划 ---
function createOverridePlan(
  cycle: StudyCycle,
  date: string,
  mode: DayOverride['mode'],
  reason: string,
  healthGatePassed: boolean
): DailyPlan {
  const modeLabels: Record<string, string> = {
    rest: '休息日',
    holiday: '放假日',
    exam: '考试日',
    blocked: '客观阻断日',
  };
  const modeMessageKeys: Record<DayOverride['mode'], TranslationKey> = {
    rest: 'plan.mode.rest',
    holiday: 'plan.mode.holiday',
    exam: 'plan.mode.exam',
    blocked: 'plan.mode.blocked',
  };
  const modeValue = { key: modeMessageKeys[mode] };
  return {
    id: generateId(),
    cycleId: cycle.id,
    date,
    dayIndex: getDayIndex(cycle, date),
    mode,
    healthGateStatus: getHealthGateStatus(cycle, healthGatePassed),
    mainGoalIds: [],
    tasks: [
      {
        id: generateId(),
        goalId: '',
        title: `今天是${modeLabels[mode] || '特殊日'}：${reason}`,
        titleMessage: { key: 'plan.specialTitle', values: { mode: modeValue, reason } },
        level: 'optional',
        type: 'review',
        targetAmount: 0,
        unitName: '',
        completionAmount: 0,
        status: 'notStarted',
        description: mode === 'blocked' ? '客观阻断日，只做轻量维护。' : '不生成正常学习任务。',
        descriptionMessage: { key: mode === 'blocked' ? 'plan.blockedDescription' : 'plan.specialDescription' },
        notes: '',
      },
    ],
    status: 'active',
    generatedReason: `${modeLabels[mode] || '特殊标记'}：${reason}`,
    generatedReasonMessage: { key: 'plan.specialReason', values: { mode: modeValue, reason } },
    userState: '',
    notes: '',
    blockers: mode === 'blocked' ? reason : '',
    createdAt: new Date().toISOString(),
    closedAt: '',
  };
}
