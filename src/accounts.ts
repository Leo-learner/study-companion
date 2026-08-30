// ============================================================
// 账号：索引读写、迁移、解锁状态
// ============================================================
//
// 账号索引是明文的——它只有名字、创建时间和 KDF 参数，不含任何学习内容。
// 学习数据按账号分键存放，设了密码的账号存密文。
import {
  Account, AccountsIndex, ACCOUNTS_KEY, ACCOUNTS_VERSION,
  STORAGE_KEY, LEGACY_BACKUP_KEY, dataKeyFor, generateId,
} from './types';
import { deriveKey, exportKey, importKey, randomSalt, defaultIterations } from './crypto';

const SESSION_KEY_PREFIX = 'study-companion-sesskey::';

function emptyIndex(): AccountsIndex {
  return { version: ACCOUNTS_VERSION, accounts: [] };
}

export function loadAccounts(): AccountsIndex {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return emptyIndex();
    const parsed = JSON.parse(raw) as AccountsIndex;
    parsed.accounts = parsed.accounts || [];
    return parsed;
  } catch {
    return emptyIndex();
  }
}

export function saveAccounts(index: AccountsIndex): void {
  try {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(index));
  } catch (e) {
    console.error('账号索引保存失败', e);
  }
}

export function getAccount(id: string): Account | undefined {
  return loadAccounts().accounts.find((a) => a.id === id);
}

export function hasPassword(account: Account | undefined): boolean {
  return !!account?.kdf;
}

/**
 * 确保至少有一个账号，并返回当前应激活的账号。
 *
 * 首次运行时若检测到旧的单账号数据，静默迁移进默认账号——
 * 新用户不该在第一步就面对账号概念，那违背产品的低启动成本原则。
 */
export function ensureAccounts(defaultName: string): AccountsIndex {
  const index = loadAccounts();
  if (index.accounts.length > 0) return index;

  const now = new Date().toISOString();
  const account: Account = {
    id: generateId(), name: defaultName,
    createdAt: now, updatedAt: now, colorIndex: 0,
  };

  // 迁移旧数据：搬到账号命名空间下，旧键改名保留一次作为保险
  const legacy = localStorage.getItem(STORAGE_KEY);
  if (legacy) {
    try {
      localStorage.setItem(dataKeyFor(account.id), legacy);
      localStorage.setItem(LEGACY_BACKUP_KEY, legacy);
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('旧数据迁移失败', e);
    }
  }

  const next: AccountsIndex = {
    version: ACCOUNTS_VERSION, accounts: [account], lastActiveId: account.id,
  };
  saveAccounts(next);
  return next;
}

export function createAccount(name: string, colorIndex: number): Account {
  const now = new Date().toISOString();
  const account: Account = {
    id: generateId(), name: name.trim() || '未命名', createdAt: now, updatedAt: now, colorIndex,
  };
  const index = loadAccounts();
  index.accounts.push(account);
  saveAccounts(index);
  return account;
}

export function renameAccount(id: string, name: string): void {
  const index = loadAccounts();
  const account = index.accounts.find((a) => a.id === id);
  if (!account) return;
  account.name = name.trim() || account.name;
  account.updatedAt = new Date().toISOString();
  saveAccounts(index);
}

export function deleteAccount(id: string): void {
  const index = loadAccounts();
  index.accounts = index.accounts.filter((a) => a.id !== id);
  if (index.lastActiveId === id) index.lastActiveId = index.accounts[0]?.id;
  saveAccounts(index);
  localStorage.removeItem(dataKeyFor(id));
  forgetSessionKey(id);
}

export function setLastActive(id: string): void {
  const index = loadAccounts();
  index.lastActiveId = id;
  saveAccounts(index);
}

/** 写入 KDF 参数，表示该账号已设密码。实际重新加密由 storage 层完成。 */
export function markPasswordSet(id: string, salt: string, iterations: number): void {
  const index = loadAccounts();
  const account = index.accounts.find((a) => a.id === id);
  if (!account) return;
  account.kdf = { salt, iterations };
  account.updatedAt = new Date().toISOString();
  saveAccounts(index);
}

export function markPasswordRemoved(id: string): void {
  const index = loadAccounts();
  const account = index.accounts.find((a) => a.id === id);
  if (!account) return;
  delete account.kdf;
  account.updatedAt = new Date().toISOString();
  saveAccounts(index);
  forgetSessionKey(id);
}

/** 为新密码派生密钥，返回密钥与 KDF 参数（调用方负责重新加密数据后再写索引）。 */
export async function deriveNewKey(password: string) {
  const salt = randomSalt();
  const iterations = defaultIterations;
  const key = await deriveKey(password, salt, iterations);
  return { key, salt, iterations };
}

export async function deriveExistingKey(account: Account, password: string): Promise<CryptoKey | null> {
  if (!account.kdf) return null;
  return deriveKey(password, account.kdf.salt, account.kdf.iterations);
}

// --- 会话内记住密钥：关闭标签页即失效，刷新不必重输 ---

export async function rememberSessionKey(accountId: string, key: CryptoKey): Promise<void> {
  try {
    sessionStorage.setItem(SESSION_KEY_PREFIX + accountId, await exportKey(key));
  } catch {
    // 隐私模式下写不了，只是每次刷新要重输密码，不影响功能
  }
}

export async function recallSessionKey(accountId: string): Promise<CryptoKey | null> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY_PREFIX + accountId);
    return raw ? await importKey(raw) : null;
  } catch {
    return null;
  }
}

export function forgetSessionKey(accountId: string): void {
  try {
    sessionStorage.removeItem(SESSION_KEY_PREFIX + accountId);
  } catch {
    // 同上，忽略
  }
}
