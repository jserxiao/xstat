// ==================== 基础类型 ====================

export type SendType = 'xhr' | 'beacon' | 'img';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type RouteMode = 'hash' | 'history';

// ==================== 配置类型 ====================

export interface DelayOptions {
    /** 最大缓存条数 */
    max: number;
    /** 延迟发送时间(ms) */
    time: number;
    /** 超时时间(ms) */
    timeout: number;
}

export interface SamplingOptions {
    /** 错误采样率 0-1 */
    error?: number;
    /** 性能采样率 0-1 */
    performance?: number;
    /** 行为采样率 0-1 */
    behavior?: number;
    /** PV采样率 0-1 */
    pv?: number;
}

export interface PrivacyOptions {
    /** 是否开启脱敏 */
    enable: boolean;
    /** 需要脱敏的字段列表 */
    fields?: string[];
    /** 自定义脱敏函数 */
    maskFn?: (value: string) => string;
}

export interface PluginConfig {
    /** 错误监控插件 */
    error?: boolean | { vue?: any; react?: any };
    /** 性能监控插件 */
    performance?: boolean;
    /** 行为监控插件 */
    behavior?: boolean;
    /** HTTP请求监控插件 */
    http?: boolean;
    /** 白屏检测插件 */
    blankScreen?: boolean;
}

export interface ConfigOption {
    /** 上报服务器地址 */
    server: string;
    /** API密钥 */
    appKey: string;
    /** 应用版本 */
    appVersion?: string;
    /** 环境 */
    env?: 'development' | 'test' | 'production';
    /** 是否开启延迟批量上报 */
    delay?: boolean | DelayOptions;
    /** 发送方式 */
    sendType?: SendType;
    /** 是否开启全量埋点 */
    fullBurry?: boolean;
    /** 采样率配置 */
    sampling?: SamplingOptions;
    /** 隐私脱敏配置 */
    privacy?: PrivacyOptions;
    /** 是否开启调试模式 */
    debug?: boolean;
    /** 用户ID */
    userId?: string;
    /** 插件配置 */
    plugins?: PluginConfig;
    /** 扩展数据 */
    extends?: Record<string, any>;
}

// ==================== 数据类型 ====================

export type EventType = 
    | 'error'           // 通用错误
    | 'jsError'         // JS运行时错误
    | 'promiseError'    // Promise未捕获错误
    | 'staticError'     // 静态资源加载错误
    | 'vueError'        // Vue错误
    | 'reactError'      // React错误
    | 'httpError'       // HTTP请求错误
    | 'performance'     // 性能数据
    | 'webVitals'       // Web Vitals
    | 'resource'        // 资源加载
    | 'navigation'      // 页面导航
    | 'action'          // 用户行为
    | 'pv'              // 页面访问
    | 'click'           // 点击事件
    | 'scroll'          // 滚动事件
    | 'stay'            // 页面停留
    | 'custom';         // 自定义事件

export interface BaseStatData {
    /** 事件类型 */
    type: EventType;
    /** 发生时间 */
    time: number;
    /** 页面URL */
    url: string;
    /** 会话ID */
    sessionId: string;
    /** 用户ID */
    userId?: string;
    /** 页面标题 */
    title?: string;
    /** 浏览器信息 */
    userAgent?: string;
}

export interface ErrorStatData extends BaseStatData {
    type: 'error' | 'jsError' | 'promiseError' | 'staticError' | 'vueError' | 'reactError' | 'httpError';
    /** 错误消息 */
    message: string;
    /** 错误堆栈 */
    stack?: string;
    /** 错误文件名 */
    filename?: string;
    /** 错误行号 */
    lineno?: number;
    /** 错误列号 */
    colno?: number;
    /** 组件名（Vue/React） */
    componentName?: string;
    /** 额外信息 */
    extra?: any;
}

export interface PerformanceStatData extends BaseStatData {
    type: 'performance' | 'webVitals' | 'resource' | 'navigation';
    /** 性能指标名称 */
    name: string;
    /** 性能指标值 */
    value: number;
    /** 评级 */
    rating?: 'good' | 'needs-improvement' | 'poor';
    /** 详细信息 */
    detail?: any;
}

export interface BehaviorStatData extends BaseStatData {
    type: 'action' | 'pv' | 'click' | 'scroll' | 'stay' | 'custom';
    /** 事件名称 */
    eventName?: string;
    /** 事件数据 */
    data?: any;
    /** 目标元素信息 */
    target?: ElementInfo;
}

export interface ElementInfo {
    /** 标签名 */
    tagName: string;
    /** 元素ID */
    id?: string;
    /** 元素class */
    className?: string;
    /** 元素文本 */
    text?: string;
    /** XPath路径 */
    xpath?: string;
    /** 元素选择器 */
    selector?: string;
}

export type StatData = ErrorStatData | PerformanceStatData | BehaviorStatData;

// ==================== 插件类型 ====================

export interface Plugin {
    /** 插件名称 */
    name: string;
    /** 插件版本 */
    version?: string;
    /** 初始化方法 */
    init(core: CoreInstance): void;
    /** 销毁方法 */
    destroy?(): void;
}

export interface CoreInstance {
    config: ConfigOption;
    /** 上报数据 */
    report(data: StatData): void;
    /** 获取会话ID */
    getSessionId(): string;
    /** 获取用户ID */
    getUserId(): string | undefined;
    /** 是否在采样中 */
    isSampled(type: keyof SamplingOptions): boolean;
    /** 脱敏数据 */
    maskData(data: any): any;
}

// ==================== Web Vitals 类型 ====================

export interface WebVitalsMetric {
    name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB';
    value: number;
    rating: 'good' | 'needs-improvement' | 'poor';
    entries: PerformanceEntry[];
}

// ==================== 请求监控类型 ====================

export interface RequestInfo {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
}

export interface ResponseInfo {
    status: number;
    statusText: string;
    headers?: Record<string, string>;
    data?: any;
}

export interface HttpStatData extends ErrorStatData {
    type: 'httpError';
    request: RequestInfo;
    response?: ResponseInfo;
    duration: number;
}

// ==================== Session 类型 ====================

export interface SessionInfo {
    id: string;
    startTime: number;
    lastActiveTime: number;
    pageViews: number;
}

// ==================== 发送器类型 ====================

export interface Sender {
    send(data: StatData[]): Promise<boolean>;
}

export interface RetryOptions {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
}
