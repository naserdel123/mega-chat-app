/**
 * Storage Manager - إدارة التخزين المحلي والجلسات
 */

class StorageManager {
    constructor() {
        this.dbName = 'MegaChatDB';
        this.dbVersion = 1;
        this.db = null;
        this.initIndexedDB();
    }

    // IndexedDB للملفات الكبيرة
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // مخزن المحادثات
                if (!db.objectStoreNames.contains('conversations')) {
                    const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
                    convStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // مخزن الرسائل
                if (!db.objectStoreNames.contains('messages')) {
                    const msgStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                    msgStore.createIndex('conversationId', 'conversationId', { unique: false });
                    msgStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                
                // مخزن الملفات
                if (!db.objectStoreNames.contains('files')) {
                    const fileStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
                    fileStore.createIndex('messageId', 'messageId', { unique: false });
                }
            };
        });
    }

    // LocalStorage للبيانات الصغيرة
    static setLocal(key, value) {
        try {
            localStorage.setItem(`megachat_${key}`, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('LocalStorage error:', e);
            return false;
        }
    }

    static getLocal(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(`megachat_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            return defaultValue;
        }
    }

    static removeLocal(key) {
        localStorage.removeItem(`megachat_${key}`);
    }

    // SessionStorage للجلسة المؤقتة
    static setSession(key, value) {
        sessionStorage.setItem(`megachat_${key}`, JSON.stringify(value));
    }

    static getSession(key) {
        const item = sessionStorage.getItem(`megachat_${key}`);
        return item ? JSON.parse(item) : null;
    }

    // IndexedDB operations
    async saveConversation(conversation) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const request = store.put(conversation);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getConversations() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveMessage(message) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            const request = store.add(message);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getMessages(conversationId, limit = 50, offset = 0) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const index = store.index('conversationId');
            const request = index.getAll(IDBKeyRange.only(conversationId));
            
            request.onsuccess = () => {
                const messages = request.result
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(offset, offset + limit);
                resolve(messages);
            };
            request.onerror = () => reject(request.error);
        });
    }

    // تخزين مؤقت للملفات (Cache API)
    async cacheFile(key, file) {
        const cache = await caches.open('megachat-files');
        const response = new Response(file);
        await cache.put(key, response);
    }

    async getCachedFile(key) {
        const cache = await caches.open('megachat-files');
        const response = await cache.match(key);
        return response ? await response.blob() : null;
    }

    // التخزين المتقدم مع ضغط
    async compressAndStore(key, data) {
        const jsonString = JSON.stringify(data);
        const compressed = await this.compress(jsonString);
        localStorage.setItem(`megachat_compressed_${key}`, compressed);
    }

    async retrieveAndDecompress(key) {
        const compressed = localStorage.getItem(`megachat_compressed_${key}`);
        if (!compressed) return null;
        const decompressed = await this.decompress(compressed);
        return JSON.parse(decompressed);
    }

    compress(string) {
        // محاكاة الضغط - في الواقع يمكن استخدام pako.js
        return btoa(string);
    }

    decompress(string) {
        return atob(string);
    }

    // مزامنة مع الخادم (محاكاة)
    async syncWithServer() {
        const lastSync = StorageManager.getLocal('lastSync', 0);
        const pending = StorageManager.getLocal('pendingMessages', []);
        
        // هنا يتم إرسال البيانات للخادم
        console.log('Syncing with server...', { lastSync, pendingCount: pending.length });
        
        StorageManager.setLocal('lastSync', Date.now());
        StorageManager.setLocal('pendingMessages', []);
        
        return true;
    }

    // النسخ الاحتياطي
    async createBackup() {
        const data = {
            conversations: await this.getConversations(),
            user: StorageManager.getLocal('user'),
            settings: StorageManager.getLocal('settings'),
            timestamp: Date.now()
        };
        
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `megachat_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    // استعادة النسخة الاحتياطية
    async restoreBackup(file) {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // استعادة البيانات
        if (data.conversations) {
            for (const conv of data.conversations) {
                await this.saveConversation(conv);
            }
        }
        
        if (data.user) StorageManager.setLocal('user', data.user);
        if (data.settings) StorageManager.setLocal('settings', data.settings);
        
        return true;
    }

    // تنظيف البيانات القديمة
    async cleanup() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        // حذف الرسائل القديمة
        const transaction = this.db.transaction(['messages'], 'readwrite');
        const store = transaction.objectStore('messages');
        const index = store.index('timestamp');
        const range = IDBKeyRange.upperBound(thirtyDaysAgo);
        
        const request = index.openCursor(range);
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                store.delete(cursor.primaryKey);
                cursor.continue();
            }
        };
    }
}

// تصدير
window.StorageManager = StorageManager;
