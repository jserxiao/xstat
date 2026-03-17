import type { Core } from './core';
import type { HttpStatData, Plugin, RequestInfo, ResponseInfo } from '../types';

/**
 * HTTP 请求监控插件 - 劫持 XHR 和 Fetch
 */
export class HttpPlugin implements Plugin {
    name = 'http';
    private core: Core | null = null;
    private originalXHR: typeof XMLHttpRequest | null = null;
    private originalFetch: typeof fetch | null = null;

    init(core: Core): void {
        this.core = core;
        this.hijackXHR();
        this.hijackFetch();
    }

    destroy(): void {
        // 恢复原始方法
        if (this.originalXHR) {
            (window as any).XMLHttpRequest = this.originalXHR;
        }
        if (this.originalFetch) {
            window.fetch = this.originalFetch;
        }
        this.core = null;
    }

    /**
     * 劫持 XMLHttpRequest
     */
    private hijackXHR(): void {
        const core = this.core;
        const self = this;
        this.originalXHR = window.XMLHttpRequest;

        function XStatXMLHttpRequest(this: XMLHttpRequest) {
            const xhr = new (self.originalXHR as any)();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            const originalSetRequestHeader = xhr.setRequestHeader;

            let requestInfo: RequestInfo = { method: 'GET', url: '' };
            let startTime = 0;
            let requestHeaders: Record<string, string> = {};

            // 劫持 open 方法
            xhr.open = function(method: string, url: string | URL, ...args: any[]) {
                requestInfo = {
                    method: method.toUpperCase(),
                    url: typeof url === 'string' ? url : String(url),
                };
                return originalOpen.apply(this, [method, url, ...args]);
            };

            // 劫持 setRequestHeader
            xhr.setRequestHeader = function(header: string, value: string) {
                requestHeaders[header] = value;
                return originalSetRequestHeader.apply(this, [header, value]);
            };

            // 劫持 send 方法
            xhr.send = function(body?: any) {
                startTime = Date.now();
                requestInfo.body = body;
                requestInfo.headers = requestHeaders;

                // 监听加载完成
                const onLoadEnd = () => {
                    const duration = Date.now() - startTime;
                    
                    // 只监控慢请求或错误请求
                    const isSlow = duration > 3000;
                    const isError = xhr.status >= 400 || xhr.status === 0;

                    if (isSlow || isError) {
                        const responseInfo: ResponseInfo = {
                            status: xhr.status,
                            statusText: xhr.statusText,
                        };

                        // 尝试获取响应数据
                        try {
                            const responseText = xhr.responseText;
                            if (responseText) {
                                responseInfo.data = responseText.slice(0, 1000); // 限制大小
                            }
                        } catch {
                            // 忽略
                        }

                        const errorData: HttpStatData = {
                            type: 'httpError',
                            time: Date.now(),
                            url: location.href,
                            sessionId: core!.getSessionId(),
                            message: isError 
                                ? `HTTP ${xhr.status}: ${xhr.statusText}`
                                : `Slow request: ${duration}ms`,
                            request: requestInfo,
                            response: responseInfo,
                            duration,
                        };

                        core?.report(errorData);
                    }

                    xhr.removeEventListener('loadend', onLoadEnd);
                };

                xhr.addEventListener('loadend', onLoadEnd);

                return originalSend.apply(this, [body]);
            };

            return xhr;
        }

        // 复制原型链
        XStatXMLHttpRequest.prototype = (this.originalXHR as any).prototype;
        (window as any).XMLHttpRequest = XStatXMLHttpRequest as any;
    }

    /**
     * 劫持 Fetch
     */
    private hijackFetch(): void {
        const core = this.core;
        this.originalFetch = window.fetch;

        window.fetch = async (input: any, init?: RequestInit) => {
            const startTime = Date.now();
            
            let requestInfo: RequestInfo;
            
            if (typeof input === 'object' && 'method' in input && 'url' in input) {
                // Request 对象
                const req = input as Request;
                requestInfo = {
                    method: req.method,
                    url: req.url,
                };
            } else if (input instanceof URL) {
                requestInfo = {
                    method: init?.method || 'GET',
                    url: input.toString(),
                };
            } else {
                requestInfo = {
                    method: init?.method || 'GET',
                    url: String(input),
                };
            }

            requestInfo.headers = init?.headers as Record<string, string>;
            requestInfo.body = init?.body;

            try {
                const response = await (this.originalFetch as typeof fetch)(input, init);
                const duration = Date.now() - startTime;

                // 只监控慢请求或错误请求
                const isSlow = duration > 3000;
                const isError = !response.ok;

                if (isSlow || isError) {
                    const responseInfo: ResponseInfo = {
                        status: response.status,
                        statusText: response.statusText,
                    };

                    // 尝试克隆响应以读取数据
                    try {
                        const clonedResponse = response.clone();
                        const text = await clonedResponse.text();
                        responseInfo.data = text.slice(0, 1000);
                    } catch {
                        // 忽略
                    }

                    const errorData: HttpStatData = {
                        type: 'httpError',
                        time: Date.now(),
                        url: location.href,
                        sessionId: core!.getSessionId(),
                        message: isError 
                            ? `HTTP ${response.status}: ${response.statusText}`
                            : `Slow request: ${duration}ms`,
                        request: requestInfo,
                        response: responseInfo,
                        duration,
                    };

                    core?.report(errorData);
                }

                return response;
            } catch (error) {
                const duration = Date.now() - startTime;
                
                // 网络错误
                const errorData: HttpStatData = {
                    type: 'httpError',
                    time: Date.now(),
                    url: location.href,
                    sessionId: core!.getSessionId(),
                    message: error instanceof Error ? error.message : 'Network Error',
                    request: requestInfo,
                    duration,
                };

                core?.report(errorData);
                throw error;
            }
        };
    }
}
