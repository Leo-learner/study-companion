import React from 'react';

/**
 * 图标语言：20×20 网格、1.5px 描边、圆头圆角、无填充。
 * 取代原先散落在界面里的 emoji（跨端渲染不一致、风格无法统一）。
 */
export type IconName =
  | 'home' | 'today' | 'goal' | 'history' | 'review' | 'settings' | 'more'
  | 'min' | 'rec' | 'opt' | 'check' | 'plus' | 'minus' | 'skip'
  | 'key' | 'health' | 'pulse' | 'rest' | 'note' | 'spark'
  | 'plan' | 'book' | 'data' | 'chev' | 'back' | 'lang' | 'sun' | 'moon';

const PATHS: Record<IconName, React.ReactNode> = {
  home: <path d="M3.5 8.6 10 3.5l6.5 5.1V16a.9.9 0 0 1-.9.9h-3.3v-4.3H7.7v4.3H4.4a.9.9 0 0 1-.9-.9z" />,
  today: (
    <>
      <rect x="3.6" y="4.2" width="12.8" height="12.2" rx="2" />
      <path d="M7.2 4.2V2.8m5.6 1.4V2.8M6.6 9h3.2m-3.2 3.4h5.6" />
    </>
  ),
  goal: (
    <>
      <circle cx="10" cy="10" r="6.6" />
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 3.4v-2m0 17.2v-2M3.4 10h-2m17.2 0h-2" />
    </>
  ),
  history: (
    <>
      <rect x="3" y="4.6" width="14" height="12" rx="2" />
      <path d="M3 8.4h14M7 4.6V2.6m6 2V2.6" />
      <circle cx="7.3" cy="12" r=".9" fill="currentColor" stroke="none" />
      <circle cx="12.7" cy="12" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  review: <path d="M3 16.6h14M5.6 16.6V11m4.4 5.6V6m4.4 10.6v-3.4" />,
  settings: (
    <>
      <path d="M3 6.2h14M3 13.8h14" />
      <circle cx="7.4" cy="6.2" r="2" />
      <circle cx="12.6" cy="13.8" r="2" />
    </>
  ),
  more: <path d="M4.6 7h10.8M4.6 11h10.8M4.6 15h6.4" />,
  min: (
    <>
      <path d="M3.2 14.6h13.6" />
      <circle cx="10" cy="7.6" r="3.1" />
    </>
  ),
  rec: (
    <>
      <path d="M4 15.4c0-5 3.2-8.4 8-8.4" />
      <path d="M12 4.6 15.4 7 12 9.4" />
    </>
  ),
  opt: <circle cx="10" cy="10" r="6.4" strokeDasharray="2.6 3" />,
  check: <path d="M4.6 10.6l3.4 3.2 7.4-7.6" />,
  plus: <path d="M10 4.8v10.4M4.8 10h10.4" />,
  minus: <path d="M4.8 10h10.4" />,
  skip: (
    <>
      <path d="M4.4 10h11.2" />
      <path d="M12.4 6.6 15.8 10l-3.4 3.4" />
    </>
  ),
  key: (
    <>
      <circle cx="7" cy="7" r="3.4" />
      <path d="M9.5 9.5 16 16m-2.6-.6 1.4-1.4m-3.4-1 1.4-1.4" />
    </>
  ),
  health: <path d="M2.6 10.4h3l1.6-3.6 2.4 6.4 1.8-4 1.2 2.4h4.8" />,
  pulse: (
    <>
      <circle cx="10" cy="10" r="2.3" />
      <path d="M14.2 5.8a6 6 0 0 1 0 8.4M5.8 14.2a6 6 0 0 1 0-8.4" />
    </>
  ),
  rest: <path d="M4 12.6h9.4a2.6 2.6 0 0 0 0-5.2H4v3.4a1.8 1.8 0 0 0 1.8 1.8zM3 16.4h12" />,
  note: <path d="M12.4 3.8l3.8 3.8-8.4 8.4H4v-3.8z" />,
  spark: <path d="M10 2.8l1.7 4.5 4.5 1.7-4.5 1.7L10 15.2 8.3 10.7 3.8 9l4.5-1.7z" />,
  plan: (
    <>
      <path d="M4 16V4.6a.8.8 0 0 1 .8-.8H12l4 4V16a.8.8 0 0 1-.8.8H4.8A.8.8 0 0 1 4 16z" />
      <path d="M11.6 3.8v4.2h4.2" />
    </>
  ),
  book: <path d="M10 5.4c-1.6-1.4-3.6-1.8-6-1.6v10c2.4-.2 4.4.2 6 1.6 1.6-1.4 3.6-1.8 6-1.6v-10c-2.4-.2-4.4.2-6 1.6zm0 0v10" />,
  data: (
    <>
      <ellipse cx="10" cy="5.4" rx="5.8" ry="2.4" />
      <path d="M4.2 5.4v9.2c0 1.3 2.6 2.4 5.8 2.4s5.8-1.1 5.8-2.4V5.4M4.2 10c0 1.3 2.6 2.4 5.8 2.4s5.8-1.1 5.8-2.4" />
    </>
  ),
  chev: <path d="M7.6 4.4 13.2 10l-5.6 5.6" />,
  back: <path d="M12.4 4.4 6.8 10l5.6 5.6" />,
  lang: (
    <>
      <circle cx="10" cy="10" r="6.8" />
      <path d="M3.4 10h13.2M10 3.2c1.8 1.8 2.7 4 2.7 6.8s-.9 5-2.7 6.8c-1.8-1.8-2.7-4-2.7-6.8s.9-5 2.7-6.8z" />
    </>
  ),
  sun: (
    <>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.6v1.8M10 15.6v1.8M2.6 10h1.8M15.6 10h1.8M4.8 4.8l1.3 1.3M13.9 13.9l1.3 1.3M15.2 4.8l-1.3 1.3M6.1 13.9l-1.3 1.3" />
    </>
  ),
  moon: <path d="M15.6 12.6A6.4 6.4 0 0 1 7.4 4.4a6.6 6.6 0 1 0 8.2 8.2z" />,
};

/** 描边更粗的图标（勾选类需要更实的观感）。 */
const HEAVY: Partial<Record<IconName, number>> = {
  check: 2,
  plus: 1.6,
  minus: 1.6,
  chev: 1.6,
  back: 1.6,
};

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function Icon({ name, size = 18, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={HEAVY[name] ?? 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ flex: 'none', ...style }}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
