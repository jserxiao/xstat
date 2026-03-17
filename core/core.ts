import type { ConfigOption, StatData, Plugin, SamplingOptions } from '../types';
import { DataSender } from './sender';
import { DataCache } from './cache';
import { SessionManager } from './session';
import { ErrorPlugin, VueErrorPlugin, ReactErrorPlugin } from './error';
import { PerformancePlugin } from './performance';
import { BehaviorPlugin } from './behavior';
import { HttpPlugin } from './http';
import { BlankScreenPlugin } from './blank-screen';
import { deepMerge, isSampled, generateUUID, getPageUrl, maskData } from '../utils';

const defaultConfig: Partial<ConfigOption> = {
    delay: {
        max: 100,
        time: 3000,
        timeout: 10000,
    },
    sendType: 'xhr',
    fullBurry: false,
    debug: false,
    env: 'production',
    sampling: {
        error: 1,
        performance: 1,
        behavior: 1,
        pv: 1,
    },
    privacy: {
        enable: true,
    },
};

/**
 * XStat 核心类 - 插件化架构
 */
export class Core {
    config: ConfigOption = {} as ConfigOption;
    private plugins: Map<string, Plugin> = new Map();
    private sender: DataSender | null = null;
    private cache: DataCache | null = null;
    private sessionManager: SessionManager | null = null;
    private dataQueue: StatData[] = [];
    private sendTimer: ReturnType<typeof setTimeout> | null = null;
    private userId: string | undefined;
    private initialized = false;

    constructor() {}

    /**
     * 初始化 SDK
     */
    init(config: ConfigOption): void {
        if (this.initialized) {
            console.warn('XStat: already initialized');
            return;
        }

        if (!config.server || !config.appKey) {
            console.error('XStat: server and appKey are required');
            return;
        }

        this.config = deepMerge(defaultConfig as ConfigOption, config);
        this.userId = config.userId;

        // 初始化核心组件
        this.sender = new DataSender(this.config);
        this.cache = new DataCache();
        this.sessionManager = new SessionManager();

        // 从缓存恢复数据
        this.restoreFromCache();

        // 页面卸载前刷新数据
        this.bindBeforeUnload();

        this.initialized = true;

        // 自动注册配置的插件（需要在 initialized = true 之后）
        this.autoRegisterPlugins();

        if (this.config.debug) {
            console.log('XStat initialized:', this.config);
        }
    }

    /**
     * 自动注册插件
     */
    private autoRegisterPlugins(): void {
        const plugins = this.config.plugins;
        if (!plugins) return;

        // 错误监控插件
        if (plugins.error) {
            if (typeof plugins.error === 'object') {
                if (plugins.error.vue) {
                    this.use(new VueErrorPlugin(plugins.error.vue));
                }
                if (plugins.error.react) {
                    this.use(new ReactErrorPlugin());
                }
            } else {
                this.use(new ErrorPlugin());
            }
        }

        // 性能监控插件
        if (plugins.performance) {
            this.use(new PerformancePlugin());
        }

        // 行为监控插件
        if (plugins.behavior) {
            this.use(new BehaviorPlugin());
        }

        // HTTP请求监控插件
        if (plugins.http) {
            this.use(new HttpPlugin());
        }

        // 白屏检测插件
        if (plugins.blankScreen) {
            this.use(new BlankScreenPlugin());
        }
    }

    /**
     * 使用插件
     */
    use(plugin: Plugin): void {
        if (!this.initialized) {
            console.error('XStat: please call init() before use()');
            return;
        }

        if (this.plugins.has(plugin.name)) {
            console.warn(`XStat: plugin ${plugin.name} already registered`);
            return;
        }

        this.plugins.set(plugin.name, plugin);
        plugin.init(this);

        if (this.config.debug) {
            console.log(`XStat: plugin ${plugin.name} registered`);
        }
    }

    /**
     * 获取插件实例
     */
    getPlugin<T extends Plugin>(name: string): T | undefined {
        return this.plugins.get(name) as T | undefined;
    }

