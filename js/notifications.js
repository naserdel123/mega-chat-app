/**
 * Notification Manager - إدارة الإشعارات المتقدمة
 */

class NotificationManager {
    constructor() {
        this.permission = false;
        this.soundEnabled = true;
        this.vibrationEnabled = true;
        this.notifications = [];
        this.init();
    }

    async init() {
        // طلب إذن الإشعارات
        if ('Notification' in window) {
            this.permission = await this.requestPermission();
        }

        // إعداد Service Worker للإشعارات
        if ('serviceWorker' in navigator) {
            this.setupServiceWorker();
        }
    }

    async requestPermission() {
        if (!('Notification' in window)) return false;
        
        if (Notification.permission === 'granted') {
            return true;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    setupServiceWorker() {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('Service Worker registered:', registration);
        }).catch(error => {
            console.log('Service Worker registration failed:', error);
        });
    }

    // إظهار إشعار نظام
    async showSystemNotification(options) {
        if (!this.permission) return;

        const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/assets/icon-192x192.png',
            badge: '/assets/badge-72x72.png',
            tag: options.tag || Date.now(),
            requireInteraction: options.requireInteraction || false,
            actions: options.actions || [],
            data: options.data || {}
        });

        notification.onclick = () => {
            window.focus();
            if (options.onClick) options.onClick();
            notification.close();
        };

        this.notifications.push(notification);
    }

    // إشعار داخل التطبيق
    showInAppNotification(options) {
        const container = document.getElementById('notificationsContainer') || this.createContainer();
        
        const notification = document.createElement('div');
        notification.className = `in-app-notification ${options.type || 'info'}`;
        notification.innerHTML = `
            <div class="notification-avatar">
                ${options.avatar ? `<img src="${options.avatar}" alt="">` : `<i class="fas fa-bell"></i>`}
            </div>
            <div class="notification-content">
                <div class="notification-title">${options.title}</div>
                <div class="notification-message">${options.message}</div>
                ${options.time ? `<div class="notification-time">${options.time}</div>` : ''}
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // أصوات
        if (this.soundEnabled && options.sound !== false) {
            this.playSound(options.type);
        }

        // اهتزاز
        if (this.vibrationEnabled && navigator.vibrate) {
            navigator.vibrate(options.vibration || [100, 50, 100]);
        }

        container.appendChild(notification);

        // إزالة تلقائية
        const duration = options.duration || 5000;
        const timeout = setTimeout(() => this.removeNotification(notification), duration);

        // إغلاق يدوي
        notification.querySelector('.notification-close').addEventListener('click', () => {
            clearTimeout(timeout);
            this.removeNotification(notification);
        });

        // النقر على الإشعار
        notification.addEventListener('click', (e) => {
            if (!e.target.closest('.notification-close')) {
                if (options.onClick) options.onClick();
                this.removeNotification(notification);
            }
        });

        return notification;
    }

    removeNotification(notification) {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notificationsContainer';
        document.body.appendChild(container);
        return container;
    }

    // تشغيل صوت
    playSound(type) {
        const sounds = {
            message: '/assets/sounds/message.mp3',
            call: '/assets/sounds/call.mp3',
            notification: '/assets/sounds/notification.mp3',
            error: '/assets/sounds/error.mp3'
        };

        const audio = new Audio(sounds[type] || sounds.notification);
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed:', e));
    }

    // إشعار رسالة جديدة
    newMessage(message, conversation) {
        // إشعار نظام إذا كان التطبيق في الخلفية
        if (document.hidden) {
            this.showSystemNotification({
                title: message.sender.name,
                body: message.type === 'text' ? message.content : 'رسالة جديدة',
                icon: message.sender.avatar,
                tag: `message-${conversation.id}`,
                onClick: () => {
                    window.focus();
                    window.app.openConversation(conversation.id);
                }
            });
        } else {
            // إشعار داخل التطبيق
            this.showInAppNotification({
                title: message.sender.name,
                message: message.type === 'text' ? message.content : 'رسالة جديدة',
                avatar: message.sender.avatar,
                type: 'message',
                onClick: () => {
                    window.app.openConversation(conversation.id);
                }
            });
        }

        // تحديث عنوان الصفحة
        this.updateTitleBadge();
    }

    // إشعار مكالمة واردة
    incomingCall(caller) {
        this.showSystemNotification({
            title: 'مكالمة واردة',
            body: `${caller.name} يتصل بك`,
            icon: caller.avatar,
            requireInteraction: true,
            actions: [
                { action: 'answer', title: 'رد' },
                { action: 'decline', title: 'رفض' }
            ]
        });

        // صوت رنين
        this.playRingtone();
    }

    playRingtone() {
        const ringtone = new Audio('/assets/sounds/ringtone.mp3');
        ringtone.loop = true;
        ringtone.play();

        // إيقاف بعد 30 ثانية
        setTimeout(() => {
            ringtone.pause();
            ringtone.currentTime = 0;
        }, 30000);

        return ringtone;
    }

    // تحديث عداد العنوان
    updateTitleBadge() {
        const unreadCount = window.app?.conversations?.reduce((sum, c) => sum + (c.unread || 0), 0) || 0;
        
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) MegaChat Pro`;
        } else {
            document.title = 'MegaChat Pro';
        }
    }

    // إشعار عندما يكتب شخص ما
    showTypingIndicator(user) {
        // يمكن إظهار إشعار صغير
    }

    // تبديل الإعدادات
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        StorageManager.setLocal('soundEnabled', this.soundEnabled);
    }

    toggleVibration() {
        this.vibrationEnabled = !this.vibrationEnabled;
        StorageManager.setLocal('vibrationEnabled', this.vibrationEnabled);
    }

    // جدولة إشعار
    scheduleNotification(options, delay) {
        setTimeout(() => {
            this.showInAppNotification(options);
        }, delay);
    }

    // إشعار ذكي (يختفي عندما يكون المستخدم نشطاً)
    smartNotification(options) {
        // التحقق من نشاط المستخدم
        const lastActivity = Date.now() - this.lastActivity;
        
        if (lastActivity < 5000) {
            // المستخدم نشط، لا حاجة للإشعار
            return;
        }

        this.showInAppNotification(options);
    }

    updateActivity() {
        this.lastActivity = Date.now();
    }
}

// تصدير
window.NotificationManager = NotificationManager;
window.notificationManager = new NotificationManager();

// تحديث النشاط
document.addEventListener('mousemove', () => window.notificationManager?.updateActivity());
document.addEventListener('keydown', () => window.notificationManager?.updateActivity());
