# Study Companion / 学习系统陪跑器

[中文](#中文说明) · [English](#english-guide)

<a id="中文说明"></a>

## 中文说明

Study Companion 是一个温和、可持续、完全在本地浏览器中运行的学习陪跑系统。它会根据学习周期、目标进度和近期状态生成当天可承受的任务，并提供收工反馈、历史记录和轻量复盘。

### 主要功能

- 一键切换中文和英文界面，并记住所选语言
- 创建学习周期，配置学习日、休息日和健康前置规则
- 管理课程、刷题、背诵、阅读、项目和自定义目标
- 自动生成保底、推荐和可选任务；状态不佳时自动降低强度
- 标记休息日、放假日、考试日和客观阻断日
- 收工反馈、历史详情、连续记录和周期复盘
- JSON 数据导入、导出与本地备份
- 适配桌面和移动端

### 语言切换

侧栏品牌区域始终显示语言按钮。中文界面点击 `EN` 切换为英文；英文界面点击 `中文` 切回中文。语言选择保存在本地，刷新页面后仍然有效。

系统界面及新生成的任务标题、计划原因、总结和建议会随语言即时切换。目标名称、单位、备注、自定义任务、特殊日原因等用户输入内容保持原文；旧版记录没有翻译元数据时也会继续显示原文。

### 本地运行

需要 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

开发服务器默认地址为 `http://localhost:3003`。

### 测试与构建

```bash
npm test
npm run build
npm run preview
```

依赖安全检查：

```bash
npm audit --registry=https://registry.npmjs.org
```

### 数据安全

所有周期、目标、计划、打卡记录和语言偏好都保存在浏览器 `localStorage`，不会由本项目自动上传到服务器。请在“设置 → 数据管理”中定期导出 JSON 备份。清理站点数据、更换浏览器、使用隐私窗口或重装系统时，本地记录不会自动迁移。

导入会覆盖当前本地数据，操作前建议先导出备份。敏感个人信息不应写入计划或备注后再共享备份文件。

### 技术栈

- React 18
- TypeScript
- React Router
- Vite 8
- Vitest 4
- 无第三方国际化依赖的类型安全本地 i18n

---

<a id="english-guide"></a>

## English Guide

Study Companion is a gentle, sustainable learning companion that runs entirely in your browser. It creates manageable daily tasks from your study cycle, goal progress, and recent condition, then provides close-out feedback, history, and lightweight reviews.

### Features

- Switch the full interface between Chinese and English with one click, with a persistent preference
- Create study cycles with study-day, rest-day, and health-check rules
- Manage course, practice, memorization, reading, project, and custom goals
- Generate minimum, recommended, and optional tasks; automatically lower intensity when needed
- Mark rest days, holidays, exam days, and objectively blocked days
- Review close-out feedback, history details, streaks, and cycle-level trends
- Import, export, and back up local data as JSON
- Responsive desktop and mobile layouts

### Language Switching

The language button is always visible beside the brand in the sidebar. Click `EN` in the Chinese interface to switch to English, or click `中文` in the English interface to switch back. The preference is stored locally and survives page refreshes.

The interface and newly generated task titles, plan reasons, summaries, and suggestions update immediately. User-entered goal names, units, notes, custom tasks, and special-day reasons remain exactly as written. Legacy records without translation metadata also keep their original text.

### Run Locally

Node.js 20.19+ or 22.12+ is required.

```bash
npm install
npm run dev
```

The development server is available at `http://localhost:3003` by default.

### Test and Build

```bash
npm test
npm run build
npm run preview
```

Run a dependency security audit against the official registry:

```bash
npm audit --registry=https://registry.npmjs.org
```

### Data Safety

Cycles, goals, plans, check-ins, and language preferences are stored in browser `localStorage`; this project does not automatically upload them to a server. Export JSON backups regularly from **Settings → Data Management**. Clearing site data, changing browsers, using private browsing, or reinstalling your system will not migrate local records automatically.

Importing replaces the current local data, so export a backup first. Avoid sharing backup files that contain sensitive information in goals or notes.

### Technology

- React 18
- TypeScript
- React Router
- Vite 8
- Vitest 4
- A lightweight, type-safe local i18n layer with no third-party i18n dependency
