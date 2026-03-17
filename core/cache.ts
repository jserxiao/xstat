import type { StatData } from '../types';

const DB_NAME = 'XStatDB';
const STORE_NAME = 'statData';
const DB_VERSION = 1;

/**
 * 数据缓存管理器 - 支持 localStorage 和 IndexedDB
 */
export class DataCache {
    private useIndexedDB: boolean;
    private db: IDBDatabase | null = null;
    private localStorageKey = 'xstat_data';
    private maxLocalStorageSize = 5 * 1024 * 1024; // 5MB

    constructor() {
        this.useIndexedDB = this.checkIndexedDBSupport();
        if (this.useIndexedDB) {
            this.initIndexedDB();
        }
    }

    /**
     * 检查是否支持 IndexedDB
     */
    private checkIndexedDBSupport(): boolean {
        return 'indexedDB' in window;
    }

    /**
     * 初始化 IndexedDB
     */
    private initIndexedDB(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                this.useIndexedDB = false;
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {
                        keyPath: 'id',
                        autoIncrement: true,
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    /**
     * 添加数据到缓存
     */
    async add(data: StatData[]): Promise<void> {
        if (this.useIndexedDB && this.db) {
            await this.addToIndexedDB(data);
        } else {
            this.addToLocalStorage(data);
        }
    }

    /**
     * 从缓存获取数据
     */
    async get(limit?: number): Promise<StatData[]> {
        if (this.useIndexedDB && this.db) {
            return this.getFromIndexedDB(limit);
        } else {
            return this.getFromLocalStorage(limit);
        }
    }

    /**
     * 清空缓存
     */
    async clear(): Promise<void> {
        if (this.useIndexedDB && this.db) {
            await this.clearIndexedDB();
        } else {
            this.clearLocalStorage();
        }
    }

    /**
     * 获取缓存大小
     */
    async size(): Promise<number> {
        if (this.useIndexedDB && this.db) {
            return this.getIndexedDBSize();
        } else {
            return this.getLocalStorageSize();
        }
    }

    // ==================== IndexedDB 操作 ====================

    private async addToIndexedDB(data: StatData[]): Promise<void> {
        if (!this.db) return;

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        for (const item of data) {
            store.add({
                data: item,
                timestamp: Date.now(),
            });
        }

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    private async getFromIndexedDB(limit?: number): Promise<StatData[]> {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const index = store.index('timestamp');
            const request = index.openCursor();

            const results: StatData[] = [];

            request.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result;
                if (cursor && (!limit || results.length < limit)) {
                    results.push(cursor.value.data);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    private async clearIndexedDB(): Promise<void> {
        if (!this.db) return;

        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();

        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    private async getIndexedDBSize(): Promise<number> {
        if (!this.db) return 0;

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ==================== LocalStorage 操作 ====================

    private addToLocalStorage(data: StatData[]): void {
        try {
            const existing = this.getFromLocalStorage();
            const combined = [...existing, ...data];
            
            // 检查大小限制
            const serialized = JSON.stringify(combined);
            if (serialized.length > this.maxLocalStorageSize) {
                // 超出限制，移除旧数据
                const toRemove = Math.ceil(data.length * 1.5);
                const trimmed = combined.slice(toRemove);
                localStorage.setItem(this.localStorageKey, JSON.stringify(trimmed));
            } else {
                localStorage.setItem(this.localStorageKey, serialized);
            }
        } catch (e) {
            // localStorage 可能已满
            console.warn('XStat: localStorage is full');
        }
    }

    private getFromLocalStorage(limit?: number): StatData[] {
        try {
            const data = localStorage.getItem(this.localStorageKey);
            if (!data) return [];
            
            const parsed = JSON.parse(data) as StatData[];
            return limit ? parsed.slice(0, limit) : parsed;
        } catch {
            return [];
        }
    }

    private clearLocalStorage(): void {
        localStorage.removeItem(this.localStorageKey);
    }

    private getLocalStorageSize(): number {
        try {
            const data = localStorage.getItem(this.localStorageKey);
            if (!data) return 0;
            return (JSON.parse(data) as StatData[]).length;
        } catch {
            return 0;
        }
    }
}
