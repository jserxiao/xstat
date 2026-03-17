import type { Core } from './core';
import type { PerformanceStatData, Plugin, WebVitalsMetric } from '../types';

/**
 * 性能监控插件 - Web Vitals + Resource Timing + Navigation Timing
 */
export class PerformancePlugin implements Plugin {
    name = 'performance';
    private core: Core | null = null;
    private observers: (PerformanceObserver | MutationObserver)[] = [];
    private metrics: Map<string, number> = new Map();

    init(core: Core): void {
        this.core = core;
        
        // 延迟执行，确保页面基本加载完成
        if (document.readyState === 'complete') {
            this.startMonitoring();
        } else {
            window.addEventListener('load', () => this.startMonitoring());
        }
    }

    destroy(): void {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        this.core = null;
    }

    private startMonitoring(): void {
        this.observeWebVitals();
        this.observeResourceTiming();
        this.observeNavigationTiming();
        this.observeLongTasks();
    }

    // ==================== Web Vitals ====================

    private observeWebVitals(): void {
        // LCP - Largest Contentful Paint
        this.observeLCP();
        
        // FID - First Input Delay (或 INP - Interaction to Next Paint)
        this.observeFID();
        
        // CLS - Cumulative Layout Shift
        this.observeCLS();
        
        // FCP - First Contentful Paint
        this.observeFCP();
        
        // TTFB - Time to First Byte
        this.observeTTFB();
    }

