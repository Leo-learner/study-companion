import { describe, it, expect, beforeEach } from 'vitest';
import { dataKeyFor, STORAGE_KEY, ACCOUNTS_KEY, LEGACY_BACKUP_KEY } from '../src/types';
import { ensureAccounts, createAccount, deleteAccount, loadAccounts } from '../src/accounts';
import { deriveKey, encrypt, decrypt, isEnvelope, randomSalt } from '../src/crypto';

// 不引入 jsdom：这里只需要 localStorage，打个内存桩即可。
// Web Crypto 用 Node 自带的 globalThis.crypto。
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.has(k) ? this.map.get(k)! : null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(), configurable: true, writable: true,
  });
});

describe('账号键位', () => {
  it('每个账号有独立的数据键', () => {
    expect(dataKeyFor('abc')).toBe(`${STORAGE_KEY}::abc`);
    expect(dataKeyFor('abc')).not.toBe(dataKeyFor('def'));
  });
});

describe('首次运行与迁移', () => {
  it('没有任何数据时创建一个默认账号', () => {
    const index = ensureAccounts('默认');
    expect(index.accounts).toHaveLength(1);
    expect(index.accounts[0].name).toBe('默认');
    expect(index.lastActiveId).toBe(index.accounts[0].id);
  });

  it('把旧版单账号数据搬进默认账号，并保留一份备份', () => {
    const legacy = JSON.stringify({ version: 1, cycles: [{ id: 'c1' }], goals: [], plans: [] });
    localStorage.setItem(STORAGE_KEY, legacy);

    const index = ensureAccounts('默认');
    const id = index.accounts[0].id;

    expect(localStorage.getItem(dataKeyFor(id))).toBe(legacy);
    expect(localStorage.getItem(LEGACY_BACKUP_KEY)).toBe(legacy);
    // 旧键必须让位，否则下次启动会重复迁移
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('已有账号时不再重复迁移', () => {
    ensureAccounts('默认');
    const before = localStorage.getItem(ACCOUNTS_KEY);
    ensureAccounts('默认');
    expect(localStorage.getItem(ACCOUNTS_KEY)).toBe(before);
    expect(loadAccounts().accounts).toHaveLength(1);
  });
});

describe('删除账号', () => {
  it('连同该账号的数据一起删掉，不影响其它账号', () => {
    const a = createAccount('甲', 0);
    const b = createAccount('乙', 1);
    localStorage.setItem(dataKeyFor(a.id), '{"a":1}');
    localStorage.setItem(dataKeyFor(b.id), '{"b":1}');

    deleteAccount(a.id);

    expect(localStorage.getItem(dataKeyFor(a.id))).toBeNull();
    expect(localStorage.getItem(dataKeyFor(b.id))).toBe('{"b":1}');
    expect(loadAccounts().accounts.map((x) => x.name)).toEqual(['乙']);
  });
});

describe('加密往返', () => {
  it('用同一密码能解开，且密文里看不到明文', async () => {
    const salt = randomSalt();
    const key = await deriveKey('pw-12345', salt, 1000);   // 测试里降低迭代以提速
    const plain = JSON.stringify({ cycles: [{ name: '秋季考研冲刺' }] });

    const envelope = await encrypt(key, plain);
    expect(isEnvelope(envelope)).toBe(true);
    expect(JSON.stringify(envelope)).not.toContain('秋季考研冲刺');

    expect(await decrypt(key, envelope)).toBe(plain);
  });

  it('密码错误时返回 null 而不是抛错', async () => {
    const salt = randomSalt();
    const right = await deriveKey('right', salt, 1000);
    const wrong = await deriveKey('wrong', salt, 1000);

    const envelope = await encrypt(right, 'hello');
    expect(await decrypt(wrong, envelope)).toBeNull();
  });

  it('每次加密的 IV 不同，相同明文得到不同密文', async () => {
    const key = await deriveKey('pw', randomSalt(), 1000);
    const a = await encrypt(key, 'same');
    const b = await encrypt(key, 'same');
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });
});
