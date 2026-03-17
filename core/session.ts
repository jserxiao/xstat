import { generateUUID } from '../utils';
import type { SessionInfo } from '../types';

const SESSION_KEY = 'xstat_session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟超时

/**
 * 会话管理器
 */
export class SessionManager {
    private session: SessionInfo | null = null;

    constructor() {
        this.initSession();
    }

    /**
     * 初始化会话
     */
    private initSession(): void {
        const stored = sessionStorage.getItem(SESSION_KEY);
        const now = Date.now();

        if (stored) {
            try {
                const parsed = JSON.parse(stored) as SessionInfo;
                
                // 检查会话是否超时
                if (now - parsed.lastActiveTime < SESSION_TIMEOUT) {
                    this.session = {
                        ...parsed,
                        lastActiveTime: now,
                    };
                    this.saveSession();
                    return;
                }
            } catch {
                // 解析失败，创建新会话
            }
        }

        // 创建新会话
        this.session = {
            id: generateUUID(),
            startTime: now,
            lastActiveTime: now,
            pageViews: 0,
        };
        this.saveSession();
    }

    /**
     * 获取会话ID
     */
    getSessionId(): string {
        if (!this.session) {
            this.initSession();
        }
        return this.session!.id;
    }

    /**
     * 获取会话信息
     */
    getSessionInfo(): SessionInfo {
        if (!this.session) {
            this.initSession();
        }
        return { ...this.session! };
    }

    /**
     * 更新活跃时间
     */
    updateActiveTime(): void {
        if (this.session) {
            this.session.lastActiveTime = Date.now();
            this.saveSession();
        }
    }

    /**
     * 增加页面浏览数
     */
    incrementPageView(): void {
        if (this.session) {
            this.session.pageViews++;
            this.session.lastActiveTime = Date.now();
            this.saveSession();
        }
    }

    /**
     * 保存会话到 storage
     */
    private saveSession(): void {
        if (this.session) {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
        }
    }

    /**
     * 结束会话
     */
    endSession(): void {
        this.session = null;
        sessionStorage.removeItem(SESSION_KEY);
    }
}
