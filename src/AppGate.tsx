import React from 'react';
import App from './App';
import { AccountProvider, useAccounts } from './AccountProvider';
import UnlockScreen from './components/UnlockScreen';
import { useI18n } from './i18n/I18nProvider';

/** 账号未解锁时不渲染主应用，避免任何数据被读到界面上。 */
function Gate() {
  const { status } = useAccounts();
  if (status === 'loading') return <div className="app-loading" />;
  if (status === 'locked') return <UnlockScreen />;
  return <App />;
}

export default function AppGate() {
  const { t } = useI18n();
  return (
    <AccountProvider defaultName={t('account.defaultName')}>
      <Gate />
    </AccountProvider>
  );
}
