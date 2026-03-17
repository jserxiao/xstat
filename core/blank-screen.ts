import type { Core } from './core';
import type { ErrorStatData, Plugin } from '../types';

/**
 * 白屏检测插件
 */
export class BlankScreenPlugin implements Plugin {
    name = 'blankScreen';
    private core: Core | null = null;
    private checkTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly CHECK_DELAY = 5000; // 5秒后检测

    init(core: Core): void {
        this.core = core;
        
        // 延迟检测，给页面足够时间渲染
        this.checkTimer = setTimeout(() => {
            this.checkBlankScreen();
        }, this.CHECK_DELAY);
    }

    destroy(): void {
        if (this.checkTimer) {
            clearTimeout(this.checkTimer);
        }
        this.core = null;
    }

    /**
     * 检测白屏
     */
    private checkBlankScreen(): void {
        // 检查根元素是否为空
        const html = document.documentElement;
        const body = document.body;

        if (!html || !body) {
            this.reportBlankScreen('no_root_element');
            return;
        }

        // 检查关键元素
        const hasContent = body.children.length > 0 || body.textContent?.trim().length! > 0;
        
        if (!hasContent) {
            this.reportBlankScreen('empty_body');
            return;
        }

        // 采样点检测
        const isBlank = this.checkSamplingPoints();
        
        if (isBlank) {
            this.reportBlankScreen('sampling_points_blank');
        }
    }

    /**
     * 采样点检测
     * 在页面不同位置采样，检查是否都是空白
     */
    private checkSamplingPoints(): boolean {
        const points = this.getSamplingPoints();
        let blankCount = 0;

        for (const point of points) {
            const element = document.elementFromPoint(point.x, point.y);
            
            if (!element || this.isRootElement(element)) {
                blankCount++;
            }
        }

        // 如果超过80%的采样点都是空白，认为是白屏
        return blankCount / points.length > 0.8;
    }

    /**
     * 获取采样点坐标
     */
    private getSamplingPoints(): Array<{ x: number; y: number }> {
        const points: Array<{ x: number; y: number }> = [];
        const width = window.innerWidth;
        const height = window.innerHeight;

        // 中心点
        points.push({ x: Math.floor(width / 2), y: Math.floor(height / 2) });
        
        // 九宫格采样
        for (let i = 1; i <= 3; i++) {
            for (let j = 1; j <= 3; j++) {
                points.push({
                    x: Math.floor((width * i) / 4),
                    y: Math.floor((height * j) / 4),
                });
            }
        }

        // 边缘采样
        points.push({ x: 10, y: 10 });
        points.push({ x: width - 10, y: 10 });
        points.push({ x: 10, y: height - 10 });
        points.push({ x: width - 10, y: height - 10 });

        return points;
    }

    /**
     * 检查是否为根元素
     */
    private isRootElement(element: Element): boolean {
        return element === document.documentElement || 
               element === document.body ||
               element.tagName === 'HTML' ||
               element.tagName === 'BODY';
    }

    /**
     * 上报白屏
     */
    private reportBlankScreen(reason: string): void {
        const errorData: ErrorStatData = {
            type: 'error',
            time: Date.now(),
            url: location.href,
            sessionId: this.core!.getSessionId(),
            message: `Blank screen detected: ${reason}`,
            extra: {
                reason,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                },
                bodyChildren: document.body?.children.length || 0,
                bodyTextLength: document.body?.textContent?.length || 0,
            },
        };

        this.core?.report(errorData);
    }
}
