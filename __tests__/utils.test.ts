import { describe, it, expect } from 'vitest';
import {
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
} from '../utils';

describe('Utils', () => {
    describe('generateId', () => {
        it('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
        });
    });

    describe('generateUUID', () => {
        it('should generate valid UUID format', () => {
            const uuid = generateUUID();
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        });
    });

    describe('getPageUrl', () => {
        it('should return current page URL', () => {
            const url = getPageUrl();
            expect(typeof url).toBe('string');
            expect(url).toContain('http');
        });

        it('should remove sensitive params', () => {
            // 模拟 URL 包含敏感参数
            const originalHref = window.location.href;
            Object.defineProperty(window, 'location', {
                value: {
                    href: 'https://example.com?token=secret&name=test',
                },
                writable: true,
            });
            
            const url = getPageUrl();
            expect(url).not.toContain('token');
            expect(url).not.toContain('secret');
            
            // 恢复
            Object.defineProperty(window, 'location', {
                value: { href: originalHref },
                writable: true,
            });
        });
    });

    describe('getXPath', () => {
        it('should return empty string for null', () => {
            expect(getXPath(null as any)).toBe('');
        });

        it('should return xpath for element', () => {
            const div = document.createElement('div');
            document.body.appendChild(div);
            const xpath = getXPath(div);
            expect(xpath).toContain('div');
            document.body.removeChild(div);
        });
    });

    describe('getSelector', () => {
        it('should return id selector', () => {
            const div = document.createElement('div');
            div.id = 'test-id';
            expect(getSelector(div)).toBe('#test-id');
        });

        it('should return class selector', () => {
            const div = document.createElement('div');
            div.className = 'test-class';
            expect(getSelector(div)).toBe('div.test-class');
        });

        it('should return tag selector', () => {
            const div = document.createElement('div');
            expect(getSelector(div)).toBe('div');
        });
    });

    describe('throttle', () => {
        it('should throttle function calls', () => {
            let count = 0;
            const fn = () => count++;
            const throttled = throttle(fn, 100);

            throttled();
            throttled();
            throttled();

            expect(count).toBe(1);
        });
    });

    describe('debounce', () => {
        it('should debounce function calls', async () => {
            let count = 0;
            const fn = () => count++;
            const debounced = debounce(fn, 50);

            debounced();
            debounced();
            debounced();

            expect(count).toBe(0);

            await new Promise(r => setTimeout(r, 100));
            expect(count).toBe(1);
        });
    });

    describe('deepMerge', () => {
        it('should merge objects deeply', () => {
            const target = { a: 1, b: { c: 2 } };
            const source = { b: { d: 3 }, e: 4 };
            const result = deepMerge(target, source);

            expect(result).toEqual({
                a: 1,
                b: { c: 2, d: 3 },
                e: 4,
            });
        });
    });

    describe('isSampled', () => {
        it('should return true for rate 1', () => {
            expect(isSampled(1)).toBe(true);
        });

        it('should return false for rate 0', () => {
            expect(isSampled(0)).toBe(false);
        });

        it('should return boolean for rate 0.5', () => {
            const result = isSampled(0.5);
            expect(typeof result).toBe('boolean');
        });
    });

    describe('maskData', () => {
        it('should not mask when disabled', () => {
            const data = { password: 'secret123' };
            const result = maskData(data, { enable: false });
            expect(result.password).toBe('secret123');
        });

        it('should mask sensitive fields', () => {
            const data = { password: 'secret123', name: 'John' };
            const result = maskData(data, { enable: true });
            expect(result.password).toBe('se****23');
        });

        it('should use custom mask function', () => {
            const data = { password: 'secret' };
            const result = maskData(data, {
                enable: true,
                maskFn: () => '***',
            });
            expect(result.password).toBe('***');
        });
    });
});
