# Study Companion

一个温和、可持续的本地学习系统陪跑器。它根据学习周期、目标进度和近期状态生成每日任务，并提供收工反馈、历史记录和轻量复盘。

## 功能

- 创建学习周期并配置学习日规则
- 管理课程、刷题、背诵、阅读、项目等学习目标
- 自动生成保底、推荐和可选任务
- 健康前置与当日特例
- 收工反馈、历史记录和节奏复盘
- JSON 数据导入与导出
- 响应式桌面与移动端界面

所有学习数据默认保存在浏览器 localStorage 中，不会自动上传到服务器。

## 本地运行

要求 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

默认访问地址：`http://localhost:3003`。

## 测试与构建

```bash
npm test
npm run build
npm run preview
```

## 数据安全

请在“设置 → 数据管理”中定期导出 JSON 备份。清理浏览器站点数据、更换浏览器或使用隐私窗口时，本地学习记录不会自动迁移。

## 技术栈

- React 18
- TypeScript
- React Router
- Vite 8
- Vitest 4
