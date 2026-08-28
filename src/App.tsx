import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import CycleSetup from './pages/CycleSetup';
import GoalManager from './pages/GoalManager';
import TodayPlan from './pages/TodayPlan';
import CheckInView from './pages/CheckInView';
import History from './pages/History';
import Review from './pages/Review';
import Settings from './pages/Settings';
import Icon, { IconName } from './components/Icon';
import { useI18n } from './i18n/I18nProvider';
import { TranslationKey } from './i18n/messages';
import { useTheme } from './theme';
import { getActiveCycle, getOverrides, getPlans } from './storage';
import { getSystemRunningStreak } from './progress';
import { todayStr } from './types';

interface NavEntry {
  to: string;
  labelKey: TranslationKey;
  icon: IconName;
}

/** 底部标签栏只放最常用的三个；其余进「更多」面板，避免小屏挤掉入口。 */
const PRIMARY_NAV: NavEntry[] = [
  { to: '/', labelKey: 'nav.home', icon: 'home' },
  { to: '/today', labelKey: 'nav.today', icon: 'today' },
  { to: '/goals', labelKey: 'nav.goals', icon: 'goal' },
];

const SECONDARY_NAV: NavEntry[] = [
  { to: '/history', labelKey: 'nav.history', icon: 'history' },
  { to: '/review', labelKey: 'nav.review', icon: 'review' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

const ALL_NAV = [...PRIMARY_NAV, ...SECONDARY_NAV];

/** 没有自己导航项的路由：顶栏显示返回箭头。 */
const SUBROUTE_TITLES: Array<{ match: (path: string) => boolean; key: TranslationKey; icon: IconName; back: string }> = [
  { match: (p) => p.startsWith('/checkin'), key: 'today.feedbackTitle', icon: 'check', back: '/today' },
  { match: (p) => p === '/cycle-setup', key: 'cycle.createTitle', icon: 'plan', back: '/' },
];

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);

  // 路由切换时关闭面板并回到顶部
  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  const cycle = getActiveCycle();
  const streak = cycle
    ? getSystemRunningStreak(cycle, getPlans(cycle.id), getOverrides(cycle.id), todayStr())
    : 0;

  const sub = SUBROUTE_TITLES.find((s) => s.match(pathname));
  const navMatch = ALL_NAV.find((n) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to)));
  const headerIcon: IconName = sub?.icon ?? navMatch?.icon ?? 'home';
  const headerTitle = sub ? t(sub.key) : navMatch ? t(navMatch.labelKey) : t('app.brand');

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <div className="app">
      {/* --- 桌面侧栏 --- */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-mark"><Icon name="book" size={18} /></span>
          <span className="sidebar-name">{t('app.brand')}</span>
        </div>

        <nav className="sidebar-nav">
          {ALL_NAV.map((item) => (
            <button
              key={item.to}
              type="button"
              className={`nav-item${isActive(item.to) ? ' active' : ''}`}
              aria-current={isActive(item.to) ? 'page' : undefined}
              onClick={() => navigate(item.to)}
            >
              <Icon name={item.icon} size={19} />
              {t(item.labelKey)}
            </button>
          ))}
        </nav>

        {cycle && (
          <div className="sidebar-streak">
            <div className="sidebar-streak-label">
              <Icon name="pulse" size={15} />
              {t('shell.systemRunning')}
            </div>
            {/* 带上单位：Instrument Serif 的单个「0」窄得像括号，配上「天」才读得出来 */}
            <div className="row" style={{ alignItems: 'baseline', gap: 6 }}>
              <span className="sidebar-streak-num">{streak}</span>
              <span style={{ fontSize: 12, color: 'var(--sc-ink-2)' }}>{t('home.daysUnit')}</span>
            </div>
            <div className="sidebar-streak-note">{t('shell.streakNote')}</div>
          </div>
        )}
      </aside>

      <div className="main">
        {/* --- 移动端顶栏 --- */}
        <header className="mobile-top">
          {sub ? (
            <button type="button" className="icon-btn" aria-label={t('common.back')} onClick={() => navigate(sub.back)}>
              <Icon name="back" size={20} />
            </button>
          ) : null}
          <Icon name={headerIcon} size={18} style={{ color: 'var(--sc-primary)' }} />
          <span className="mobile-title" style={{ flex: 1 }}>{headerTitle}</span>
          {cycle && (
            <span className="chip chip-primary">
              <Icon name="pulse" size={14} />
              {t('shell.streakShort', { count: streak })}
            </span>
          )}
          <button
            type="button"
            className="icon-btn"
            aria-label={theme === 'dark' ? t('shell.themeLight') : t('shell.themeDark')}
            onClick={toggleTheme}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
          </button>
        </header>

        <main className="content">
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

          <div className="core-reminder">
            <Icon name="health" size={15} style={{ marginTop: 3, color: 'var(--sc-ink-3)' }} />
            <div className="core-reminder-text pretty">{t('app.reminder')}</div>
          </div>
        </main>

        {/* --- 移动端底部标签栏 --- */}
        <nav className="tabbar">
          {PRIMARY_NAV.map((item) => (
            <button
              key={item.to}
              type="button"
              className={`tab${isActive(item.to) ? ' active' : ''}`}
              aria-current={isActive(item.to) ? 'page' : undefined}
              onClick={() => navigate(item.to)}
            >
              <Icon name={item.icon} size={22} />
              <span>{t(item.labelKey)}</span>
            </button>
          ))}
          <button
            type="button"
            className={`tab${SECONDARY_NAV.some((n) => isActive(n.to)) ? ' active' : ''}`}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <Icon name="more" size={22} />
            <span>{t('nav.more')}</span>
          </button>
        </nav>

        {moreOpen && (
          <div className="more-sheet-wrap" onClick={() => setMoreOpen(false)}>
            <div className="more-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="more-grip" />
              {SECONDARY_NAV.map((item) => (
                <button key={item.to} type="button" className="sheet-item" onClick={() => navigate(item.to)}>
                  <Icon name={item.icon} size={20} style={{ color: 'var(--sc-primary)' }} />
                  <span style={{ flex: 1, textAlign: 'left' }}>{t(item.labelKey)}</span>
                  <Icon name="chev" size={18} style={{ color: 'var(--sc-ink-3)' }} />
                </button>
              ))}
              <button type="button" className="sheet-item" onClick={toggleTheme}>
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={20} style={{ color: 'var(--sc-primary)' }} />
                <span style={{ flex: 1, textAlign: 'left' }}>
                  {theme === 'dark' ? t('shell.themeLight') : t('shell.themeDark')}
                </span>
              </button>
              <button type="button" className="btn btn-quiet" style={{ marginTop: 10 }} onClick={() => setMoreOpen(false)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
