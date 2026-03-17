import type { Core } from './core';
import type { BehaviorStatData, Plugin, ElementInfo } from '../types';
import { throttle, getXPath, getSelector } from '../utils';

/**
 * 用户行为监控插件 - 点击、滚动、停留时长、PV
 */
export class BehaviorPlugin implements Plugin {
    name = 'behavior';
    private core: Core | null = null;
    private pageStartTime = Date.now();
    private maxScrollDepth = 0;
    private clickCount = 0;
    private unlistenRoute: (() => void) | null = null;

    init(core: Core): void {
        this.core = core;
        
        this.trackPV();
        this.trackClick();
        this.trackScroll();
        this.trackStayTime();
        this.trackRouteChange();
    }

    destroy(): void {
        this.unlistenRoute?.();
        this.reportStayTime();
        this.core = null;
    }

    // ==================== PV 统计 ====================

    private trackPV(): void {
        // 增加页面浏览计数
        this.core?.getSessionInfo()?.pageViews;
        
        const data: BehaviorStatData = {
            type: 'pv',
            time: Date.now(),
            url: location.href,
            sessionId: this.core!.getSessionId(),
            eventName: 'pageView',
            data: {
                referrer: document.referrer,
                title: document.title,
            },
        };

        this.core?.report(data);
    }

    // ==================== 点击追踪 ====================

    private trackClick(): void {
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            this.clickCount++;

            const elementInfo = this.getElementInfo(target);
            
            const data: BehaviorStatData = {
                type: 'click',
                time: Date.now(),
                url: location.href,
                sessionId: this.core!.getSessionId(),
                eventName: 'click',
                target: elementInfo,
                data: {
                    x: e.clientX,
                    y: e.clientY,
                    pageX: e.pageX,
                    pageY: e.pageY,
                },
            };

            this.core?.report(data);
        };

        // 使用节流，避免高频点击
        document.addEventListener('click', throttle(handleClick, 100));
    }

    // ==================== 滚动深度 ====================

    private trackScroll(): void {
        const handleScroll = () => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

            if (scrollPercent > this.maxScrollDepth) {
                this.maxScrollDepth = scrollPercent;
            }
        };

        window.addEventListener('scroll', throttle(handleScroll, 500));
    }

    // ==================== 停留时长 ====================

    private trackStayTime(): void {
        // 页面卸载时上报
        window.addEventListener('beforeunload', () => {
            this.reportStayTime();
        });

        // 页面可见性变化时处理
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.reportStayTime();
            } else {
                // 页面重新可见，重置开始时间
                this.pageStartTime = Date.now();
            }
        });
    }

    private reportStayTime(): void {
        const stayTime = Date.now() - this.pageStartTime;
        
        const data: BehaviorStatData = {
            type: 'stay',
            time: Date.now(),
            url: location.href,
            sessionId: this.core!.getSessionId(),
            eventName: 'pageStay',
            data: {
                duration: stayTime,
                maxScrollDepth: this.maxScrollDepth,
                clickCount: this.clickCount,
            },
        };

        this.core?.report(data);
    }

    // ==================== 路由变化监听 ====================

    private trackRouteChange(): void {
        const core = this.core;
        
        // 保存原始方法
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        // 重写 pushState
        history.pushState = function(...args) {
            const result = originalPushState.apply(this, args);
            handleRouteChange('pushState');
            return result;
        };

        // 重写 replaceState
        history.replaceState = function(...args) {
            const result = originalReplaceState.apply(this, args);
            handleRouteChange('replaceState');
            return result;
        };

        // 监听 popstate（后退/前进）
        window.addEventListener('popstate', () => {
            handleRouteChange('popstate');
        });

        // 监听 hashchange
        window.addEventListener('hashchange', () => {
            handleRouteChange('hashchange');
        });

        const handleRouteChange = (trigger: string) => {
            // 上报上一个页面的停留时长
            this.reportStayTime();
            
            // 重置统计
            this.pageStartTime = Date.now();
            this.maxScrollDepth = 0;
            this.clickCount = 0;

            // 上报新的 PV
            const data: BehaviorStatData = {
                type: 'pv',
                time: Date.now(),
                url: location.href,
                sessionId: core!.getSessionId(),
                eventName: 'pageView',
                data: {
                    trigger,
                    referrer: document.referrer,
                    title: document.title,
                },
            };

            core?.report(data);
        };

        // 恢复方法
        this.unlistenRoute = () => {
            history.pushState = originalPushState;
            history.replaceState = originalReplaceState;
        };
    }

    // ==================== 自定义埋点 API ====================

    /**
     * 手动埋点
     */
    track(eventName: string, data?: any): void {
        const trackData: BehaviorStatData = {
            type: 'custom',
            time: Date.now(),
            url: location.href,
            sessionId: this.core!.getSessionId(),
            eventName,
            data,
        };

        this.core?.report(trackData);
    }

    // ==================== 辅助方法 ====================

    private getElementInfo(element: HTMLElement): ElementInfo {
        return {
            tagName: element.tagName,
            id: element.id || undefined,
            className: element.className || undefined,
            text: this.getElementText(element),
            xpath: getXPath(element),
            selector: getSelector(element),
        };
    }

    private getElementText(element: HTMLElement): string {
        const text = element.textContent || element.innerText || '';
        return text.trim().slice(0, 100); // 限制长度
    }
}
