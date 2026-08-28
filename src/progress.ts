// ============================================================
// 进度计算逻辑
// ============================================================
import { StudyCycle, StudyGoal, DailyPlan, TaskItem, RhythmStatus, CheckIn, DayOverride } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 计算单个目标的完成百分比
 */
export function calculateGoalProgress(goal: StudyGoal): number {
  if (goal.totalAmount <= 0) return 0;
  const pct = (goal.completedAmount / goal.totalAmount) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

/**
 * 计算周期总进度（所有激活目标的平均完成百分比）
 */
export function calculateCycleProgress(goals: StudyGoal[]): number {
  const activeGoals = goals.filter((g) => g.isActive);
  if (activeGoals.length === 0) return 0;
  const total = activeGoals.reduce((sum, g) => sum + calculateGoalProgress(g), 0);
  return Math.round((total / activeGoals.length) * 10) / 10;
}

/**
 * 判断某一天是否是学习日
 */
export function isStudyDay(cycle: StudyCycle, date: string): boolean {
  const d = parseDateOnly(date);
  const dayOfWeek = d.getUTCDay(); // 0=周日, 1=周一, ..., 6=周六

  const rule = cycle.dayRule;
  switch (rule.type) {
    case 'weekday':
      // 周一至周五学习 (1-5)，周末休息 (0,6)
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'customWeek':
      if (rule.activeWeekdays && rule.activeWeekdays.length > 0) {
        return rule.activeWeekdays.includes(dayOfWeek);
      }
      return true; // 未配置则默认都是学习日
    case 'cycle':
      // 学习 N 天休 M 天
      const studyN = rule.studyDays || 3;
      const restM = rule.restDays || 1;
      const cycleLength = studyN + restM;
      // 从 startDate 开始计算周期位置
      const start = parseDateOnly(cycle.startDate);
      const diffDays = Math.floor((d.getTime() - start.getTime()) / DAY_MS);
      if (diffDays < 0) return false;
      const posInCycle = diffDays % cycleLength;
      return posInCycle < studyN;
    default:
      return true;
  }
}

/**
 * 计算截止到某个日期的期望进度百分比（按已过去的学习日占比）
 */
export function calculateExpectedProgress(cycle: StudyCycle, date: string): number {
  const start = parseDateOnly(cycle.startDate);
  const end = parseDateOnly(cycle.endDate);
  const current = parseDateOnly(date);

  if (current < start) return 0;
  if (current > end) return 100;

  // 统计已过去的总学习日
  let pastStudyDays = 0;
  let totalStudyDays = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const ds = formatDateOnly(cursor);
    if (isStudyDay(cycle, ds)) {
      totalStudyDays++;
      if (cursor <= current) {
        pastStudyDays++;
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  if (totalStudyDays === 0) return 0;
  return Math.round((pastStudyDays / totalStudyDays) * 1000) / 10;
}

/**
 * 获取周期中某一天是第几天（从 1 开始）
 */
export function getDayIndex(cycle: StudyCycle, date: string): number {
  const start = parseDateOnly(cycle.startDate);
  const current = parseDateOnly(date);
  const diff = Math.floor((current.getTime() - start.getTime()) / DAY_MS);
  return diff + 1;
}

/**
 * 计算今日任务完成百分比
 * minimum 权重 40%, recommended 权重 50%, optional 权重 10%
 */
export function calculateTodayCompletion(plan: DailyPlan): number {
  const tasks = plan.tasks;
  if (tasks.length === 0) return 0;

  const minTasks = tasks.filter((t) => t.level === 'minimum');
  const recTasks = tasks.filter((t) => t.level === 'recommended');
  const optTasks = tasks.filter((t) => t.level === 'optional');

  const hasOpt = optTasks.length > 0;
  const wMin = hasOpt ? 0.4 : 0.45;
  const wRec = hasOpt ? 0.5 : 0.55;
  const wOpt = hasOpt ? 0.1 : 0;

  function avgCompletion(ts: TaskItem[]): number {
    if (ts.length === 0) return 0;
    return ts.reduce((sum, t) => {
      if (t.status === 'completed') return sum + 1;
      if (t.status === 'partial' && t.targetAmount > 0) {
        return sum + Math.min(1, t.completionAmount / t.targetAmount);
      }
      return sum;
    }, 0) / ts.length;
  }

  let score = 0;
  if (minTasks.length > 0) score += avgCompletion(minTasks) * wMin;
  if (recTasks.length > 0) score += avgCompletion(recTasks) * wRec;
  if (optTasks.length > 0) score += avgCompletion(optTasks) * wOpt;

  // 重新归一化
  const totalW = (minTasks.length > 0 ? wMin : 0) + (recTasks.length > 0 ? wRec : 0) + (optTasks.length > 0 ? wOpt : 0);
  if (totalW === 0) return 0;
  return Math.round((score / totalW) * 1000) / 10;
}

/**
 * 判断节奏状态
 */
export function detectRhythmStatus(
  cumulativeProgress: number,
  expectedProgress: number,
  recentLowDays: number
): RhythmStatus {
  const diff = cumulativeProgress - expectedProgress;
  if (diff >= 5) return 'ahead';
  if (diff >= -5) return 'stable';
  if (diff >= -12) return 'slightlyBehind';
  if (diff >= -25 && recentLowDays < 3) return 'behind';
  return 'slipping';
}

/**
 * 连续低完成天数判断
 */
export function countRecentLowCompletion(checkIns: CheckIn[], threshold: number = 40, days: number = 5): number {
  const sorted = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const ci of sorted) {
    if (count >= days) break;
    if (ci.todayCompletionPercent < threshold) {
      count++;
    } else {
      break; // 碰到一天好的就停止
    }
  }
  return count;
}

/**
 * 检查连续未收工天数
 */
export function countUnclosedDays(plans: DailyPlan[], date: string, lookback: number = 5): number {
  const current = parseDateOnly(date);
  let count = 0;
  for (let i = 1; i <= lookback; i++) {
    const checkDate = new Date(current);
    checkDate.setUTCDate(checkDate.getUTCDate() - i);
    const ds = formatDateOnly(checkDate);
    const plan = plans.find((p) => p.date === ds);
    if (plan && plan.status !== 'closed') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * 获取连续学习天数
 */
export function getStreakDays(plans: DailyPlan[], date: string): number {
  const closedDates = new Set(plans.filter((p) => p.status === 'closed').map((p) => p.date));
  if (closedDates.size === 0) return 0;

  const checkDate = parseDateOnly(date);
  if (!closedDates.has(formatDateOnly(checkDate))) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  let streak = 0;
  while (closedDates.has(formatDateOnly(checkDate))) {
    streak++;
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }
  return streak;
}

/**
 * 系统连续运行天数。
 *
 * 与 getStreakDays 的区别：休息日、放假日、阻断日都算「系统在运行」，
 * 因为产品理念是「允许失败，不允许脱轨」——断线只发生在学习日什么都没做。
 * 今天尚未收工不算断线，从昨天往前数。
 */
export function getSystemRunningStreak(
  cycle: StudyCycle,
  plans: DailyPlan[],
  overrides: DayOverride[],
  date: string
): number {
  const closed = new Set(plans.filter((p) => p.status === 'closed').map((p) => p.date));
  const overridden = new Set(overrides.map((o) => o.date));
  const start = parseDateOnly(cycle.startDate);

  const ran = (ds: string) =>
    closed.has(ds) || overridden.has(ds) || !isStudyDay(cycle, ds);

  const cursor = parseDateOnly(date);
  // 今天还没收工不算断线——从昨天开始数。
  if (!ran(formatDateOnly(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (cursor.getTime() >= start.getTime() && ran(formatDateOnly(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** 最近 n 天（含今天）的运行情况，用于首页节奏条。 */
export interface RecentDay {
  date: string;
  weekdayLabel: string;
  isStudyDay: boolean;
  /** 0–100；休息日为 null（不该显示成 0%） */
  completion: number | null;
  ran: boolean;
}

export function getRecentDays(
  cycle: StudyCycle,
  plans: DailyPlan[],
  overrides: DayOverride[],
  date: string,
  count: number = 7
): RecentDay[] {
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const overridden = new Map(overrides.map((o) => [o.date, o]));
  const out: RecentDay[] = [];

  for (let i = count - 1; i >= 0; i--) {
    const d = parseDateOnly(date);
    d.setUTCDate(d.getUTCDate() - i);
    const ds = formatDateOnly(d);
    const plan = plans.find((p) => p.date === ds);
    const isRest = !isStudyDay(cycle, ds) || overridden.has(ds);
    out.push({
      date: ds,
      weekdayLabel: weekdayLabels[d.getUTCDay()],
      isStudyDay: !isRest,
      completion: isRest ? null : plan && plan.status === 'closed' ? calculateTodayCompletion(plan) : 0,
      ran: isRest || plan?.status === 'closed',
    });
  }
  return out;
}

/**
 * 计算计划中保底任务是否完成
 */
export function isMinimumCompleted(plan: DailyPlan): boolean {
  const minTasks = plan.tasks.filter((t) => t.level === 'minimum');
  if (minTasks.length === 0) return true; // 没有保底任务就算完成
  return minTasks.every((t) => t.status === 'completed');
}
