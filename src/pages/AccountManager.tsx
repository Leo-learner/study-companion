import React, { useState } from 'react';
import { useAccounts } from '../AccountProvider';
import { useI18n } from '../i18n/I18nProvider';
import Icon from '../components/Icon';
import { ACCOUNT_COLORS } from '../components/StatusChips';
import {
  createAccount, deleteAccount, deriveExistingKey, deriveNewKey,
  markPasswordRemoved, markPasswordSet, renameAccount,
} from '../accounts';
import { openAccount, rekeyActiveAccount } from '../storage';
import { Account } from '../types';

export default function AccountManager() {
  const { accounts, current, switchTo, refreshAccounts, lock } = useAccounts();
  const { t } = useI18n();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string>();
  const [renameValue, setRenameValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string>();
  const [pwFor, setPwFor] = useState<Account>();

  const handleCreate = () => {
    if (!newName.trim()) return;
    createAccount(newName, accounts.length % ACCOUNT_COLORS.length);
    setNewName(''); setCreating(false); refreshAccounts();
  };

  const handleRename = (id: string) => {
    renameAccount(id, renameValue);
    setRenamingId(undefined); refreshAccounts();
  };

  const handleDelete = (id: string) => {
    if (pendingDelete !== id) { setPendingDelete(id); return; }
    deleteAccount(id);
    setPendingDelete(undefined); refreshAccounts();
  };

  return (
    <>
      <div className="page-head">
        <h1 className="h1">{t('account.title')}</h1>
        <div className="sub pretty">{t('account.subtitle')}</div>
      </div>

      <div className="stack-12">
        {accounts.map((a) => {
          const isCurrent = a.id === current?.id;
          const confirming = pendingDelete === a.id;
          return (
            <div className="card card-flat" key={a.id}
                 style={isCurrent ? { borderColor: 'var(--sc-primary)' } : undefined}>
              <div className="row" style={{ gap: 12 }}>
                <span className="account-dot"
                      style={{ background: ACCOUNT_COLORS[a.colorIndex % ACCOUNT_COLORS.length] }}>
                  {a.name.slice(0, 1)}
                </span>

                {renamingId === a.id ? (
                  <input className="input" style={{ flex: 1 }} autoFocus value={renameValue}
                         onChange={(e) => setRenameValue(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleRename(a.id)}
                         onBlur={() => handleRename(a.id)} />
                ) : (
                  <div className="col" style={{ flex: 1, gap: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--sc-ink)' }}>{a.name}</div>
                    <div className="row-wrap" style={{ gap: 7 }}>
                      {isCurrent && <span className="chip chip-primary">{t('account.current')}</span>}
                      {a.kdf && (
                        <span className="chip chip-rest">
                          <Icon name="key" size={12} />
                          {t('account.locked')}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {!isCurrent && (
                  <button className="btn btn-soft btn-sm" onClick={() => switchTo(a.id)}>
                    {t('account.switch')}
                  </button>
                )}
              </div>

              <div className="row-wrap" style={{ gap: 8, borderTop: '1px solid var(--sc-line-soft)', paddingTop: 12 }}>
                <button className="btn btn-quiet btn-sm"
                        onClick={() => { setRenamingId(a.id); setRenameValue(a.name); }}>
                  {t('account.rename')}
                </button>
                <button className="btn btn-quiet btn-sm" onClick={() => setPwFor(a)}>
                  <Icon name="key" size={15} />
                  {a.kdf ? t('account.changePassword') : t('account.setPassword')}
                </button>
                {isCurrent && a.kdf && (
                  <button className="btn btn-outline btn-sm" onClick={lock}>{t('account.lock')}</button>
                )}
                <span className="spacer" />
                {accounts.length > 1 && (
                  <button className="btn btn-caution btn-sm"
                          onClick={() => handleDelete(a.id)}
                          onBlur={() => setPendingDelete((p) => (p === a.id ? undefined : p))}>
                    {confirming ? t('common.confirmDelete') : t('common.delete')}
                  </button>
                )}
              </div>

              {confirming && <div className="note pretty">{t('account.deleteWarning')}</div>}
            </div>
          );
        })}
      </div>

      {creating ? (
        <div className="card" style={{ borderColor: 'var(--sc-primary)' }}>
          <div className="card-title">{t('account.create')}</div>
          <input className="input" autoFocus value={newName} placeholder={t('account.namePlaceholder')}
                 onChange={(e) => setNewName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
          <div className="row-wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCreate} disabled={!newName.trim()}>
              {t('common.save')}
            </button>
            <button className="btn btn-outline" onClick={() => { setCreating(false); setNewName(''); }}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setCreating(true)}>
          <Icon name="plus" size={17} />
          {t('account.create')}
        </button>
      )}

      <div className="note pretty">{t('account.dataNote')}</div>

      {pwFor && (
        <PasswordDialog
          account={pwFor}
          isCurrent={pwFor.id === current?.id}
          onClose={() => { setPwFor(undefined); refreshAccounts(); }}
        />
      )}
    </>
  );
}

/**
 * 设置 / 修改 / 取消密码。
 *
 * 只有当前已解锁的账号才能改密码——改密码要用新密钥把明文重新加密一遍，
 * 而明文只有在账号打开时才在内存里。
 */
function PasswordDialog({ account, isCurrent, onClose }: {
  account: Account; isCurrent: boolean; onClose: () => void;
}) {
  const { t } = useI18n();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (remove: boolean) => {
    setError(''); setBusy(true);
    try {
      if (account.kdf) {
        const key = await deriveExistingKey(account, oldPw);
        // 校验旧密码：拿它解一次当前密文
        if (!key || !(await openAccount(account.id, key))) {
          setError(t('account.wrongPassword')); return;
        }
      }
      if (remove) {
        await rekeyActiveAccount(null);
        markPasswordRemoved(account.id);
        onClose(); return;
      }
      if (newPw.length < 4) { setError(t('account.passwordTooShort')); return; }
      if (newPw !== confirm) { setError(t('account.passwordMismatch')); return; }
      const { key, salt, iterations } = await deriveNewKey(newPw);
      await rekeyActiveAccount(key);
      markPasswordSet(account.id, salt, iterations);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet-panel" onClick={(e) => e.stopPropagation()}>
        <div className="card-title">
          <Icon name="key" size={16} style={{ color: 'var(--sc-primary)' }} />
          {account.kdf ? t('account.changePassword') : t('account.setPassword')}
        </div>

        {!isCurrent ? (
          <div className="note pretty">{t('account.switchFirst')}</div>
        ) : (
          <>
            {account.kdf && (
              <div className="field">
                <label className="label">{t('account.currentPassword')}</label>
                <input className="input" type="password" value={oldPw}
                       onChange={(e) => setOldPw(e.target.value)} />
              </div>
            )}
            <div className="field">
              <label className="label">{t('account.newPassword')}</label>
              <input className="input" type="password" value={newPw}
                     onChange={(e) => setNewPw(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">{t('account.confirmPassword')}</label>
              <input className="input" type="password" value={confirm}
                     onChange={(e) => setConfirm(e.target.value)} />
            </div>

            <div className="notice" style={{ background: 'var(--sc-health-soft)' }}>
              <Icon name="spark" size={17} style={{ marginTop: 2, color: 'var(--sc-health)' }} />
              <div className="notice-body pretty">{t('account.passwordWarning')}</div>
            </div>

            {error && <div className="note" style={{ color: 'var(--sc-rest)' }}>{error}</div>}

            <div className="row-wrap" style={{ gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={busy}
                      onClick={() => submit(false)}>
                {t('common.save')}
              </button>
              {account.kdf && (
                <button className="btn btn-caution" disabled={busy} onClick={() => submit(true)}>
                  {t('account.removePassword')}
                </button>
              )}
              <button className="btn btn-outline" onClick={onClose}>{t('common.cancel')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