    /**
     * 上报数据
     */
    report(data: StatData): void {
        if (!this.initialized) {
            console.error('XStat: not initialized');
            return;
        }

        // 检查采样率
        if (!this.isSampled(data.type)) {
            return;
        }

        // 补充基础信息
        const enrichedData: StatData = {
            ...data,
            time: data.time || Date.now(),
            url: data.url || getPageUrl(),
            sessionId: this.getSessionId(),
            userId: data.userId || this.userId,
            title: document.title,
            userAgent: navigator.userAgent,
        };

        // 添加到队列
        this.dataQueue.push(enrichedData);

        // 检查是否需要立即发送
        const delay = this.config.delay;
        const maxCount = typeof delay === 'object' ? delay.max : 100;

        if (this.dataQueue.length >= maxCount) {
            this.flush();
        } else {
            this.scheduleSend();
        }
    }

    /**
     * 立即发送所有数据
     */
    flush(): void {
        if (this.dataQueue.length === 0) return;

        const dataToSend = [...this.dataQueue];
        this.dataQueue = [];

        // 先尝试发送
        this.sender?.send(dataToSend).then(success => {
            if (!success) {
                // 发送失败，缓存起来
                this.cache?.add(dataToSend);
            }
        });

        // 清空定时器
        if (this.sendTimer) {
            clearTimeout(this.sendTimer);
            this.sendTimer = null;
        }
    }

    /**
     * 设置用户ID
     */
    setUserId(userId: string): void {
        this.userId = userId;
    }

    /**
     * 获取用户ID
     */
    getUserId(): string | undefined {
        return this.userId;
    }

    /**
     * 获取会话ID
     */
    getSessionId(): string {
        return this.sessionManager?.getSessionId() || generateUUID();
    }

    /**
     * 获取会话信息
     */
    getSessionInfo() {
        return this.sessionManager?.getSessionInfo();
    }

    /**
     * 检查是否命中采样
     */
    isSampled(type: string): boolean {
        // 映射事件类型到采样配置
        const typeMap: Record<string, keyof SamplingOptions> = {
            'jsError': 'error',
            'promiseError': 'error',
            'staticError': 'error',
            'vueError': 'error',
            'reactError': 'error',
            'httpError': 'error',
            'webVitals': 'performance',
            'resource': 'performance',
            'navigation': 'performance',
            'click': 'behavior',
            'scroll': 'behavior',
            'stay': 'behavior',
            'custom': 'behavior',
            'pv': 'pv',
        };
        
        const samplingKey = typeMap[type] || (type as keyof SamplingOptions);
        const rate = this.config.sampling?.[samplingKey];
        if (rate === undefined) return true;
        return isSampled(rate);
    }

    /**
     * 脱敏数据
     */
    maskData(data: any): any {
        return maskData(data, this.config.privacy);
    }

    /**
     * 销毁 SDK
     */
    destroy(): void {
        // 刷新剩余数据
        this.flush();
        this.sender?.flush();

        // 销毁所有插件
        this.plugins.forEach(plugin => {
            plugin.destroy?.();
        });
        this.plugins.clear();

        // 清理
        if (this.sendTimer) {
            clearTimeout(this.sendTimer);
        }

        this.initialized = false;
    }

    /**
     * 调度发送
     */
    private scheduleSend(): void {
        if (this.sendTimer) return;

        const delay = this.config.delay;
        const delayTime = typeof delay === 'object' ? delay.time : 3000;

        this.sendTimer = setTimeout(() => {
            this.sendTimer = null;
            this.flush();
        }, delayTime);
    }

    /**
     * 从缓存恢复数据
     */
    private async restoreFromCache(): Promise<void> {
        const cached = await this.cache?.get();
        if (cached && cached.length > 0) {
            this.dataQueue.push(...cached);
            this.cache?.clear();
            this.scheduleSend();
        }
    }

    /**
     * 绑定页面卸载事件
     */
    private bindBeforeUnload(): void {
        window.addEventListener('beforeunload', () => {
            this.flush();
            this.sender?.flush();
        });

        // 页面可见性变化时刷新数据
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flush();
            }
        });
    }
}

export default Core;
