// ============================================================
// 存储服务 - localStorage 持久化、导入导出
// ============================================================
import {
  AppData,
  StudyCycle,
  StudyGoal,
  DailyPlan,
  CheckIn,
  DayOverride,
  AppSettings,
  STORAGE_KEY,
  CURRENT_DATA_VERSION,
} from './types';

// --- 获取初始空数据 ---
function getEmptyData(): AppData {
  return {
    version: CURRENT_DATA_VERSION,
    cycles: [],
    goals: [],
    plans: [],
    checkIns: [],
    overrides: [],
    settings: {},
  };
}

// --- 读取全部数据 ---
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getEmptyData();
    const data = JSON.parse(raw) as AppData;
    // 版本迁移（当前版本为 1，无需迁移）
    if (!data.version) data.version = 1;
    // 确保所有数组字段存在
    data.cycles = data.cycles || [];
    data.goals = data.goals || [];
    data.plans = data.plans || [];
    data.checkIns = data.checkIns || [];
    data.overrides = data.overrides || [];
    data.settings = data.settings || {};
    return data;
  } catch {
    return getEmptyData();
  }
}

// --- 保存全部数据 ---
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('数据保存失败，可能 localStorage 已满', e);
  }
}

// --- 辅助：修改数据并保存 ---
export function updateData(updater: (data: AppData) => AppData): AppData {
  const current = loadData();
  const updated = updater(current);
  saveData(updated);
  return updated;
}

// --- Cycle CRUD ---
export function getActiveCycle(): StudyCycle | undefined {
  const data = loadData();
  return data.cycles.find((c) => c.status === 'active');
}

export function getCycle(id: string): StudyCycle | undefined {
  const data = loadData();
  return data.cycles.find((c) => c.id === id);
}

export function saveCycle(cycle: StudyCycle): void {
  updateData((data) => {
    const idx = data.cycles.findIndex((c) => c.id === cycle.id);
    if (idx >= 0) {
      data.cycles[idx] = { ...cycle, updatedAt: new Date().toISOString() };
    } else {
      data.cycles.push({ ...cycle, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    return data;
  });
}

export function archiveCycle(id: string): void {
  updateData((data) => {
    const cycle = data.cycles.find((c) => c.id === id);
    if (cycle) cycle.status = 'archived';
    return data;
  });
}

// --- Goal CRUD ---
export function getGoals(cycleId?: string): StudyGoal[] {
  const data = loadData();
  if (cycleId) {
    return data.goals.filter((g) => g.cycleId === cycleId);
  }
  return data.goals;
}

export function getActiveGoals(cycleId: string): StudyGoal[] {
  return getGoals(cycleId).filter((g) => g.isActive);
}

export function saveGoal(goal: StudyGoal): void {
  updateData((data) => {
    const idx = data.goals.findIndex((g) => g.id === goal.id);
    if (idx >= 0) {
      data.goals[idx] = { ...goal, updatedAt: new Date().toISOString() };
    } else {
      data.goals.push({ ...goal, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    return data;
  });
}

export function deleteGoal(id: string): void {
  updateData((data) => {
    data.goals = data.goals.filter((g) => g.id !== id);
    return data;
  });
}

// --- Plan CRUD ---
export function getPlans(cycleId: string): DailyPlan[] {
  const data = loadData();
  return data.plans.filter((p) => p.cycleId === cycleId);
}

export function getPlanForDate(cycleId: string, date: string): DailyPlan | undefined {
  const data = loadData();
  return data.plans.find((p) => p.cycleId === cycleId && p.date === date);
}

export function savePlan(plan: DailyPlan): void {
  updateData((data) => {
    const idx = data.plans.findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      data.plans[idx] = plan;
    } else {
      data.plans.push(plan);
    }
    return data;
  });
}

// --- CheckIn CRUD ---
export function getCheckIns(cycleId: string): CheckIn[] {
  const data = loadData();
  return data.checkIns.filter((c) => c.cycleId === cycleId);
}

export function getCheckInForDate(cycleId: string, date: string): CheckIn | undefined {
  const data = loadData();
  return data.checkIns.find((c) => c.cycleId === cycleId && c.date === date);
}

export function saveCheckIn(checkIn: CheckIn): void {
  updateData((data) => {
    const idx = data.checkIns.findIndex((c) => c.id === checkIn.id);
    if (idx >= 0) {
      data.checkIns[idx] = checkIn;
    } else {
      data.checkIns.push(checkIn);
    }
    return data;
  });
}

// --- Override CRUD ---
export function getOverrides(cycleId: string): DayOverride[] {
  const data = loadData();
  return data.overrides.filter((o) => o.cycleId === cycleId);
}

export function getOverrideForDate(cycleId: string, date: string): DayOverride | undefined {
  const data = loadData();
  return data.overrides.find((o) => o.cycleId === cycleId && o.date === date);
}

export function saveOverride(override: DayOverride): void {
  updateData((data) => {
    const idx = data.overrides.findIndex((o) => o.id === override.id);
    if (idx >= 0) {
      data.overrides[idx] = override;
    } else {
      data.overrides.push(override);
    }
    return data;
  });
}

export function deleteOverride(id: string): void {
  updateData((data) => {
    data.overrides = data.overrides.filter((o) => o.id !== id);
    return data;
  });
}

// --- Settings ---
export function getSettings(): AppSettings {
  const data = loadData();
  return data.settings || {};
}

export function saveSettings(settings: AppSettings): void {
  updateData((data) => {
    data.settings = { ...data.settings, ...settings };
    return data;
  });
}

// --- 数据导入导出 ---
export function exportDataJSON(): string {
  const data = loadData();
  return JSON.stringify(data, null, 2);
}

export type ImportErrorCode = 'invalidFormat' | 'missingFields' | 'jsonParse';

export type ImportResult =
  | { success: true }
  | { success: false; errorCode: ImportErrorCode; detail?: string };

export function importDataJSON(jsonStr: string): ImportResult {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      return { success: false, errorCode: 'invalidFormat' };
    }
    // 基本校验
    if (!Array.isArray(data.cycles) || !Array.isArray(data.goals) || !Array.isArray(data.plans)) {
      return { success: false, errorCode: 'missingFields' };
    }
    saveData({ ...data, version: CURRENT_DATA_VERSION });
    return { success: true };
  } catch (e) {
    return { success: false, errorCode: 'jsonParse', detail: (e as Error).message };
  }
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
