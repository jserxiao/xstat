import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Core } from '../core/core';
import { ErrorPlugin } from '../core/error';

describe('Core', () => {
    let core: Core;

    beforeEach(() => {
        core = new Core();
    });

    describe('init', () => {
        it('should initialize with config', () => {
            const config = {
                server: 'https://test.com',
                appKey: 'test-key',
            };

            core.init(config);
            expect(core.config.server).toBe('https://test.com');
            expect(core.config.appKey).toBe('test-key');
        });

        it('should not initialize without server', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            core.init({ appKey: 'test' } as any);
            expect(consoleSpy).toHaveBeenCalledWith('XStat: server and appKey are required');
            consoleSpy.mockRestore();
        });

        it('should not initialize without appKey', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            core.init({ server: 'https://test.com' } as any);
            expect(consoleSpy).toHaveBeenCalledWith('XStat: server and appKey are required');
            consoleSpy.mockRestore();
        });
    });

    describe('use', () => {
        it('should register plugin', () => {
            core.init({ server: 'https://test.com', appKey: 'test' });
            
            const plugin = {
                name: 'test-plugin',
                init: vi.fn(),
            };

            core.use(plugin);
            expect(plugin.init).toHaveBeenCalledWith(core);
        });

        it('should not register plugin before init', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            const plugin = {
                name: 'test-plugin',
                init: vi.fn(),
            };

            core.use(plugin);
            expect(consoleSpy).toHaveBeenCalledWith('XStat: please call init() before use()');
            consoleSpy.mockRestore();
        });
    });

    describe('report', () => {
        it('should queue data', () => {
            core.init({ server: 'https://test.com', appKey: 'test' });
            
            core.report({
                type: 'error',
                time: Date.now(),
                url: 'https://test.com',
                sessionId: 'test-session',
                message: 'test error',
            });

            // 数据应该被加入队列
            expect(core['dataQueue'].length).toBe(1);
        });

        it('should not report when not initialized', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            core.report({
                type: 'error',
                time: Date.now(),
                url: 'https://test.com',
                sessionId: 'test-session',
                message: 'test error',
            });

            expect(consoleSpy).toHaveBeenCalledWith('XStat: not initialized');
            consoleSpy.mockRestore();
        });
    });

    describe('setUserId', () => {
        it('should set user id', () => {
            core.init({ server: 'https://test.com', appKey: 'test' });
            core.setUserId('user123');
            expect(core.getUserId()).toBe('user123');
        });
    });

    describe('getSessionId', () => {
        it('should return session id', () => {
            core.init({ server: 'https://test.com', appKey: 'test' });
            const sessionId = core.getSessionId();
            expect(typeof sessionId).toBe('string');
            expect(sessionId.length).toBeGreaterThan(0);
        });
    });

    describe('isSampled', () => {
        it('should respect sampling config', () => {
            core.init({
                server: 'https://test.com',
                appKey: 'test',
                sampling: { error: 0 },
            });

            expect(core.isSampled('error')).toBe(false);
        });

        it('should return true when no sampling config', () => {
            core.init({ server: 'https://test.com', appKey: 'test' });
            expect(core.isSampled('error')).toBe(true);
        });
    });

    describe('flush', () => {
        it('should clear queue after flush', () => {
            core.init({ server: 'https://test.com', appKey: 'test' });
            
            core.report({
                type: 'error',
                time: Date.now(),
                url: 'https://test.com',
                sessionId: 'test-session',
                message: 'test error',
            });

            expect(core['dataQueue'].length).toBe(1);
            core.flush();
            expect(core['dataQueue'].length).toBe(0);
        });
    });
});
