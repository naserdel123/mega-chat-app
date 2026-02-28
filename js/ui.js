/**
 * UI Manager - إدارة واجهة المستخدم والتفاعلات
 */

class UIManager {
    constructor() {
        this.theme = 'dark';
        this.sidebarOpen = true;
        this.mobileMenuOpen = false;
        this.modals = [];
        this.toasts = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupIntersectionObserver();
        this.setupResizeObserver();
        this.loadTheme();
    }

    setupEventListeners() {
        // تبديل السايدبار
        document.getElementById('sidebarToggle')?.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // اختصارات لوحة المفاتيح
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // النقر خارج القوائم المنسدلة
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-menu') && !e.target.closest('.dropdown-toggle')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('active');
                });
            }
        });

        // سحب للتحديث (موبايل)
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });

        document.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const scrollTop = document.documentElement.scrollTop;
            
            if (scrollTop === 0 && touchY > touchStartY + 100) {
                this.showPullToRefresh();
            }
        });
    }

    setupIntersectionObserver() {
        // مراقبة ظهور العناصر للتحميل الكسول
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    // تحميل الصور
                    if (entry.target.dataset.src) {
                        entry.target.src = entry.target.dataset.src;
                        entry.target.removeAttribute('data-src');
                    }
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.lazy-load').forEach(el => observer.observe(el));
    }

    setupResizeObserver() {
        // مراقبة تغيير حجم النافذة
        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                if (entry.contentRect.width < 768) {
                    this.closeSidebar();
                }
            }
        });

        resizeObserver.observe(document.body);
    }

    // تبديل السايدبار
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        this.sidebarOpen = !this.sidebarOpen;
        
        if (window.innerWidth < 768) {
            sidebar.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        this.sidebarOpen = false;
        sidebar.classList.remove('active');
        if (window.innerWidth >= 768) {
            sidebar.classList.add('collapsed');
        }
    }

    openSidebar() {
        const sidebar = document.getElementById('sidebar');
        this.sidebarOpen = true;
        sidebar.classList.add('active');
        sidebar.classList.remove('collapsed');
    }

    // معالجة اختصارات لوحة المفاتيح
    handleKeyboard(e) {
        // Ctrl/Cmd + K للبحث
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('globalSearch')?.focus();
        }

        // Escape لإغلاق النوافذ
        if (e.key === 'Escape') {
            this.closeAllModals();
            this.closeSidebar();
        }

        // Ctrl + N لمحادثة جديدة
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            this.showNewChatModal();
        }

        // Ctrl + , للإعدادات
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            window.location.href = 'settings.html';
        }

        // Ctrl + / لاختصارات
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            this.showShortcutsModal();
        }
    }

    // عرض Modal
    showModal(options) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content ${options.size || ''}">
                ${options.title ? `
                    <div class="modal-header">
                        <h3>${options.title}</h3>
                        <button class="btn-icon" onclick="uiManager.closeModal(this.closest('.modal-overlay'))">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                ` : ''}
                <div class="modal-body">
                    ${options.content}
                </div>
                ${options.footer ? `
                    <div class="modal-footer">
                        ${options.footer}
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(modal);
        this.modals.push(modal);

        // تأثير الظهور
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        // منع التمرير في الخلفية
        document.body.style.overflow = 'hidden';

        return modal;
    }

    closeModal(modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            this.modals = this.modals.filter(m => m !== modal);
            
            if (this.modals.length === 0) {
                document.body.style.overflow = '';
            }
        }, 300);
    }

    closeAllModals() {
        [...this.modals].forEach(modal => this.closeModal(modal));
    }

    // Toast Notifications
    showToast(options) {
        const container = document.getElementById('notificationsContainer') || document.body;
        
        const toast = document.createElement('div');
        toast.className = `notification ${options.type || 'info'}`;
        toast.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${options.icon || 'info-circle'}"></i>
            </div>
            <div class="notification-content">
                ${options.title ? `<div class="notification-title">${options.title}</div>` : ''}
                ${options.message ? `<div class="notification-message">${options.message}</div>` : ''}
            </div>
            ${options.action ? `
                <button class="notification-action" onclick="${options.action.onclick}">
                    ${options.action.label}
                </button>
            ` : ''}
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);
        this.toasts.push(toast);

        // إزالة تلقائية
        if (options.duration !== false) {
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }, options.duration || 5000);
        }

        return toast;
    }

    // تحميل الثيم
    loadTheme() {
        const savedTheme = localStorage.getItem('megachat_theme') || 'dark';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        this.theme = theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('megachat_theme', theme);
    }

    toggleTheme() {
        const themes = ['dark', 'light', 'midnight', 'sunset', 'ocean', 'forest'];
        const currentIndex = themes.indexOf(this.theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        this.setTheme(nextTheme);
    }

    // تأثيرات حركية
    animate(element, animation) {
        element.classList.add(`animate-${animation}`);
        element.addEventListener('animationend', () => {
            element.classList.remove(`animate-${animation}`);
        }, { once: true });
    }

    // شريط التقدم
    showProgress(options) {
        const progressBar = document.createElement('div');
        progressBar.className = 'global-progress-bar';
        progressBar.innerHTML = `
            <div class="progress-fill" style="width: ${options.progress || 0}%"></div>
        `;
        
        document.body.appendChild(progressBar);

        return {
            update: (progress) => {
                progressBar.querySelector('.progress-fill').style.width = progress + '%';
            },
            complete: () => {
                progressBar.classList.add('complete');
                setTimeout(() => progressBar.remove(), 500);
            },
            error: () => {
                progressBar.classList.add('error');
                setTimeout(() => progressBar.remove(), 1000);
            }
        };
    }

    // Tooltip
    showTooltip(element, text) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.top - 40 + 'px';
        
        document.body.appendChild(tooltip);
        
        requestAnimationFrame(() => tooltip.classList.add('show'));
        
        setTimeout(() => {
            tooltip.classList.remove('show');
            setTimeout(() => tooltip.remove(), 200);
        }, 2000);
    }

    // سحب للتحديث
    showPullToRefresh() {
        const indicator = document.querySelector('.pull-to-refresh') || document.createElement('div');
        indicator.className = 'pull-to-refresh';
        indicator.innerHTML = '<i class="fas fa-arrow-down"></i> اسحب للتحديث';
        
        if (!document.querySelector('.pull-to-refresh')) {
            document.body.insertBefore(indicator, document.body.firstChild);
        }
    }

    // تحميل كسول للصور
    lazyLoadImages() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // تبديل ملء الشاشة
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    // اهتزاز (للموبايل)
    vibrate(pattern) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern || 50);
        }
    }

    // مشاركة
    async share(data) {
        if (navigator.share) {
            try {
                await navigator.share(data);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            // نسخ للحافظة كبديل
            navigator.clipboard.writeText(data.url || data.text);
            this.showToast({
                message: 'تم النسخ إلى الحافظة',
                type: 'success'
            });
        }
    }

    // طباعة
    print() {
        window.print();
    }

    // معاينة قبل الطباعة
    printPreview(content) {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>طباعة</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    ${content}
                    <button class="no-print" onclick="window.print()">طباعة</button>
                    <button class="no-print" onclick="window.close()">إغلاق</button>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
}

// تصدير
window.UIManager = UIManager;
window.uiManager = new UIManager();
