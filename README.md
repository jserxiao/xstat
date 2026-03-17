# XStat - 前端监控 SDK

[![npm version](https://badge.fury.io/js/@jserxiao%2Fxstat.svg)](https://www.npmjs.com/package/@jserxiao/xstat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

XStat 是一个功能全面的前端监控 SDK，提供错误追踪、性能监控、用户行为分析等功能。

## 特性

- 🔴 **错误监控** - JS 错误、Promise 错误、资源加载错误、Vue/React 错误
- ⚡ **性能监控** - Web Vitals (LCP, FID, CLS, FCP, TTFB)、资源加载、长任务
- 👤 **用户行为** - PV/UV、点击追踪、滚动深度、页面停留时长
- 🌐 **请求监控** - XHR/Fetch 劫持，监控慢请求和错误
- 🗄️ **数据缓存** - localStorage/IndexedDB 离线存储，失败重试
- 🎛️ **采样控制** - 支持按类型配置采样率
- 🔒 **数据脱敏** - 自动过滤敏感信息
- 📱 **框架支持** - Vue、React 专用插件

## 安装

```bash
npm install @jserxiao/xstat
# 或
yarn add @jserxiao/xstat
# 或
pnpm add @jserxiao/xstat
```

## 快速开始

### 基础使用

```typescript
import XStat from '@jserxiao/xstat';

// 创建实例并初始化
const xstat = new XStat();

xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    appVersion: '1.0.0',
    env: 'production',
    // 通过配置自动注册插件
    plugins: {
        error: true,        // 启用错误监控
        performance: true,  // 启用性能监控
        behavior: true,     // 启用行为监控
    },
});
```

### 完整配置

```typescript
const xstat = new XStat();

xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    appVersion: '1.0.0',
    env: 'production',
    
    // 插件配置 - 自动注册
    plugins: {
        error: true,           // 基础错误监控
        // error: { vue: app }, // Vue 错误监控
        // error: { react: React }, // React 错误监控
        performance: true,     // 性能监控
        behavior: true,        // 行为监控
        http: true,            // HTTP 请求监控
        blankScreen: true,     // 白屏检测
    },
    
    // 延迟批量上报
    delay: {
        max: 100,        // 最大缓存条数
        time: 3000,      // 延迟时间(ms)
        timeout: 10000,  // 超时时间(ms)
    },
    
    // 发送方式: 'xhr' | 'beacon' | 'img'
    sendType: 'xhr',
    
    // 采样率配置 (0-1)
    sampling: {
        error: 1,        // 错误全量上报
        performance: 0.5, // 性能50%采样
        behavior: 0.3,   // 行为30%采样
        pv: 1,           // PV全量上报
    },
    
    // 数据脱敏
    privacy: {
        enable: true,
        fields: ['password', 'token', 'phone'],
    },
    
    // 调试模式
    debug: false,
});
```

## 插件列表

### ErrorPlugin - 错误监控

```typescript
import XStat from '@jserxiao/xstat';

const xstat = new XStat();

// 基础错误监控
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        error: true,
    },
});

// Vue 错误监控
const app = createApp(App);
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        error: { vue: app },
    },
});

// React 错误监控
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        error: { react: React },
    },
});
const ErrorBoundary = xstat.getPlugin('ReactErrorPlugin')?.createErrorBoundary(React);
```

### PerformancePlugin - 性能监控

```typescript
import XStat from '@jserxiao/xstat';

const xstat = new XStat();
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        performance: true,
    },
});

// 自动监控:
// - Web Vitals: LCP, FID, CLS, FCP, TTFB
// - 资源加载性能
// - 页面导航性能
// - 长任务检测
```

### BehaviorPlugin - 用户行为

```typescript
import XStat, { BehaviorPlugin } from '@jserxiao/xstat';

const xstat = new XStat();
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        behavior: true,
    },
});

// 获取插件实例进行手动埋点
const behavior = xstat.getPlugin('BehaviorPlugin') as BehaviorPlugin;
behavior?.track('button_click', { buttonId: 'submit' });
behavior?.track('form_submit', { formId: 'login' });
```

### HttpPlugin - 请求监控

```typescript
import XStat from '@jserxiao/xstat';

const xstat = new XStat();
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        http: true,
    },
});

// 自动监控 XHR 和 Fetch
// 上报慢请求(>3s)和错误请求(>=400)
```

### BlankScreenPlugin - 白屏检测

```typescript
import XStat from '@jserxiao/xstat';

const xstat = new XStat();
xstat.init({
    server: 'https://your-server.com/api/log',
    appKey: 'your-app-key',
    plugins: {
        blankScreen: true,
    },
});

// 页面加载5秒后自动检测白屏
```

## API 参考

### Core 方法

| 方法 | 说明 |
|------|------|
| `new Core()` | 创建 SDK 实例 |
| `init(config)` | 初始化 SDK，自动注册配置的插件 |
| `use(plugin)` | 手动注册插件 |
| `getPlugin(name)` | 获取已注册的插件实例 |
| `report(data)` | 上报数据 |
| `flush()` | 立即发送所有数据 |
| `setUserId(id)` | 设置用户ID |
| `getUserId()` | 获取用户ID |
| `getSessionId()` | 获取会话ID |
| `destroy()` | 销毁 SDK |

### 工具函数

```typescript
import { 
    generateUUID,     // 生成 UUID
    getPageUrl,       // 获取页面URL
    getXPath,         // 获取元素XPath
    throttle,         // 节流函数
    debounce,         // 防抖函数
    deepMerge,        // 深度合并
    maskData,         // 数据脱敏
} from '@jserxiao/xstat';
```

## 数据格式

### 错误数据

```json
{
    "type": "jsError",
    "time": 1710000000000,
    "url": "https://example.com/page",
    "sessionId": "uuid",
    "message": "Cannot read property of undefined",
    "stack": "Error: ...",
    "filename": "app.js",
    "lineno": 10,
    "colno": 5
}
```

### 性能数据

```json
{
    "type": "webVitals",
    "time": 1710000000000,
    "url": "https://example.com/page",
    "sessionId": "uuid",
    "name": "LCP",
    "value": 1200,
    "rating": "good"
}
```

### 行为数据

```json
{
    "type": "click",
    "time": 1710000000000,
    "url": "https://example.com/page",
    "sessionId": "uuid",
    "eventName": "click",
    "target": {
        "tagName": "BUTTON",
        "id": "submit",
        "text": "提交"
    },
    "data": {
        "x": 100,
        "y": 200
    }
}
```

## 构建输出

| 文件 | 格式 | 用途 |
|------|------|------|
| `xstat.js` | ESM | ES Module 导入 |
| `xstat.cjs` | CJS | CommonJS 导入 |
| `xstat.min.js` | UMD | 压缩版，浏览器直接引用 |
| `xstat.iife.js` | IIFE | 立即执行函数 |
| `xstat.d.ts` | - | TypeScript 类型定义 |

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

MIT
