import React, { useState } from 'react';
import { useAccounts } from '../AccountProvider';
import { useI18n } from '../i18n/I18nProvider';
import Icon from './Icon';
import { ACCOUNT_COLORS } from './StatusChips';

/** 解锁屏。密码错误的文案要温和——用户此刻已经在懊恼了，不该再被红字训一遍。 */
export default function UnlockScreen() {
  const { pending, unlock, accounts, switchTo } = useAccounts();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    const ok = await unlock(password, remember);
    setBusy(false);
    if (!ok) { setWrong(true); setPassword(''); }
  };

  const others = accounts.filter((a) => a.id !== pending?.id);

  return (
    <div className="unlock">
      <div className="unlock-card">
        <div className="unlock-avatar" style={{ background: ACCOUNT_COLORS[(pending?.colorIndex ?? 0) % ACCOUNT_COLORS.length] }}>
          <Icon name="key" size={22} />
        </div>
        <h1 className="h2">{pending?.name}</h1>
        <p className="note">{t('account.unlockHint')}</p>

        <input
          className="input input-ritual"
          type="password"
          autoFocus
          value={password}
          placeholder={t('account.passwordPlaceholder')}
          onChange={(e) => { setPassword(e.target.value); setWrong(false); }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          aria-label={t('account.password')}
        />

        {wrong && <div className="note" style={{ color: 'var(--sc-rest)' }}>{t('account.wrongPassword')}</div>}

        <label className="row" style={{ gap: 9, cursor: 'pointer' }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span className="note">{t('account.rememberSession')}</span>
        </label>

        <button className="btn btn-primary btn-lg btn-block" onClick={submit} disabled={!password || busy}>
          {busy ? t('account.unlocking') : t('account.unlock')}
        </button>

        {others.length > 0 && (
          <div className="stack-8" style={{ borderTop: '1px solid var(--sc-line-soft)', paddingTop: 14 }}>
            <div className="note">{t('account.switchOther')}</div>
            <div className="row-wrap" style={{ gap: 8 }}>
              {others.map((a) => (
                <button key={a.id} className="btn btn-outline btn-sm" onClick={() => switchTo(a.id)}>
                  <span className="state-dot" style={{ background: ACCOUNT_COLORS[a.colorIndex % ACCOUNT_COLORS.length] }} />
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