    private observeLCP(): void {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as PerformanceEntry & { renderTime: number; loadTime: number };
            
            const value = lastEntry.renderTime || lastEntry.loadTime;
            this.metrics.set('LCP', value);

            this.reportWebVital({
                name: 'LCP',
                value,
                rating: this.getLCPRating(value),
                entries,
            });
        });

        try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(observer);
        } catch {
            // 浏览器不支持
        }
    }

    private observeFID(): void {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstEntry = entries[0] as PerformanceEntry & { processingStart: number; startTime: number };
            
            const value = firstEntry.processingStart - firstEntry.startTime;
            this.metrics.set('FID', value);

            this.reportWebVital({
                name: 'FID',
                value,
                rating: this.getFIDRating(value),
                entries,
            });
        });

        try {
            observer.observe({ entryTypes: ['first-input'] });
            this.observers.push(observer);
        } catch {
            // 浏览器不支持
        }
    }

    private observeCLS(): void {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        let clsEntries: PerformanceEntry[] = [];

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
                if (!layoutShift.hadRecentInput) {
                    clsValue += layoutShift.value;
                    clsEntries.push(entry);
                }
            }

            this.metrics.set('CLS', clsValue);
        });

        try {
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(observer);

            // 页面卸载前上报 CLS
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden' && clsValue > 0) {
                    this.reportWebVital({
                        name: 'CLS',
                        value: clsValue,
                        rating: this.getCLSRating(clsValue),
                        entries: clsEntries,
                    });
                }
            });
        } catch {
            // 浏览器不支持
        }
    }

    private observeFCP(): void {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const firstEntry = entries[0] as PerformanceEntry & { startTime: number };
            
            const value = firstEntry.startTime;
            this.metrics.set('FCP', value);

            this.reportWebVital({
                name: 'FCP',
                value,
                rating: this.getFCPRating(value),
                entries,
            });
        });

        try {
            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        } catch {
            // 浏览器不支持
        }
    }

    private observeTTFB(): void {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
            const value = navigation.responseStart - navigation.startTime;
            this.metrics.set('TTFB', value);

            this.reportWebVital({
                name: 'TTFB',
                value,
                rating: this.getTTFBRating(value),
                entries: [navigation],
            });
        }
    }

    private reportWebVital(metric: WebVitalsMetric): void {
        const data: PerformanceStatData = {
            type: 'webVitals',
            time: Date.now(),
            url: location.href,
            sessionId: this.core!.getSessionId(),
            name: metric.name,
            value: Math.round(metric.value * 1000) / 1000,
            rating: metric.rating,
            detail: {
                entries: metric.entries.map(e => ({
                    name: e.name,
                    startTime: e.startTime,
                    duration: e.duration,
                })),
            },
        };

        this.core?.report(data);
    }

    // ==================== Resource Timing ====================

    private observeResourceTiming(): void {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries() as PerformanceResourceTiming[];
            
            // 只监控慢资源 (>1s)
            const slowResources = entries.filter(entry => {
                const duration = entry.duration;
                return duration > 1000;
            });

            if (slowResources.length > 0) {
                slowResources.forEach(entry => {
                    const data: PerformanceStatData = {
                        type: 'resource',
                        time: Date.now(),
                        url: location.href,
                        sessionId: this.core!.getSessionId(),
                        name: 'slowResource',
                        value: Math.round(entry.duration),
                        detail: {
                            resourceUrl: entry.name,
                            initiatorType: entry.initiatorType,
                            transferSize: entry.transferSize,
                            dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
                            tcpTime: entry.connectEnd - entry.connectStart,
                            responseTime: entry.responseEnd - entry.responseStart,
                        },
                    };

                    this.core?.report(data);
                });
            }
        });

        try {
            observer.observe({ entryTypes: ['resource'] });
            this.observers.push(observer);
        } catch {
            // 浏览器不支持
        }
    }

    // ==================== Navigation Timing ====================

    private observeNavigationTiming(): void {
        const sendNavigationTiming = () => {
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            
            if (!navigation) return;

            const timing = {
                dnsTime: navigation.domainLookupEnd - navigation.domainLookupStart,
                tcpTime: navigation.connectEnd - navigation.connectStart,
                sslTime: navigation.secureConnectionStart > 0 
                    ? navigation.connectEnd - navigation.secureConnectionStart 
                    : 0,
                ttfb: navigation.responseStart - navigation.startTime,
                responseTime: navigation.responseEnd - navigation.responseStart,
                domParseTime: navigation.domInteractive - navigation.responseEnd,
                domReadyTime: navigation.domContentLoadedEventEnd - navigation.startTime,
                loadTime: navigation.loadEventEnd - navigation.startTime,
            };

            const data: PerformanceStatData = {
                type: 'navigation',
                time: Date.now(),
                url: location.href,
                sessionId: this.core!.getSessionId(),
                name: 'pageLoad',
                value: Math.round(timing.loadTime),
                detail: timing,
            };

            this.core?.report(data);
        };

        if (document.readyState === 'complete') {
            sendNavigationTiming();
        } else {
            window.addEventListener('load', () => {
                // 延迟确保所有数据已收集
                setTimeout(sendNavigationTiming, 0);
            });
        }
    }

    // ==================== Long Tasks ====================

    private observeLongTasks(): void {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            
            entries.forEach(entry => {
                const data: PerformanceStatData = {
                    type: 'performance',
                    time: Date.now(),
                    url: location.href,
                    sessionId: this.core!.getSessionId(),
                    name: 'longTask',
                    value: Math.round(entry.duration),
                    detail: {
                        startTime: entry.startTime,
                        duration: entry.duration,
                        attribution: (entry as any).attribution?.map((a: any) => ({
                            type: a.type,
                            containerName: a.containerName,
                        })),
                    },
                };

                this.core?.report(data);
            });
        });

        try {
            observer.observe({ entryTypes: ['longtask'] });
            this.observers.push(observer);
        } catch {
            // 浏览器不支持
        }
    }

    // ==================== 评级标准 ====================

    private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
        if (value <= 2500) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
    }

    private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
    }

    private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
    }

    private getFCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
        if (value <= 1800) return 'good';
        if (value <= 3000) return 'needs-improvement';
        return 'poor';
    }

    private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
        if (value <= 800) return 'good';
        if (value <= 1800) return 'needs-improvement';
        return 'poor';
    }
}
