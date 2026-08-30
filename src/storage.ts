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
  CURRENT_DATA_VERSION,
  dataKeyFor,
} from './types';
import { Envelope, decrypt, encrypt, isEnvelope } from './crypto';

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

// ============================================================
// 当前账号的会话状态
//
// 加密是异步的（Web Crypto），而 saveData() 被十几处同步调用。
// 因此这里用「内存缓存 + 单飞异步落盘」：读写对调用方全同步，
// 加密与写入在后台串行完成，页面层一行都不用改。
// ============================================================

let activeAccountId: string | null = null;
let activeKey: CryptoKey | null = null;   // 无密码账号为 null
let cache: AppData | null = null;

let writing = false;
let pendingWrite = false;
let lastWrite: Promise<void> = Promise.resolve();

function currentKey(): string {
  if (!activeAccountId) throw new Error('尚未选定账号');
  return dataKeyFor(activeAccountId);
}

function normalize(data: AppData): AppData {
  if (!data.version) data.version = 1;
  data.cycles = data.cycles || [];
  data.goals = data.goals || [];
  data.plans = data.plans || [];
  data.checkIns = data.checkIns || [];
  data.overrides = data.overrides || [];
  data.settings = data.settings || {};
  return data;
}

/**
 * 载入某账号的数据到内存。有密码的账号必须传入已派生的密钥。
 * 返回 false 表示密文解不开（密码错误或数据损坏），调用方据此提示。
 */
export async function openAccount(accountId: string, key: CryptoKey | null): Promise<boolean> {
  const raw = localStorage.getItem(dataKeyFor(accountId));
  if (!raw) {
    activeAccountId = accountId;
    activeKey = key;
    cache = normalize(getEmptyData());
    return true;
  }

  let text: string | null = raw;
  try {
    const parsed = JSON.parse(raw);
    if (isEnvelope(parsed)) {
      if (!key) return false;                       // 有密文却没给密钥
      text = await decrypt(key, parsed as Envelope);
      if (text === null) return false;              // 密码错误
    }
  } catch {
    return false;
  }

  try {
    activeAccountId = accountId;
    activeKey = key;
    cache = normalize(JSON.parse(text) as AppData);
    return true;
  } catch {
    return false;
  }
}

/** 切走账号时清掉内存中的明文与密钥。 */
export function closeAccount(): void {
  activeAccountId = null;
  activeKey = null;
  cache = null;
}

export function isAccountOpen(): boolean {
  return cache !== null;
}

/** 用新密钥（或 null 表示取消密码）重写当前账号的数据。 */
export async function rekeyActiveAccount(key: CryptoKey | null): Promise<void> {
  activeKey = key;
  await flushNow();
}

async function persist(snapshot: AppData): Promise<void> {
  const text = JSON.stringify(snapshot);
  const payload = activeKey ? JSON.stringify(await encrypt(activeKey, text)) : text;
  try {
    localStorage.setItem(currentKey(), payload);
  } catch (e) {
    console.error('数据保存失败，可能 localStorage 已满', e);
  }
}

/** 单飞：写入进行中只记 pending，结束后用最新快照再写一次。 */
function scheduleFlush(): void {
  if (writing) { pendingWrite = true; return; }
  writing = true;
  lastWrite = (async () => {
    try {
      do {
        pendingWrite = false;
        if (cache) await persist(cache);
      } while (pendingWrite);
    } finally {
      writing = false;
    }
  })();
}

/** 等待落盘完成——切换账号、改密码、页面隐藏前调用。 */
export async function flushNow(): Promise<void> {
  scheduleFlush();
  await lastWrite;
}

if (typeof window !== 'undefined') {
  // 关标签页/切后台时尽力把最后一次修改写完
  window.addEventListener('pagehide', () => { void flushNow(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow();
  });
}

// --- 读取全部数据 ---
export function loadData(): AppData {
  if (cache) return cache;
  return getEmptyData();
}

// --- 保存全部数据 ---
export function saveData(data: AppData): void {
  // 同步更新内存，异步加密落盘
  cache = data;
  cache.accountId = activeAccountId ?? undefined;
  cache.updatedAt = new Date().toISOString();
  scheduleFlush();
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

/** 只清空当前账号的数据，其它账号不受影响。 */
export function clearAllData(): void {
  cache = normalize(getEmptyData());
  scheduleFlush();
}
