/**
 * Auth Manager - إدارة المصادقة والأمان
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.token = null;
        this.refreshToken = null;
        this.init();
    }

    init() {
        // التحقق من الجلسة عند تحميل الصفحة
        this.checkSession();
        
        // إعداد مراقبة انتهاء الجلسة
        this.setupSessionMonitor();
    }

    // تسجيل الدخول
    async login(credentials) {
        try {
            // محاكاة طلب API
            const response = await this.simulateAuthRequest('/auth/login', credentials);
            
            if (response.success) {
                this.setSession(response.user, response.token, response.refreshToken);
                this.showNotification('تم تسجيل الدخول بنجاح', 'success');
                return { success: true, user: response.user };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // التسجيل
    async register(userData) {
        try {
            const response = await this.simulateAuthRequest('/auth/register', userData);
            
            if (response.success) {
                this.showNotification('تم إنشاء الحساب بنجاح', 'success');
                return { success: true };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // تسجيل الدخول الاجتماعي
    async socialLogin(provider) {
        const providers = {
            google: this.loginWithGoogle.bind(this),
            apple: this.loginWithApple.bind(this),
            github: this.loginWithGitHub.bind(this)
        };

        if (providers[provider]) {
            return await providers[provider]();
        }
    }

    async loginWithGoogle() {
        // محاكاة
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    id: 'google_' + Date.now(),
                    name: 'Google User',
                    email: 'user@gmail.com',
                    avatar: 'https://i.pravatar.cc/150?img=60',
                    provider: 'google'
                };
                this.setSession(mockUser, 'mock_token', 'mock_refresh');
                resolve({ success: true, user: mockUser });
            }, 1000);
        });
    }

    async loginWithApple() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    id: 'apple_' + Date.now(),
                    name: 'Apple User',
                    email: 'user@icloud.com',
                    avatar: 'https://i.pravatar.cc/150?img=61',
                    provider: 'apple'
                };
                this.setSession(mockUser, 'mock_token', 'mock_refresh');
                resolve({ success: true, user: mockUser });
            }, 1000);
        });
    }

    async loginWithGitHub() {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    id: 'github_' + Date.now(),
                    name: 'GitHub User',
                    email: 'user@github.com',
                    avatar: 'https://i.pravatar.cc/150?img=62',
                    provider: 'github'
                };
                this.setSession(mockUser, 'mock_token', 'mock_refresh');
                resolve({ success: true, user: mockUser });
            }, 1000);
        });
    }

    // تعيين الجلسة
    setSession(user, token, refreshToken) {
        this.currentUser = user;
        this.token = token;
        this.refreshToken = refreshToken;

        // حفظ في التخزين الآمن
        StorageManager.setLocal('user', user);
        StorageManager.setLocal('token', token);
        StorageManager.setLocal('refreshToken', refreshToken);
        StorageManager.setLocal('loginTime', Date.now());

        // تشفير البيانات الحساسة
        this.encryptSensitiveData();
    }

    // التحقق من الجلسة
    checkSession() {
        const user = StorageManager.getLocal('user');
        const token = StorageManager.getLocal('token');
        const loginTime = StorageManager.getLocal('loginTime');

        if (!user || !token) {
            return false;
        }

        // التحقق من انتهاء الصلاحية (24 ساعة)
        const sessionDuration = 24 * 60 * 60 * 1000;
        if (Date.now() - loginTime > sessionDuration) {
            this.logout();
            return false;
        }

        this.currentUser = user;
        this.token = token;
        return true;
    }

    // تجديد التوكن
    async refreshToken() {
        try {
            const response = await this.simulateAuthRequest('/auth/refresh', {
                refreshToken: this.refreshToken
            });

            if (response.success) {
                this.token = response.token;
                StorageManager.setLocal('token', response.token);
                return true;
            }
        } catch (error) {
            this.logout();
            return false;
        }
    }

    // تسجيل الخروج
    logout() {
        // مسح البيانات
        this.currentUser = null;
        this.token = null;
        this.refreshToken = null;

        // مسح التخزين
        StorageManager.removeLocal('user');
        StorageManager.removeLocal('token');
        StorageManager.removeLocal('refreshToken');
        StorageManager.removeLocal('loginTime');

        // إعادة التوجيه
        window.location.href = 'login.html';
    }

    // تغيير كلمة المرور
    async changePassword(oldPassword, newPassword) {
        try {
            const response = await this.simulateAuthRequest('/auth/change-password', {
                oldPassword,
                newPassword
            });

            return response.success;
        } catch (error) {
            return false;
        }
    }

    // إعادة تعيين كلمة المرور
    async resetPassword(email) {
        try {
            const response = await this.simulateAuthRequest('/auth/reset-password', { email });
            return response.success;
        } catch (error) {
            return false;
        }
    }

    // التحقق بخطوتين
    async setup2FA() {
        // إنشاء QR code
        const secret = this.generateSecret();
        const qrCode = await this.generateQRCode(secret);
        
        return {
            secret,
            qrCode,
            backupCodes: this.generateBackupCodes()
        };
    }

    verify2FA(code) {
        // التحقق من الرمز
        return this.verifyToken(code);
    }

    // تشفير البيانات
    encryptSensitiveData() {
        // يمكن استخدام Web Crypto API هنا
        if (window.crypto && window.crypto.subtle) {
            // تشفير البيانات الحساسة
        }
    }

    // مراقبة الجلسة
    setupSessionMonitor() {
        // التحقق كل 5 دقائق
        setInterval(() => {
            this.checkSession();
        }, 5 * 60 * 1000);

        // مراقبة النشاط
        let inactivityTimer;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                // تسجيل الخروج بعد 30 دقيقة من عدم النشاط
                if (StorageManager.getLocal('autoLogout')) {
                    this.logout();
                }
            }, 30 * 60 * 1000);
        };

        ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(event => {
            document.addEventListener(event, resetTimer);
        });
    }

    // محاكاة طلب API
    simulateAuthRequest(endpoint, data) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // محاكاة نجاح
                if (data.email && data.password && data.password.length >= 6) {
                    resolve({
                        success: true,
                        user: {
                            id: Date.now(),
                            name: data.email.split('@')[0],
                            email: data.email,
                            avatar: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`
                        },
                        token: 'mock_jwt_token_' + Date.now(),
                        refreshToken: 'mock_refresh_token_' + Date.now()
                    });
                } else {
                    reject(new Error('بيانات الاعتماد غير صحيحة'));
                }
            }, 800);
        });
    }

    // أدوات مساعدة
    generateSecret() {
        return Math.random().toString(36).substring(2, 15);
    }

    generateBackupCodes() {
        return Array.from({ length: 10 }, () => 
            Math.random().toString(36).substring(2, 8).toUpperCase()
        );
    }

    verifyToken(token) {
        return token.length === 6 && /^\d+$/.test(token);
    }

    async generateQRCode(secret) {
        // يمكن استخدام مكتبة QRCode.js
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${secret}`;
    }

    showNotification(message, type) {
        if (window.app && window.app.showNotification) {
            window.app.showNotification('مصادقة', message, type);
        }
    }

    // الحصول على المستخدم الحالي
    getCurrentUser() {
        return this.currentUser || StorageManager.getLocal('user');
    }

    // التحقق من الصلاحيات
    hasPermission(permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const permissions = user.permissions || [];
        return permissions.includes(permission) || user.role === 'admin';
    }

    // تحديث الملف الشخصي
    async updateProfile(updates) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const updatedUser = { ...user, ...updates };
        this.currentUser = updatedUser;
        StorageManager.setLocal('user', updatedUser);

        return true;
    }
}

// تصدير
window.AuthManager = AuthManager;
