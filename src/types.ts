// ============================================================
// 学习系统陪跑器 - 核心类型定义
// ============================================================

// --- 学习周期 ---
export interface StudyCycle {
  id: string;
  name: string;
  startDate: string;       // ISO date: YYYY-MM-DD
  endDate: string;         // ISO date: YYYY-MM-DD
  status: 'active' | 'archived';
  dayRule: DayRule;
  healthGateEnabled: boolean;
  healthGateText: string;
  launchPhrase: string;
  maxMainGoalsPerDay: number;   // 默认 1
  hideRawAmountsInFeedback: boolean; // 默认 true
  createdAt: string;
  updatedAt: string;
}

// --- 学习日规则 ---
export type DayRuleType = 'weekday' | 'cycle' | 'customWeek';

export interface DayRule {
  type: DayRuleType;
  // weekdayMode: 周一至周五学习，周末休息 (无需额外字段)
  // cycleMode: 学习 N 天休 M 天
  studyDays?: number;
  restDays?: number;
  // customWeekMode: 用户自定义周几学习 (0=周日, 1=周一, ..., 6=周六)
  activeWeekdays?: number[];
}

// --- 学习目标 ---
export type GoalCategory = 'course' | 'problems' | 'memory' | 'reading' | 'project' | 'custom';

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  course: '课程学习',
  problems: '题目训练',
  memory: '记忆背诵',
  reading: '阅读计划',
  project: '项目开发',
  custom: '自定义',
};

export type Priority = 'high' | 'medium' | 'low';
export type Difficulty = 'easy' | 'normal' | 'hard';

export interface StudyGoal {
  id: string;
  cycleId: string;
  name: string;
  category: GoalCategory;
  unitName: string;          // e.g. 分钟、节、章、题、页、词、个、阶段
  totalAmount: number;
  completedAmount: number;
  priority: Priority;
  difficulty: Difficulty;
  isActive: boolean;
  minimumTaskHint: string;   // 保底任务建议
  recommendedTaskHint: string; // 推荐任务建议
  optionalTaskHint: string;  // 可选任务建议
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// --- 每日计划 ---
export type PlanMode = 'normal' | 'light' | 'rest' | 'holiday' | 'exam' | 'blocked';
export type PlanStatus = 'notStarted' | 'active' | 'submitted' | 'closed';
export type HealthGateStatus = 'pending' | 'passed' | 'exception' | 'notRequired';

export interface DailyPlan {
  id: string;
  cycleId: string;
  date: string;              // YYYY-MM-DD
  dayIndex: number;           // 周期第几天 (1-based)
  mode: PlanMode;
  healthGateStatus: HealthGateStatus;
  mainGoalIds: string[];      // 今日主线目标 ID
  tasks: TaskItem[];
  status: PlanStatus;
  generatedReason: string;    // 为什么今天这样安排
  userState: UserState | '';  // 用户自评状态
  notes: string;
  blockers: string;           // 客观阻断说明
  createdAt: string;
  closedAt: string;
}

// --- 任务项 ---
export type TaskLevel = 'minimum' | 'recommended' | 'optional';
export type TaskType = 'learn' | 'practice' | 'review' | 'memorize' | 'read' | 'develop' | 'custom';
export type TaskStatus = 'notStarted' | 'partial' | 'completed' | 'skipped' | 'blocked';

export interface TaskItem {
  id: string;
  goalId: string;
  title: string;
  level: TaskLevel;
  type: TaskType;
  targetAmount: number;
  unitName: string;
  completionAmount: number;
  status: TaskStatus;
  description: string;
  notes: string;
}

// --- 打卡记录 ---
export type UserState = 'good' | 'normal' | 'tired' | 'bad';
export type RhythmStatus = 'ahead' | 'stable' | 'slightlyBehind' | 'behind' | 'slipping';

export interface CheckIn {
  id: string;
  cycleId: string;
  planId: string;
  date: string;
  userState: UserState;
  todayCompletionPercent: number;
  cumulativeCompletionPercent: number;
  expectedProgressPercent: number;
  rhythmStatus: RhythmStatus;
  summary: string;
  suggestion: string;
  blockers: string;
  isClosed: boolean;
  createdAt: string;
}

// --- 日期覆盖 ---
export interface DayOverride {
  id: string;
  cycleId: string;
  date: string;
  mode: Exclude<PlanMode, 'normal' | 'light'>; // rest / holiday / exam / blocked
  reason: string;
  createdAt: string;
}

// --- 应用设置 ---
export interface AppSettings {
  launchPhrase?: string;
  hideRawAmountsInFeedback?: boolean;
  healthGateEnabled?: boolean;
  healthGateText?: string;
  maxMainGoalsPerDay?: number;
}

// --- 完整数据包 ---
export const DEFAULT_LAUNCH_PHRASE = '开始学习';

export interface AppData {
  version: number;
  cycles: StudyCycle[];
  goals: StudyGoal[];
  plans: DailyPlan[];
  checkIns: CheckIn[];
  overrides: DayOverride[];
  settings: AppSettings;
}

export const STORAGE_KEY = 'study-companion-data-v1';
export const CURRENT_DATA_VERSION = 1;

// --- 生成唯一 ID ---
export function generateId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 10);
}

// --- 获取今天的日期字符串 ---
export function localDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayStr(): string {
  return localDateStr(new Date());
}
