/**
 * MegaChat Pro - Main Application
 * تطبيق مراسلة متكامل يعمل على Static Site
 */

class MegaChatApp {
    constructor() {
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = [];
        this.isLoading = true;
        this.init();
    }

    async init() {
        await this.simulateLoading();
        await this.loadData();
        this.setupEventListeners();
        this.renderConversations();
        this.checkAuth();
    }

    // محاكاة تحميل تدريجي
    async simulateLoading() {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const loadingStatus = document.getElementById('loadingStatus');
        
        const stages = [
            { progress: 20, text: 'جاري تحميل الموارد...', delay: 500 },
            { progress: 45, text: 'جاري تهيئة التطبيق...', delay: 800 },
            { progress: 70, text: 'جاري تحميل المحادثات...', delay: 600 },
            { progress: 90, text: 'جاري التجهيز...', delay: 400 },
            { progress: 100, text: 'جاهز!', delay: 300 }
        ];

        for (let stage of stages) {
            await this.delay(stage.delay);
            progressBar.style.width = stage.progress + '%';
            progressText.textContent = stage.progress + '%';
            loadingStatus.textContent = stage.text;
        }

        await this.delay(500);
        document.getElementById('preloader').classList.add('hidden');
        document.getElementById('app').classList.add('visible');
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // تحميل البيانات المحلية
    async loadData() {
        // محاكاة بيانات المستخدم
        this.currentUser = {
            id: 1,
            name: "أحمد محمد",
            avatar: "https://i.pravatar.cc/150?img=11",
            status: "online",
            phone: "+966 50 123 4567",
            bio: "مطور تطبيقات | محب للتقنية"
        };

        // محاكاة بيانات المحادثات
        this.conversations = [
            {
                id: 1,
                type: 'private',
                name: "سارة أحمد",
                avatar: "https://i.pravatar.cc/150?img=5",
                status: "online",
                lastSeen: "الآن",
                unread: 3,
                isPinned: true,
                isMuted: false,
                messages: this.generateMessages(1, 15)
            },
            {
                id: 2,
                type: 'private',
                name: "محمد علي",
                avatar: "https://i.pravatar.cc/150?img=3",
                status: "away",
                lastSeen: "منذ 5 دقائق",
                unread: 0,
                isPinned: false,
                isMuted: false,
                messages: this.generateMessages(2, 8)
            },
            {
                id: 3,
                type: 'group',
                name: "فريق التطوير",
                avatar: "https://i.pravatar.cc/150?img=8",
                members: 12,
                unread: 12,
                isPinned: true,
                isMuted: false,
                messages: this.generateGroupMessages(3, 25)
            },
            {
                id: 4,
                type: 'private',
                name: "فاطمة حسن",
                avatar: "https://i.pravatar.cc/150?img=9",
                status: "offline",
                lastSeen: "منذ ساعة",
                unread: 1,
                isPinned: false,
                isMuted: true,
                messages: this.generateMessages(4, 5)
            },
            {
                id: 5,
                type: 'private',
                name: "خالد عمر",
                avatar: "https://i.pravatar.cc/150?img=12",
                status: "online",
                lastSeen: "الآن",
                unread: 0,
                isPinned: false,
                isMuted: false,
                messages: this.generateMessages(5, 20)
            }
        ];

        // حفظ في التخزين المحلي
        this.saveToStorage();
    }

    // توليد رسائل وهمية
    generateMessages(convId, count) {
        const messages = [];
        const texts = [
            "مرحباً! كيف حالك؟",
            "هل انتهيت من المشروع؟",
            "ممتاز! 👍",
            "أرسلت لك الملفات",
            "تمام، بشوفك بكرة",
            "شكراً جزيلاً",
            "حاضر، بتواصل معك",
            "هل يمكنك مساعدتي؟",
            "بالتأكيد!",
            "ما رأيك في الفكرة؟"
        ];

        for (let i = 0; i < count; i++) {
            const isSent = Math.random() > 0.5;
            messages.push({
                id: Date.now() + i,
                text: texts[Math.floor(Math.random() * texts.length)],
                sent: isSent,
                time: this.generateTime(i),
                status: isSent ? (Math.random() > 0.3 ? 'read' : 'delivered') : null,
                type: 'text'
            });
        }
        return messages;
    }

    generateGroupMessages(convId, count) {
        const members = [
            { name: "أحمد", avatar: "https://i.pravatar.cc/150?img=1" },
            { name: "سارة", avatar: "https://i.pravatar.cc/150?img=5" },
            { name: "محمد", avatar: "https://i.pravatar.cc/150?img=3" }
        ];

        const messages = [];
        for (let i = 0; i < count; i++) {
            const sender = members[Math.floor(Math.random() * members.length)];
            messages.push({
                id: Date.now() + i,
                text: `رسالة من ${sender.name}`,
                sent: sender.name === "أحمد",
                sender: sender,
                time: this.generateTime(i),
                type: 'text'
            });
        }
        return messages;
    }

    generateTime(minutesAgo) {
        const date = new Date();
        date.setMinutes(date.getMinutes() - minutesAgo);
        return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    }

    // حفظ في LocalStorage
    saveToStorage() {
        localStorage.setItem('megachat_user', JSON.stringify(this.currentUser));
        localStorage.setItem('megachat_conversations', JSON.stringify(this.conversations));
    }

    // التحقق من المصادقة
    checkAuth() {
        const user = localStorage.getItem('megachat_user');
        if (!user) {
            // يمكن إضافة صفحة تسجيل دخول هنا
            console.log('User not logged in');
        }
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // تبويبات
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e));
        });

        // البحث
        const searchInput = document.getElementById('globalSearch');
        searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // إرسال رسالة
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');

        sendBtn.addEventListener('click', () => this.sendMessage());
        
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // تعديل ارتفاع textarea
        messageInput.addEventListener('input', (e) => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
            document.getElementById('charCount').textContent = `${e.target.value.length}/5000`;
        });

        // قائمة المستخدم
        document.getElementById('userMenuBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('userDropdown').classList.toggle('active');
        });

        // إغلاق القوائم عند النقر خارجها
        document.addEventListener('click', () => {
            document.getElementById('userDropdown').classList.remove('active');
            document.getElementById('attachMenu').classList.add('hidden');
        });

        // زر المرفقات
        document.getElementById('attachBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('attachMenu').classList.toggle('hidden');
        });

        // تصفية البحث
        document.getElementById('searchFilter').addEventListener('click', () => {
            document.getElementById('searchFilters').classList.toggle('hidden');
        });

        // فلاتر البحث
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // تسجيل الخروج
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Sidebar toggle للموبايل
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // زر الرجوع للموبايل
        document.getElementById('mobileBack').addEventListener('click', () => {
            document.getElementById('chatInterface').classList.add('hidden');
            document.getElementById('emptyState').classList.remove('hidden');
            this.currentConversation = null;
        });

        // معلومات المستخدم في الدردشة
        document.getElementById('chatUserInfo').addEventListener('click', () => {
            this.showUserSidebar();
        });

        document.getElementById('closeUserSidebar').addEventListener('click', () => {
            document.getElementById('userSidebar').classList.remove('active');
        });

        // مكالمات
        document.getElementById('voiceCallBtn').addEventListener('click', () => {
            this.showNotification('مكالمة صوتية', 'جاري الاتصال...', 'info');
        });

        document.getElementById('videoCallBtn').addEventListener('click', () => {
            this.showNotification('مكالمة فيديو', 'جاري الاتصال...', 'info');
        });

        // اختصارات لوحة المفاتيح
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K للبحث
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('globalSearch').focus();
            }
            
            // Escape لإغلاق النوافذ
            if (e.key === 'Escape') {
                document.getElementById('userSidebar').classList.remove('active');
                document.getElementById('attachMenu').classList.add('hidden');
            }
        });
    }

    // تبديل التبويبات
    switchTab(e) {
        const tabName = e.currentTarget.dataset.tab;
        
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        e.currentTarget.classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    }

    // عرض المحادثات
    renderConversations() {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        // ترتيب: المثبتة أولاً، ثم حسب الوقت
        const sorted = [...this.conversations].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return b.id - a.id;
        });

        sorted.forEach((conv, index) => {
            const item = document.createElement('div');
            item.className = `conversation-item ${conv.id === this.currentConversation?.id ? 'active' : ''}`;
            item.style.animationDelay = `${index * 0.05}s`;
            
            const lastMsg = conv.messages[conv.messages.length - 1];
            
            item.innerHTML = `
                <div class="conversation-avatar">
                    <img src="${conv.avatar}" alt="${conv.name}">
                    ${conv.type === 'private' ? `
                        <div class="status-indicator ${conv.status}"></div>
                    ` : `
                        <div class="group-indicator">${conv.members}</div>
                    `}
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">
                            ${conv.isPinned ? '<i class="fas fa-thumbtack" style="color: var(--primary); margin-left: 5px;"></i>' : ''}
                            ${conv.name}
                        </span>
                        <span class="conversation-time">${lastMsg?.time || ''}</span>
                    </div>
                    <div class="conversation-preview">
                        <span class="conversation-message ${conv.unread > 0 ? 'unread' : ''}">
                            ${lastMsg ? (lastMsg.sent ? 'أنت: ' : '') + lastMsg.text : 'لا توجد رسائل'}
                        </span>
                        ${conv.unread > 0 ? `<span class="conversation-badge">${conv.unread}</span>` : ''}
                        ${conv.isMuted ? '<i class="fas fa-bell-slash" style="color: var(--text-tertiary); font-size: 0.75rem;"></i>' : ''}
                    </div>
                </div>
            `;
            
            item.addEventListener('click', () => this.openConversation(conv.id));
            container.appendChild(item);
        });
    }

    // فتح محادثة
    openConversation(id) {
        this.currentConversation = this.conversations.find(c => c.id === id);
        if (!this.currentConversation) return;

        // إخفاء الحالة الفارغة وإظهار واجهة الدردشة
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('chatInterface').classList.remove('hidden');

        // تحديث الهيدر
        document.getElementById('chatAvatar').src = this.currentConversation.avatar;
        document.getElementById('chatName').textContent = this.currentConversation.name;
        
        const statusEl = document.getElementById('chatStatus');
        const statusText = document.getElementById('chatStatusText');
        
        if (this.currentConversation.type === 'private') {
            statusEl.className = `status-indicator ${this.currentConversation.status}`;
            const statusMap = {
                'online': 'متصل الآن',
                'away': 'غائب',
                'offline': this.currentConversation.lastSeen,
                'busy': 'مشغول'
            };
            statusText.textContent = statusMap[this.currentConversation.status];
        } else {
            statusEl.className = 'status-indicator online';
            statusText.textContent = `${this.currentConversation.members} عضو`;
        }

        // عرض الرسائل
        this.renderMessages();
        
        // تحديث القائمة
        this.renderConversations();
        
        // إعادة تعيين العداد
        this.currentConversation.unread = 0;
        
        // التمرير للأسفل
        this.scrollToBottom();
    }

    // عرض الرسائل
    renderMessages() {
        const container = document.getElementById('messagesList');
        container.innerHTML = '';

        this.currentConversation.messages.forEach((msg, index) => {
            const msgEl = document.createElement('div');
            msgEl.className = `message ${msg.sent ? 'sent' : 'received'}`;
            msgEl.style.animationDelay = `${index * 0.03}s`;
            
            let content = `<div class="message-content">${this.formatMessage(msg.text)}</div>`;
            
            // للمجموعات، أضف اسم المرسل
            if (this.currentConversation.type === 'group' && !msg.sent && msg.sender) {
                content = `<div style="font-size: 0.75rem; color: var(--primary); margin-bottom: 4px; font-weight: 600;">${msg.sender.name}</div>` + content;
            }
            
            let statusIcon = '';
            if (msg.sent) {
                statusIcon = msg.status === 'read' 
                    ? '<i class="fas fa-check-double message-status read"></i>'
                    : '<i class="fas fa-check message-status"></i>';
            }
            
            msgEl.innerHTML = `
                ${content}
                <div class="message-meta">
                    <span class="message-time">${msg.time} ${statusIcon}</span>
                </div>
            `;
            
            container.appendChild(msgEl);
        });

        // إضافة مؤشر الكتابة
        const typingEl = document.createElement('div');
        typingEl.className = 'typing-indicator hidden';
        typingEl.id = 'typingIndicator';
        typingEl.innerHTML = `
            <div class="typing-bubble">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span class="typing-text">يكتب الآن...</span>
        `;
        container.appendChild(typingEl);
    }

    // تنسيق الرسالة (روابط، إيموجي، إلخ)
    formatMessage(text) {
        // تحويل الروابط
        text = text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>');
        
        // تحويل الإيموجي
        // يمكن إضافة مكتبة emoji هنا
        
        return text;
    }

    // إرسال رسالة
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        
        if (!text || !this.currentConversation) return;

        const newMessage = {
            id: Date.now(),
            text: text,
            sent: true,
            time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
            status: 'sent',
            type: 'text'
        };

        // إضافة للمحادثة
        this.currentConversation.messages.push(newMessage);
        this.currentConversation.lastMessage = text;
        
        // تحديث الواجهة
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('charCount').textContent = '0/5000';
        
        this.renderMessages();
        this.scrollToBottom();
        this.renderConversations();

        // محاكاة حالة الرسالة
        setTimeout(() => {
            newMessage.status = 'delivered';
            this.renderMessages();
        }, 1000);

        setTimeout(() => {
            newMessage.status = 'read';
            this.renderMessages();
        }, 2000);

        // محاكاة رد تلقائي
        if (Math.random() > 0.3) {
            this.showTyping();
            
            setTimeout(() => {
                this.hideTyping();
                
                const replies = [
                    "ممتاز! 👍",
                    "تمام، فهمت عليك",
                    "حاضر، بشوف الموضوع",
                    "شكراً للتوضيح",
                    "أنا تحت أمرك",
                    "هل يمكنك إرسال التفاصيل؟",
                    "رائع!"
                ];
                
                const replyMsg = {
                    id: Date.now() + 1,
                    text: replies[Math.floor(Math.random() * replies.length)],
                    sent: false,
                    time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                    type: 'text'
                };
                
                this.currentConversation.messages.push(replyMsg);
                this.currentConversation.lastMessage = replyMsg.text;
                
                // إشعار
                this.showNotification('رسالة جديدة', `رسالة من ${this.currentConversation.name}`, 'info');
                
                this.renderMessage
