import React from 'react';

export type IconName = 'home' | 'today' | 'goals' | 'history' | 'review' | 'settings' | 'help' | 'chevron' | 'check' | 'close';
const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-8 9 8"/><path d="M5 9v12h5v-7h4v7h5V9"/></>,
  today: <><rect x="5" y="4" width="14" height="18" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 16h4"/></>,
  goals: <><path d="M20.6 9A9 9 0 1 1 15 3.4M16 10a4.5 4.5 0 1 1-2-2"/><path d="m12 12 9-9m-5 0h5v5"/></>,
  history: <><circle cx="12" cy="12" r="9"/><path d="M12 5v7h5"/></>,
  review: <><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h.01M11 7h5M8 12h.01M11 12h5M8 17h.01M11 17h5"/></>,
  settings: <><path d="m9 3 1-2h4l1 2 2 1 2-.1 2 3-1 2v4l1 2-2 3-2-.1-2 1-1 2h-4l-1-2-2-1-2 .1-2-3 1-2V9L3 7l2-3 2 .1z"/><circle cx="12" cy="11" r="3"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 16h.01"/></>,
  chevron: <path d="m5 9 7 7 7-7"/>,
  check: <path d="m4 12 5 5L20 6"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
};
export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}
