// 核心
export { Core, DataSender, DataCache, SessionManager } from './core';

// 插件
export {
    ErrorPlugin,
    VueErrorPlugin,
    ReactErrorPlugin,
    PerformancePlugin,
    BehaviorPlugin,
    HttpPlugin,
    BlankScreenPlugin,
} from './core';

// 工具函数
export {
    generateId,
    generateUUID,
    getPageUrl,
    getXPath,
    getSelector,
    throttle,
    debounce,
    deepMerge,
    isSampled,
    maskData,
    getDeviceInfo,
    safeExec,
    formatStack,
    isWhiteScreen,
} from './utils';

// 类型
export type {
    SendType,
    LogLevel,
    RouteMode,
    DelayOptions,
    SamplingOptions,
    PrivacyOptions,
    ConfigOption,
    EventType,
    BaseStatData,
    ErrorStatData,
    PerformanceStatData,
    BehaviorStatData,
    ElementInfo,
    Plugin,
    CoreInstance,
    WebVitalsMetric,
    RequestInfo,
    ResponseInfo,
    HttpStatData,
    SessionInfo,
    Sender,
    RetryOptions,
    StatData,
} from './types';

// 默认导出
import xstat from './core';
export default xstat;

// 全局挂载
if (typeof window !== 'undefined') {
    (window as any).XStat = xstat;
}
