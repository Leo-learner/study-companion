import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Account } from './types';
import {
  deriveExistingKey, ensureAccounts, forgetSessionKey, getAccount,
  loadAccounts, recallSessionKey, rememberSessionKey, setLastActive,
} from './accounts';
import { closeAccount, flushNow, openAccount } from './storage';

type Status = 'loading' | 'locked' | 'ready';

interface AccountContextValue {
  status: Status;
  accounts: Account[];
  current?: Account;
  /** 需要解锁的账号（status 为 locked 时有值） */
  pending?: Account;
  refreshAccounts: () => void;
  switchTo: (accountId: string) => Promise<void>;
  unlock: (password: string, remember: boolean) => Promise<boolean>;
  lock: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children, defaultName }: {
  children: React.ReactNode;
  defaultName: string;
}) {
  const [status, setStatus] = useState<Status>('loading');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentId, setCurrentId] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [tick, setTick] = useState(0);

  const refreshAccounts = useCallback(() => setTick((t) => t + 1), []);

  /** 打开账号：无密码直接进；有密码先试会话密钥，不行就要求解锁。 */
  const activate = useCallback(async (account: Account) => {
    if (!account.kdf) {
      await openAccount(account.id, null);
      setCurrentId(account.id);
      setPendingId(undefined);
      setStatus('ready');
      setLastActive(account.id);
      return;
    }
    const sessionKey = await recallSessionKey(account.id);
    if (sessionKey && await openAccount(account.id, sessionKey)) {
      setCurrentId(account.id);
      setPendingId(undefined);
      setStatus('ready');
      setLastActive(account.id);
      return;
    }
    forgetSessionKey(account.id);
    closeAccount();
    setCurrentId(undefined);
    setPendingId(account.id);
    setStatus('locked');
  }, []);

  // 首次载入：确保有账号（必要时迁移旧数据），然后打开上次使用的那个
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const index = ensureAccounts(defaultName);
      if (cancelled) return;
      setAccounts(index.accounts);
      const target = index.accounts.find((a) => a.id === index.lastActiveId) ?? index.accounts[0];
      if (target) await activate(target);
    })();
    return () => { cancelled = true; };
    // tick 变化时重新读取账号列表
  }, [activate, defaultName, tick]);

  const switchTo = useCallback(async (accountId: string) => {
    const account = getAccount(accountId);
    if (!account) return;
    await flushNow();       // 先把当前账号的数据落盘再切走
    closeAccount();
    await activate(account);
  }, [activate]);

  const unlock = useCallback(async (password: string, remember: boolean) => {
    const account = pendingId ? getAccount(pendingId) : undefined;
    if (!account) return false;
    const key = await deriveExistingKey(account, password);
    if (!key || !(await openAccount(account.id, key))) return false;
    if (remember) await rememberSessionKey(account.id, key);
    setCurrentId(account.id);
    setPendingId(undefined);
    setStatus('ready');
    setLastActive(account.id);
    return true;
  }, [pendingId]);

  const lock = useCallback(() => {
    if (currentId) forgetSessionKey(currentId);
    void flushNow().then(() => {
      closeAccount();
      setPendingId(currentId);
      setCurrentId(undefined);
      setStatus('locked');
    });
  }, [currentId]);

  const value = useMemo<AccountContextValue>(() => ({
    status,
    accounts: loadAccounts().accounts,
    current: currentId ? getAccount(currentId) : undefined,
    pending: pendingId ? getAccount(pendingId) : undefined,
    refreshAccounts, switchTo, unlock, lock,
  }), [status, currentId, pendingId, refreshAccounts, switchTo, unlock, lock, accounts]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccounts(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccounts must be used inside AccountProvider');
  return ctx;
}
