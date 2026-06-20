import React from 'react';
import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CycleSetup from './pages/CycleSetup';
import GoalManager from './pages/GoalManager';
import TodayPlan from './pages/TodayPlan';
import CheckInView from './pages/CheckInView';
import History from './pages/History';
import Review from './pages/Review';
import Settings from './pages/Settings';
import { useI18n } from './i18n/I18nProvider';
import { TranslationKey } from './i18n/messages';

const NAV_ITEMS: Array<{ to: string; labelKey: TranslationKey; icon: string }> = [
  { to: '/', labelKey: 'nav.home', icon: '🏠' },
  { to: '/today', labelKey: 'nav.today', icon: '📋' },
  { to: '/goals', labelKey: 'nav.goals', icon: '🎯' },
  { to: '/history', labelKey: 'nav.history', icon: '📅' },
  { to: '/review', labelKey: 'nav.review', icon: '📊' },
  { to: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
];

export default function App() {
  const location = useLocation();
  const currentPath = location.pathname;
  const { language, t, toggleLanguage } = useI18n();

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar-header">
          <div className="app-sidebar-logo">
            <span>📚</span> {t('app.brand')}
          </div>
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
        <nav className="app-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              <span className="app-nav-icon">{item.icon}</span>
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="app-main">
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
        <div className="core-reminder">
          {t('app.reminder')}
        </div>
      </main>
    </div>
  );
}
