import type { ConfigOption, StatData, Sender, RetryOptions } from '../types';
import { maskData } from '../utils';

/**
 * 数据发送器 - 支持 xhr / beacon / img 三种方式
 */
export class DataSender implements Sender {
    private config: ConfigOption;
    private retryQueue: Array<{ data: StatData[]; retries: number }> = [];
    private retryOptions: RetryOptions = {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
    };

    constructor(config: ConfigOption) {
        this.config = config;
    }

    /**
     * 发送数据
     */
    async send(data: StatData[]): Promise<boolean> {
        if (!data || data.length === 0) return true;

        // 数据脱敏
        const maskedData = this.config.privacy?.enable
            ? data.map(item => maskData(item, this.config.privacy) as StatData)
            : data;

        const payload = {
            appKey: this.config.appKey,
            appVersion: this.config.appVersion,
            env: this.config.env,
            data: maskedData,
            timestamp: Date.now(),
        };

        try {
            const success = await this.doSend(payload);
            if (success) {
                this.processRetryQueue();
            }
            return success;
        } catch (error) {
            // 发送失败，加入重试队列
            this.retryQueue.push({ data, retries: 0 });
            return false;
        }
    }

    /**
     * 执行发送
     */
    private async doSend(payload: any): Promise<boolean> {
        const sendType = this.config.sendType || 'xhr';

        switch (sendType) {
            case 'beacon':
                return this.sendByBeacon(payload);
            case 'img':
                return this.sendByImg(payload);
            case 'xhr':
            default:
                return this.sendByXHR(payload);
        }
    }

    /**
     * 使用 XMLHttpRequest 发送
     */
    private sendByXHR(payload: any): Promise<boolean> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', this.config.server, true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = () => {
                resolve(xhr.status >= 200 && xhr.status < 300);
            };

            xhr.onerror = () => resolve(false);
            xhr.ontimeout = () => resolve(false);

            xhr.timeout = (this.config.delay as any)?.timeout || 10000;
            xhr.send(JSON.stringify(payload));
        });
    }

    /**
     * 使用 sendBeacon 发送
     */
    private sendByBeacon(payload: any): Promise<boolean> {
        return new Promise((resolve) => {
            if (!navigator.sendBeacon) {
                // 不支持 beacon，降级到 xhr
                resolve(this.sendByXHR(payload));
                return;
            }

            const blob = new Blob([JSON.stringify(payload)], {
                type: 'application/json',
            });

            const success = navigator.sendBeacon(this.config.server, blob);
            resolve(success);
        });
    }

    /**
     * 使用 Image 发送（GET 方式，适合简单数据）
     */
    private sendByImg(payload: any): Promise<boolean> {
        return new Promise((resolve) => {
            const img = new Image();
            const params = encodeURIComponent(JSON.stringify(payload));
            
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            
            // 数据太长不适合用 img
            if (params.length > 2000) {
                resolve(this.sendByXHR(payload));
                return;
            }

            img.src = `${this.config.server}?data=${params}`;
        });
    }

    /**
     * 处理重试队列
     */
    private async processRetryQueue(): Promise<void> {
        if (this.retryQueue.length === 0) return;

        const item = this.retryQueue[0];
        
        if (item.retries >= this.retryOptions.maxRetries) {
            // 超过最大重试次数，移除
            this.retryQueue.shift();
            return;
        }

        const delay = this.retryOptions.retryDelay * 
            Math.pow(this.retryOptions.backoffMultiplier, item.retries);

        await new Promise(resolve => setTimeout(resolve, delay));

        item.retries++;
        
        try {
            const payload = {
                appKey: this.config.appKey,
                appVersion: this.config.appVersion,
                env: this.config.env,
                data: item.data,
                timestamp: Date.now(),
            };
            
            const success = await this.doSend(payload);
            if (success) {
                this.retryQueue.shift();
                this.processRetryQueue();
            }
        } catch {
            // 继续重试
        }
    }

    /**
     * 刷新重试队列（页面卸载前调用）
     */
    flush(): void {
        if (this.retryQueue.length === 0) return;

        // 使用 beacon 发送剩余数据
        const allData = this.retryQueue.flatMap(item => item.data);
        
        if (navigator.sendBeacon) {
            const payload = {
                appKey: this.config.appKey,
                appVersion: this.config.appVersion,
                env: this.config.env,
                data: allData,
                timestamp: Date.now(),
            };
            
            const blob = new Blob([JSON.stringify(payload)], {
                type: 'application/json',
            });
            navigator.sendBeacon(this.config.server, blob);
        }
    }
}
