/**
 * Chat Manager - إدارة المحادثات المتقدمة
 */

class ChatManager {
    constructor() {
        this.conversations = [];
        this.currentConversation = null;
        this.messages = [];
        this.typingTimeout = null;
        this.replyTo = null;
        this.forwardFrom = null;
        this.selectedMessages = new Set();
        this.isSelectionMode = false;
    }

    // إرسال رسالة
    async sendMessage(content, options = {}) {
        if (!this.currentConversation) return;

        const message = {
            id: Date.now(),
            content,
            type: options.type || 'text',
            sender: window.authManager?.getCurrentUser(),
            timestamp: Date.now(),
            status: 'sending',
            replyTo: this.replyTo,
            forwardFrom: this.forwardFrom,
            metadata: options.metadata || {}
        };

        // إضافة للواجهة فوراً (Optimistic UI)
        this.addMessageToUI(message);
        this.scrollToBottom();

        // محاكاة الإرسال
        setTimeout(() => {
            message.status = 'sent';
            this.updateMessageStatus(message.id, 'sent');
        }, 500);

        setTimeout(() => {
            message.status = 'delivered';
            this.updateMessageStatus(message.id, 'delivered');
        }, 1500);

        // محاكاة قراءة
        setTimeout(() => {
            message.status = 'read';
            this.updateMessageStatus(message.id, 'read');
        }, 3000);

        // مسح حالة الرد/إعادة التوجيه
        this.clearReply();
        this.clearForward();

        // محاكاة رد تلقائي
        this.simulateReply();

        return message;
    }

    // إرسال صورة
    async sendImage(file, caption = '') {
        const reader = new FileReader();
        
        return new Promise((resolve) => {
            reader.onload = (e) => {
                const message = this.sendMessage(caption, {
                    type: 'image',
                    metadata: {
                        src: e.target.result,
                        fileName: file.name,
                        fileSize: file.size
                    }
                });
                resolve(message);
            };
            reader.readAsDataURL(file);
        });
    }

