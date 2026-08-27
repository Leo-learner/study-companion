import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CycleSetup from './pages/CycleSetup';
import GoalManager from './pages/GoalManager';
import TodayPlan from './pages/TodayPlan';
import CheckInView from './pages/CheckInView';
import History from './pages/History';
import Review from './pages/Review';
import Settings from './pages/Settings';
import { useI18n } from './i18n/I18nProvider';
import HelpMenu from './components/HelpMenu';
import Icon, { IconName } from './components/Icon';
import { TranslationKey } from './i18n/messages';

const NAV_ITEMS: Array<{ to: string; labelKey: TranslationKey; icon: IconName }> = [
  { to: '/', labelKey: 'nav.home', icon: 'home' },
  { to: '/today', labelKey: 'nav.today', icon: 'today' },
  { to: '/goals', labelKey: 'nav.goals', icon: 'goals' },
  { to: '/history', labelKey: 'nav.history', icon: 'history' },
  { to: '/review', labelKey: 'nav.review', icon: 'review' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

export default function App() {
  const { language, t, toggleLanguage } = useI18n();

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>{t('ui.skipContent')}</a>
      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <div className="app-sidebar-logo">
            {t('app.brand')}
          </div>

        </div>
        <nav className="app-nav" aria-label={t('ui.navigation')}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <Icon name={item.icon} className="app-nav-icon"/>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-utilities"><HelpMenu/>
          <button
            className="language-toggle"
            type="button"
            onClick={toggleLanguage}
            aria-label={language === 'zh' ? t('language.switchToEnglish') : t('language.switchToChinese')}
            title={language === 'zh' ? t('language.switchToEnglish') : t('language.switchToChinese')}
          >
            {language === 'zh' ? 'EN' : '中文'}
          </button>
        </div>
      </aside>
      <main className="app-main" id="main-content" tabIndex={-1}>
        <div className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cycle-setup" element={<CycleSetup />} />
            <Route path="/goals" element={<GoalManager />} />
            <Route path="/today" element={<TodayPlan />} />
            <Route path="/checkin/:planId" element={<CheckInView />} />
            <Route path="/history" element={<History />} />
            <Route path="/review" element={<Review />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>

      </main>
    </div>
  );
}
