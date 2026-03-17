import type { Core } from './core';
import type { ErrorStatData, Plugin } from '../types';
import { formatStack, getSelector } from '../utils';

/**
 * 错误监控插件
 */
export class ErrorPlugin implements Plugin {
    name = 'error';
    private core: Core | null = null;
    private originalConsoleError: typeof console.error | null = null;

    init(core: Core): void {
        this.core = core;
        this.listenJSError();
        this.listenPromiseError();
        this.listenResourceError();
        
        if (core.config.debug) {
            this.wrapConsoleError();
        }
    }

    destroy(): void {
        // 事件监听无法真正移除，但可以通过标志位控制
        this.core = null;
        if (this.originalConsoleError) {
            console.error = this.originalConsoleError;
        }
    }

    /**
     * 监听 JS 运行时错误
     */
    private listenJSError(): void {
        window.addEventListener('error', (event: ErrorEvent) => {
            const target = event.target as HTMLElement;
            
            // 资源加载错误单独处理
            if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || 
                target.tagName === 'LINK' || target.tagName === 'AUDIO' || target.tagName === 'VIDEO')) {
                return;
            }

            const errorData: ErrorStatData = {
                type: 'jsError',
                time: Date.now(),
                url: location.href,
                sessionId: this.core!.getSessionId(),
                message: event.message,
                stack: formatStack(event.error?.stack),
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            };

            this.core?.report(errorData);
        });
    }

    /**
     * 监听 Promise 未捕获错误
     */
    private listenPromiseError(): void {
        window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            let message: string;
            let stack: string | undefined;

            if (reason instanceof Error) {
                message = reason.message;
                stack = formatStack(reason.stack);
            } else if (typeof reason === 'string') {
                message = reason;
            } else {
                try {
                    message = JSON.stringify(reason);
                } catch {
                    message = String(reason);
                }
            }

            const errorData: ErrorStatData = {
                type: 'promiseError',
                time: Date.now(),
                url: location.href,
                sessionId: this.core!.getSessionId(),
                message,
                stack,
            };

            this.core?.report(errorData);
        });
    }

    /**
     * 监听资源加载错误
     */
    private listenResourceError(): void {
        window.addEventListener('error', (event: ErrorEvent) => {
            const target = event.target as HTMLElement;
            
            if (!target || !(target.tagName === 'IMG' || target.tagName === 'SCRIPT' || 
                target.tagName === 'LINK' || target.tagName === 'AUDIO' || target.tagName === 'VIDEO')) {
                return;
            }

            const src = (target as any).src || (target as any).href;
            
            const errorData: ErrorStatData = {
                type: 'staticError',
                time: Date.now(),
                url: location.href,
                sessionId: this.core!.getSessionId(),
                message: `Failed to load resource: ${target.tagName}`,
                extra: {
                    tagName: target.tagName,
                    src,
                    selector: getSelector(target),
                },
            };

            this.core?.report(errorData);
        }, true); // 捕获阶段
    }

    /**
     * 包装 console.error
     */
    private wrapConsoleError(): void {
        this.originalConsoleError = console.error;
        const core = this.core;
        
        console.error = function(...args: any[]) {
            // 调用原始方法
            core?.report({
                type: 'error',
                time: Date.now(),
                url: location.href,
                sessionId: core!.getSessionId(),
                message: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ).join(' '),
                extra: { source: 'console.error' },
            });
            
            if (core?.config.debug) {
                console.warn('[XStat] console.error captured:', ...args);
            }
        };
    }
}

/**
 * Vue 错误处理插件
 */
export class VueErrorPlugin implements Plugin {
    name = 'vueError';
    private core: Core | null = null;
    private vueInstance: any = null;

    constructor(vueInstance?: any) {
        if (vueInstance) {
            this.vueInstance = vueInstance;
        }
    }

    init(core: Core): void {
        this.core = core;
        
        if (this.vueInstance) {
            this.setupVueHandler(this.vueInstance);
        }
    }

    destroy(): void {
        this.core = null;
    }

    /**
     * 设置 Vue 错误处理器
     */
    private setupVueHandler(app: any): void {
        const originalErrorHandler = app.config.errorHandler;
        const core = this.core;

        app.config.errorHandler = (err: any, instance: any, info: string) => {
            const errorData: ErrorStatData = {
                type: 'vueError',
                time: Date.now(),
                url: location.href,
                sessionId: core!.getSessionId(),
                message: err?.message || String(err),
                stack: formatStack(err?.stack),
                componentName: instance?.$options?.name || info,
                extra: {
                    info,
                    props: instance?.$props,
                },
            };

            core?.report(errorData);

            // 调用原始错误处理器
            if (originalErrorHandler) {
                originalErrorHandler(err, instance, info);
            }
        };
    }
}

/**
 * React 错误边界包装器
 */
export class ReactErrorPlugin implements Plugin {
    name = 'reactError';
    private core: Core | null = null;

    init(core: Core): void {
        this.core = core;
    }

    destroy(): void {
        this.core = null;
    }

    /**
     * 创建 React 错误边界高阶组件
     */
    createErrorBoundary(React: any) {
        const core = this.core;
        
        return class XStatErrorBoundary extends React.Component {
            state = { hasError: false };

            static getDerivedStateFromError() {
                return { hasError: true };
            }

            componentDidCatch(error: Error, errorInfo: any) {
                const errorData: ErrorStatData = {
                    type: 'reactError',
                    time: Date.now(),
                    url: location.href,
                    sessionId: core!.getSessionId(),
                    message: error.message,
                    stack: formatStack(error.stack),
                    extra: {
                        componentStack: errorInfo.componentStack,
                    },
                };

                core?.report(errorData);
            }

            render() {
                if (this.state.hasError) {
                    return this.props.fallback || null;
                }
                return this.props.children;
            }
        };
    }
}