    // إرسال ملف
    async sendFile(file) {
        return this.sendMessage(file.name, {
            type: 'file',
            metadata: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            }
        });
    }

    // إرسال رسالة صوتية
    async sendVoice(audioBlob, duration) {
        const audioUrl = URL.createObjectURL(audioBlob);
        
        return this.sendMessage('رسالة صوتية', {
            type: 'voice',
            metadata: {
                audioUrl,
                duration
            }
        });
    }

    // إرسال موقع
    async sendLocation(latitude, longitude) {
        return this.sendMessage('موقع جغرافي', {
            type: 'location',
            metadata: { latitude, longitude }
        });
    }

    // إرسال جهة اتصال
    async sendContact(contact) {
        return this.sendMessage(contact.name, {
            type: 'contact',
            metadata: contact
        });
    }

    // إرسال استطلاع رأي
    async sendPoll(question, options) {
        return this.sendMessage(question, {
            type: 'poll',
            metadata: {
                question,
                options: options.map((opt, i) => ({
                    id: i,
                    text: opt,
                    votes: 0,
                    voters: []
                })),
                totalVotes: 0
            }
        });
    }

    // التصويت في استطلاع
    async votePoll(messageId, optionId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message || message.type !== 'poll') return;

        const option = message.metadata.options.find(o => o.id === optionId);
        if (!option) return;

        // التحقق من عدم التصويت مسبقاً
        const hasVoted = message.metadata.options.some(o => o.voters.includes('currentUser'));
        if (hasVoted) return;

        option.votes++;
        option.voters.push('currentUser');
        message.metadata.totalVotes++;

        this.updateMessage(messageId, message);
    }

    // حذف رسالة
    async deleteMessage(messageId, forEveryone = false) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        if (forEveryone) {
            message.content = 'تم حذف هذه الرسالة';
            message.type = 'deleted';
            message.metadata = {};
        } else {
            this.messages = this.messages.filter(m => m.id !== messageId);
        }

        this.renderMessages();
    }

    // تعديل رسالة
    async editMessage(messageId, newContent) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        message.content = newContent;
        message.edited = true;
        message.editHistory = message.editHistory || [];
        message.editHistory.push({
            content: message.content,
            timestamp: Date.now()
        });

        this.renderMessages();
    }

    // الرد على رسالة
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        this.replyTo = {
            id: message.id,
            content: message.content,
            sender: message.sender
        };

        this.showReplyPreview();
        document.getElementById('messageInput').focus();
    }

    // إعادة توجيه رسالة
    forwardMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;

        this.forwardFrom = {
            id: message.id,
            content: message.content,
            sender: message.sender,
            originalChat: this.currentConversation.id
        };

        // إظهار قائمة المحادثات لاختيار وجهة التوجيه
        this.showForwardDialog();
    }

    // تحديد رسائل متعددة
    toggleMessageSelection(messageId) {
        if (this.selectedMessages.has(messageId)) {
            this.selectedMessages.delete(messageId);
        } else {
            this.selectedMessages.add(messageId);
        }

        this.updateSelectionUI();
    }

    // حذف رسائل متعددة
    async deleteSelectedMessages() {
        if (this.selectedMessages.size === 0) return;

        const confirmed = confirm(`حذف ${this.selectedMessages.size} رسالة؟`);
        if (!confirmed) return;

        this.messages = this.messages.filter(m => !this.selectedMessages.has(m.id));
        this.selectedMessages.clear();
        this.isSelectionMode = false;
        
        this.renderMessages();
    }

    // نسخ رسائل
    copySelectedMessages() {
        const selected = this.messages.filter(m => this.selectedMessages.has(m.id));
        const text = selected.map(m => m.content).join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            window.app.showNotification('تم النسخ', 'تم نسخ الرسائل إلى الحافظة', 'success');
        });

        this.exitSelectionMode();
    }

    // البحث في المحادثة
    searchInChat(query) {
        if (!query) {
            this.clearSearchHighlights();
            return;
        }

        const regex = new RegExp(query, 'gi');
        const messageElements = document.querySelectorAll('.message-content');
        
        messageElements.forEach(el => {
            const text = el.textContent;
            if (regex.test(text)) {
                el.innerHTML = text.replace(regex, match => `<mark>${match}</mark>`);
                el.closest('.message').classList.add('search-highlight');
            }
        });
    }

    // التمرير لرسالة محددة
    scrollToMessage(messageId) {
        const element = document.querySelector(`[data-message-id="${messageId}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-pulse');
            setTimeout(() => element.classList.remove('highlight-pulse'), 2000);
        }
    }

    // محاكاة الرد التلقائي
    simulateReply() {
        if (Math.random() > 0.7) return;

        this.showTypingIndicator();

        setTimeout(() => {
            this.hideTypingIndicator();

            const replies = [
                "ممتاز! 👍",
                "تمام، فهمت عليك",
                "حاضر، بشوف الموضوع",
                "شكراً للتوضيح",
                "أنا تحت أمرك",
                "هل يمكنك إرسال التفاصيل؟",
                "رائع!",
                "أتفق معك",
                "👏👏👏",
                "شكراً جزيلاً"
            ];

            const replyMessage = {
                id: Date.now() + 1,
                content: replies[Math.floor(Math.random() * replies.length)],
                type: 'text',
                sender: { name: this.currentConversation.name },
                timestamp: Date.now(),
                status: 'read',
                sent: false
            };

            this.messages.push(replyMessage);
            this.addMessageToUI(replyMessage);
            this.scrollToBottom();

            // إشعار
            if (window.app) {
                window.app.showNotification('رسالة جديدة', replyMessage.content, 'info');
            }

        }, 2000 + Math.random() * 3000);
    }

    // إظهار مؤشر الكتابة
    showTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
            this.scrollToBottom();
        }
    }

    // إخفاء مؤشر الكتابة
    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    // إضافة رسالة للواجهة
    addMessageToUI(message) {
        const container = document.getElementById('messagesList');
        if (!container) return;

        const messageEl = document.createElement('div');
        messageEl.className = `message ${message.sent !== false ? 'sent' : 'received'}`;
        messageEl.dataset.messageId = message.id;
        
        let contentHTML = '';
        
        switch(message.type) {
            case 'text':
                contentHTML = `<div class="message-content">${this.escapeHtml(message.content)}</div>`;
                break;
            case 'image':
                contentHTML = `
                    <div class="message-image">
                        <img src="${message.metadata.src}" alt="صورة" loading="lazy">
                        ${message.content ? `<div class="image-caption">${message.content}</div>` : ''}
                    </div>
                `;
                break;
            case 'voice':
                contentHTML = `
                    <div class="voice-message">
                        <button class="voice-play-btn" onclick="this.playVoice('${message.metadata.audioUrl}')">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="voice-wave">
                            ${Array(20).fill(0).map(() => 
                                `<div class="wave-bar" style="height: ${Math.random() * 100}%"></div>`
                            ).join('')}
                        </div>
                        <span class="voice-duration">${this.formatDuration(message.metadata.duration)}</span>
                    </div>
                `;
                break;
            case 'file':
                contentHTML = `
                    <div class="file-attachment">
                        <div class="file-icon">
                            <i class="fas fa-file"></i>
                        </div>
                        <div class="file-info">
                            <div class="file-name">${message.metadata.fileName}</div>
                            <div class="file-size">${this.formatFileSize(message.metadata.fileSize)}</div>
                        </div>
                        <button class="btn-icon" onclick="this.downloadFile('${message.metadata.fileName}')">
                            <i class="fas fa-download"></i>
                        </button>
                    </div>
                `;
                break;
            case 'location':
                contentHTML = `
                    <div class="location-preview">
                        <img src="https://maps.googleapis.com/maps/api/staticmap?center=${message.metadata.latitude},${message.metadata.longitude}&zoom=15&size=400x200&markers=color:red%7C${message.metadata.latitude},${message.metadata.longitude}&key=YOUR_API_KEY" 
                             alt="خريطة" class="location-map">
                        <div class="location-info">
                            <i class="fas fa-map-marker-alt"></i>
                            موقع جغرافي
                        </div>
                    </div>
                `;
                break;
            case 'poll':
                contentHTML = this.renderPoll(message);
                break;
            case 'deleted':
                contentHTML = `<div class="message-content" style="font-style: italic; opacity: 0.6;">${message.content}</div>`;
                break;
        }

        // معاينة الرد
        if (message.replyTo) {
            contentHTML = `
                <div class="reply-preview">
                    <div class="reply-sender">${message.replyTo.sender.name}</div>
                    <div class="reply-content">${message.replyTo.content}</div>
                </div>
            ` + contentHTML;
        }

        // معلومات الرسالة
        const time = new Date(message.timestamp).toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let statusIcon = '';
        if (message.sent !== false) {
            statusIcon = message.status === 'read' 
                ? '<i class="fas fa-check-double" style="color: #4ade80;"></i>'
                : message.status === 'delivered'
                ? '<i class="fas fa-check-double"></i>'
                : '<i class="fas fa-check"></i>';
        }

        messageEl.innerHTML = `
            ${contentHTML}
            <div class="message-meta">
                <span class="message-time">${time} ${statusIcon}</span>
                ${message.edited ? '<span class="edited-mark">تم التعديل</span>' : ''}
            </div>
        `;

        // قائمة السياق
        messageEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showMessageContextMenu(e, message);
        });

        // النقر المزدوج للرد
        messageEl.addEventListener('dblclick', () => {
            this.replyToMessage(message.id);
        });

        container.appendChild(messageEl);
    }

    // عرض استطلاع الرأي
    renderPoll(message) {
        const { question, options, totalVotes } = message.metadata;
        const hasVoted = options.some(o => o.voters.includes('currentUser'));

        return `
            <div class="poll-container" data-poll-id="${message.id}">
                <div class="poll-question">${question}</div>
                ${options.map(opt => `
                    <div class="poll-option ${hasVoted ? 'disabled' : ''}" 
                         onclick="${hasVoted ? '' : `window.chatManager.votePoll(${message.id}, ${opt.id})`}">
                        <div class="poll-option-bar" style="width: ${hasVoted ? (opt.votes / totalVotes * 100) : 0}%"></div>
                        <span>${opt.text}</span>
                        ${hasVoted ? `<span class="poll-votes">${opt.votes} صوت</span>` : ''}
                    </div>
                `).join('')}
                <div class="poll-footer">${totalVotes} إجمالي الأصوات</div>
            </div>
        `;
    }

    // تحديث حالة الرسالة
    updateMessageStatus(messageId, status) {
        const messageEl = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageEl) return;

        const statusContainer = messageEl.querySelector('.message-time');
        if (!statusContainer) return;

        let icon = '';
        if (status === 'read') {
            icon = '<i class="fas fa-check-double" style="color: #4ade80;"></i>';
        } else if (status === 'delivered') {
            icon = '<i class="fas fa-check-double"></i>';
        } else {
            icon = '<i class="fas fa-check"></i>';
        }

        statusContainer.innerHTML = statusContainer.innerHTML.replace(/<i[^>]*><\/i>/, '') + ' ' + icon;
    }

    // تحديث رسالة
    updateMessage(messageId, updates) {
        const index = this.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            this.messages[index] = { ...this.messages[index], ...updates };
            this.renderMessages();
        }
    }

    // عرض جميع الرسائل
    renderMessages() {
        const container = document.getElementById('messagesList');
        if (!container) return;

        container.innerHTML = '';
        this.messages.forEach(msg => this.addMessageToUI(msg));
    }

    // قائمة سياق الرسالة
    showMessageContextMenu(event, message) {
        const menu = document.createElement('div');
        menu.className = 'context-menu active';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';

        const items = [
            { icon: 'reply', label: 'رد', action: () => this.replyToMessage(message.id) },
            { icon: 'share', label: 'إعادة توجيه', action: () => this.forwardMessage(message.id) },
            { icon: 'copy', label: 'نسخ', action: () => this.copyMessage(message) },
            { icon: 'star', label: 'تفضيل', action: () => this.starMessage(message.id) },
            ...(message.sent !== false ? [
                { icon: 'edit', label: 'تعديل', action: () => this.startEditMessage(message) },
                { icon: 'trash', label: 'حذف للجميع', action: () => this.deleteMessage(message.id, true), danger: true }
            ] : []),
            { icon: 'trash', label: 'حذف', action: () => this.deleteMessage(message.id), danger: true }
        ];

        menu.innerHTML = items.map(item => `
            <div class="context-item ${item.danger ? 'danger' : ''}" onclick="(${item.action})(); this.closest('.context-menu').remove()">
                <i class="fas fa-${item.icon}"></i>
                <span>${item.label}</span>
            </div>
        `).join('');

        document.body.appendChild(menu);

        // إغلاق عند النقر خارجها
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }

    // نسخ رسالة
    copyMessage(message) {
        navigator.clipboard.writeText(message.content);
        window.app.showNotification('تم النسخ', 'تم نسخ النص إلى الحافظة', 'success');
    }

    // تفضيل رسالة
    starMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            message.starred = !message.starred;
            window.app.showNotification(
                message.starred ? 'تم التفضيل' : 'تم إلغاء التفضيل',
                '',
                'success'
            );
        }
    }

    // بدء تعديل رسالة
    startEditMessage(message) {
        const input = document.getElementById('messageInput');
        input.value = message.content;
        input.dataset.editing = message.id;
        input.focus();
    }

    // مسح الرد
    clearReply() {
        this.replyTo = null;
        const preview = document.querySelector('.reply-preview-bar');
        if (preview) preview.remove();
    }

    // مسح إعادة التوجيه
    clearForward() {
        this.forwardFrom = null;
    
