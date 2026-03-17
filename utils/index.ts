import type { PrivacyOptions } from '../types';

/**
 * 生成唯一ID
 */
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 生成UUID
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * 获取页面URL（去除敏感参数）
 */
export function getPageUrl(): string {
    try {
        const url = new URL(location.href);
        // 移除常见敏感参数
        const sensitiveParams = ['token', 'password', 'secret', 'api_key', 'apikey'];
        sensitiveParams.forEach(param => url.searchParams.delete(param));
        return url.toString();
    } catch {
        return location.href;
    }
}

/**
 * 获取XPath路径
 */
export function getXPath(element: Element): string {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }
    
    const parts: string[] = [];
    let current: Element | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let sibling = current.previousElementSibling;
        
        while (sibling) {
            if (sibling.tagName === current.tagName) {
                index++;
            }
            sibling = sibling.previousElementSibling;
        }
        
        const tagName = current.tagName.toLowerCase();
        const part = index > 1 ? `${tagName}[${index}]` : tagName;
        parts.unshift(part);
        
        current = current.parentElement;
    }
    
    return '/' + parts.join('/');
}

/**
 * 获取元素选择器
 */
export function getSelector(element: Element): string {
    if (!element) return '';
    
    if (element.id) {
        return `#${element.id}`;
    }
    
    if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c).join('.');
        if (classes) {
            return `${element.tagName.toLowerCase()}.${classes}`;
        }
    }
    
    return element.tagName.toLowerCase();
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastTime = 0;
    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastTime >= delay) {
            lastTime = now;
            fn.apply(null, args);
        }
    };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<T>) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(null, args);
        }, delay);
    };
}

/**
 * 深度合并对象
 */
export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result: any = { ...target };
    
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];
            
            if (isObject(sourceValue) && isObject(targetValue)) {
                result[key] = deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue;
            }
        }
    }
    
    return result as T;
}

function isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 判断是否命中采样
 */
export function isSampled(rate: number): boolean {
    if (rate >= 1) return true;
    if (rate <= 0) return false;
    return Math.random() < rate;
}

/**
 * 数据脱敏
 */
export function maskData(data: any, options?: PrivacyOptions): any {
    if (!options?.enable) return data;
    
    const maskFn = options.maskFn || defaultMaskFn;
    const fields = options.fields || defaultSensitiveFields;
    
    return maskObject(data, fields, maskFn);
}

const defaultSensitiveFields = [
    'password', 'passwd', 'pwd', 'token', 'secret', 'apiKey', 'api_key',
    'phone', 'mobile', 'tel', 'email', 'idCard', 'id_card', 'creditCard',
    'credit_card', 'cardNo', 'card_no', 'ssn', 'name'
];

function defaultMaskFn(value: string): string {
    if (typeof value !== 'string') return value;
    if (value.length <= 4) return '****';
    return value.slice(0, 2) + '****' + value.slice(-2);
}

function maskObject(obj: any, fields: string[], maskFn: (v: string) => string): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => maskObject(item, fields, maskFn));
    }
    
    const result: any = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            const shouldMask = fields.some(field => 
                key.toLowerCase().includes(field.toLowerCase())
            );
            
            if (shouldMask && typeof value === 'string') {
                result[key] = maskFn(value);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = maskObject(value, fields, maskFn);
            } else {
                result[key] = value;
            }
        }
    }
    
    return result;
}

/**
 * 获取设备信息
 */
export function getDeviceInfo(): Record<string, any> {
    const ua = navigator.userAgent;
    
    return {
        userAgent: ua,
        screenWidth: screen.width,
        screenHeight: screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        language: navigator.language,
        platform: navigator.platform,
        connection: (navigator as any).connection ? {
            effectiveType: (navigator as any).connection.effectiveType,
            downlink: (navigator as any).connection.downlink,
        } : undefined,
    };
}

/**
 * 安全地执行函数
 */
export function safeExec<T>(fn: () => T, defaultValue?: T): T | undefined {
    try {
        return fn();
    } catch (e) {
        return defaultValue;
    }
}

/**
 * 格式化错误堆栈
 */
export function formatStack(stack?: string): string {
    if (!stack) return '';
    
    return stack
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .slice(0, 10) // 只保留前10行
        .join('\n');
}

/**
 * 判断是否为白屏
 */
export function isWhiteScreen(): boolean {
    const root = document.documentElement;
    const body = document.body;
    
    if (!root || !body) return true;
    
    // 检查关键元素是否存在
    const hasContent = body.children.length > 0 || body.textContent?.trim().length! > 0;
    
    return !hasContent;
}
