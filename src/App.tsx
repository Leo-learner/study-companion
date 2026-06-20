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

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/today', label: '今日任务', icon: '📋' },
  { to: '/goals', label: '目标', icon: '🎯' },
  { to: '/history', label: '历史', icon: '📅' },
  { to: '/review', label: '复盘', icon: '📊' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

export default function App() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar-logo">
          <span>📚</span> 学习陪跑
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
              {item.label}
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
          开心和健康最重要，学习不是用来压迫自己和否定自己的。
        </div>
      </main>
    </div>
  );
}
