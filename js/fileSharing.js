/**
 * File Sharing Manager - إدارة مشاركة الملفات والوسائط
 */

class FileSharingManager {
    constructor() {
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedTypes = {
            image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
            video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
            audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/webm'],
            document: [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'text/csv',
                'application/zip',
                'application/x-rar-compressed'
            ]
        };
        this.uploadQueue = [];
        this.isUploading = false;
    }

    // فتح منتقي الملفات
    openFilePicker(options = {}) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options.multiple !== false;
        
        if (options.accept) {
            input.accept = options.accept;
        }

        input.onchange = (e) => {
            const files = Array.from(e.target.files);
            this.handleFiles(files, options);
        };

        input.click();
    }

    // معالجة الملفات
    async handleFiles(files, options = {}) {
        const validFiles = [];
        const errors = [];

        for (const file of files) {
            // التحقق من الحجم
            if (file.size > this.maxFileSize) {
                errors.push(`${file.name}: حجم الملف كبير جداً (الحد الأقصى 100MB)`);
                continue;
            }

            // التحقق من النوع
            const type = this.getFileType(file);
            if (!type) {
                errors.push(`${file.name}: نوع الملف غير مدعوم`);
                continue;
            }

            validFiles.push({
                file,
                type,
                id: Date.now() + Math.random(),
                progress: 0,
                status: 'pending'
            });
        }

        // عرض الأخطاء
        if (errors.length > 0) {
            window.app?.showNotification('تنبيه', errors.join('\n'), 'warning');
        }

        // إضافة للقائمة
        this.uploadQueue.push(...validFiles);
        
        // بدء الرفع
        if (!this.isUploading) {
            this.processQueue();
        }

        return validFiles;
    }

    // تحديد نوع الملف
    getFileType(file) {
        for (const [type, mimeTypes] of Object.entries(this.allowedTypes)) {
            if (mimeTypes.includes(file.type)) {
                return type;
            }
        }
        
        // التحقق من الامتداد إذا لم يتم التعرف على MIME type
        const ext = file.name.split('.').pop().toLowerCase();
        const extMap = {
            jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
            mp4: 'video', mov: 'video', avi: 'video', mkv: 'video',
            mp3: 'audio', wav: 'audio', ogg: 'audio',
            pdf: 'document', doc: 'document', docx: 'document', xls: 'document', 
            xlsx: 'document', ppt: 'document', pptx: 'document', txt: 'document',
            zip: 'document', rar: 'document'
        };
        
        return extMap[ext] || null;
    }

    // معالجة قائمة الانتظار
    async processQueue() {
        if (this.uploadQueue.length === 0) {
            this.isUploading = false;
            return;
        }

        this.isUploading = true;
        const fileItem = this.uploadQueue[0];

        try {
            fileItem.status = 'uploading';
            this.showUploadProgress(fileItem);

            // ضغط الصور قبل الرفع
            if (fileItem.type === 'image' && fileItem.file.size > 1024 * 1024) {
                fileItem.file = await this.compressImage(fileItem.file);
            }

            // محاكاة الرفع
            await this.simulateUpload(fileItem);

            // إرسال الرسالة
            await this.sendFileMessage(fileItem);

            fileItem.status = 'completed';
            this.removeFromQueue(fileItem.id);

        } catch (error) {
            fileItem.status = 'error';
            fileItem.error = error.message;
            window.app?.showNotification('خطأ', `فشل رفع ${fileItem.file.name}`, 'error');
            this.removeFromQueue(fileItem.id);
        }

        // المعالجة التالية
        setTimeout(() => this.processQueue(), 500);
    }

    // محاكاة الرفع
    simulateUpload(fileItem) {
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                fileItem.progress += Math.random() * 15;
                
                if (fileItem.progress >= 100) {
                    fileItem.progress = 100;
                    clearInterval(interval);
                    resolve();
                }

                this.updateUploadProgress(fileItem);
            }, 200);
        });
    }

    // ضغط الصور
    async compressImage(file, maxWidth = 1920, quality = 0.8) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    }, 'image/jpeg', quality);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // إنشاء thumbnail
    async createThumbnail(file) {
        if (!file.type.startsWith('image/')) return null;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 200;
                    canvas.height = 200;
                    const ctx = canvas.getContext('2d');
                    
                    // قص مربع من المنتصف
                    const size = Math.min(img.width, img.height);
                    const x = (img.width - size) / 2;
                    const y = (img.height - size) / 2;
                    
                    ctx.drawImage(img, x, y, size, size, 0, 0, 200, 200);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    // إرسال رسالة الملف
    async sendFileMessage(fileItem) {
        const messageData = {
            type: fileItem.type,
            fileName: fileItem.file.name,
            fileSize: fileItem.file.size,
            fileType: fileItem.file.type,
            url: URL.createObjectURL(fileItem.file)
        };

        // إضافة thumbnail للصور
        if (fileItem.type === 'image') {
            messageData.thumbnail = await this.createThumbnail(fileItem.file);
        }

        // إضافة مدة للفيديو والصوت
        if (fileItem.type === 'video' || fileItem.type === 'audio') {
            messageData.duration = await this.getMediaDuration(fileItem.file);
        }

        // إرسال عبر مدير الدردشة
        if (window.chatManager) {
            await window.chatManager.sendMessage(fileItem.file.name, {
                type: fileItem.type,
                metadata: messageData
            });
        }
    }

    // الحصول على مدة الوسائط
    getMediaDuration(file) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(file);
            const media = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
            
            media.onloadedmetadata = () => {
                URL.revokeObjectURL(url);
                resolve(Math.floor(media.duration));
            };
            
            media.onerror = () => resolve(0);
            media.src = url;
        });
    }

    // عرض تقدم الرفع
    showUploadProgress(fileItem) {
        const container = document.getElementById('uploadProgressContainer') || this.createProgressContainer();
        
        const progressEl = document.createElement('div');
        progressEl.className = 'upload-item';
        progressEl.id = `upload-${fileItem.id}`;
        progressEl.innerHTML = `
            <div class="upload-info">
                <i class="fas fa-${this.getFileIcon(fileItem.type)}"></i>
                <span class="upload-name">${fileItem.file.name}</span>
                <span class="upload-size">${this.formatFileSize(fileItem.file.size)}</span>
            </div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: 0%"></div>
            </div>
            <span class="upload-percent">0%</span>
            <button class="upload-cancel" onclick="fileManager.cancelUpload('${fileItem.id}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(progressEl);
    }

    // تحديث التقدم
    updateUploadProgress(fileItem) {
        const el = document.getElementById(`upload-${fileItem.id}`);
        if (!el) return;
        
        el.querySelector('.upload-progress-fill').style.width = `${fileItem.progress}%`;
        el.querySelector('.upload-percent').textContent = `${Math.round(fileItem.progress)}%`;
    }

    // إنشاء حاوية التقدم
    createProgressContainer() {
        const container = document.createElement('div');
        container.id = 'uploadProgressContainer';
        container.className = 'upload-progress-container';
        document.body.appendChild(container);
        return container;
    }

    // إلغاء الرفع
    cancelUpload(id) {
        const index = this.uploadQueue.findIndex(item => item.id === id);
        if (index > -1) {
            this.uploadQueue.splice(index, 1);
            document.getElementById(`upload-${id}`)?.remove();
        }
    }

    // إزالة من القائمة
    removeFromQueue(id) {
        const index = this.uploadQueue.findIndex(item => item.id === id);
        if (index > -1) {
            this.uploadQueue.splice(index, 1);
            setTimeout(() => {
                document.getElementById(`upload-${id}`)?.remove();
            }, 1000);
        }
    }

    // سحب وإفلات
    setupDragDrop(element) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            element.addEventListener(eventName, () => {
                element.classList.remove('drag-over');
            });
        });

        element.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    // لصق من الحافظة
    setupPaste(element) {
        element.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            const files = [];
            
            for (const item of items) {
                if (item.kind === 'file') {
                    files.push(item.getAsFile());
                }
            }
            
            if (files.length > 0) {
                this.handleFiles(files);
            }
        });
    }

    // التقاط صورة من الكاميرا
    async captureCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            // إنشاء واجهة الكاميرا
            const modal = document.createElement('div');
            modal.className = 'camera-modal';
            modal.innerHTML = `
                <video autoplay playsinline></video>
                <div class="camera-controls">
                    <button class="camera-capture"><i class="fas fa-camera"></i></button>
                    <button class="camera-close"><i class="fas fa-times"></i></button>
                </div>
            `;
            
            modal.querySelector('video').srcObject = stream;
            document.body.appendChild(modal);

            // التقاط الصورة
            modal.querySelector('.camera-capture').onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                
                canvas.toBlob((blob) => {
                    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    this.handleFiles([file]);
                    stream.getTracks().forEach(track => track.stop());
                    modal.remove();
                }, 'image/jpeg');
            };

            modal.querySelector('.camera-close').onclick = () => {
                stream.getTracks().forEach(track => track.stop());
                modal.remove();
            };

        } catch (err) {
            window.app?.showNotification('خطأ', 'لا يمكن الوصول للكاميرا', 'error');
        }
    }

    // تسجيل فيديو
    async recordVideo() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const file = new File([blob], `video_${Date.now()}.webm`, { type: 'video/webm' });
                this.handleFiles([file]);
            };

            // واجهة التسجيل
            const modal = document.createElement('div');
            modal.className = 'video-record-modal';
            modal.innerHTML = `
                <video autoplay playsinline muted></video>
                <div class="record-controls">
                    <button class="record-start"><i class="fas fa-circle"></i></button>
                    <button class="record-stop" disabled><i class="fas fa-stop"></i></button>
                    <div class="record-timer">00:00</div>
                </div>
            `;
            
            modal.querySelector('video').srcObject = stream;
            document.body.appendChild(modal);

            let timerInterval;
            let seconds = 0;

            modal.querySelector('.record-start').onclick = () => {
                mediaRecorder.start();
                modal.querySelector('.record-start').disabled = true;
                modal.querySelector('.record-stop').disabled = false;
                
                timerInterval = setInterval(() => {
                    seconds++;
                    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                    const secs = (seconds % 60).toString().padStart(2, '0');
                    modal.querySelector('.record-timer').textContent = `${mins}:${secs}`;
                }, 1000);
            };

            modal.querySelector('.record-stop').onclick = () => {
                mediaRecorder.stop();
                stream.getTracks().forEach(track => track.stop());
                clearInterval(timerInterval);
                modal.remove();
            };

        } catch (err) {
            window.app?.showNotification('خطأ', 'لا يمكن الوصول للكاميرا', 'error');
        }
    }

    // أدوات مساعدة
    getFileIcon(type) {
        const icons = {
            image: 'image',
            video: 'video',
            audio: 'music',
            document: 'file-alt'
        };
        return icons[type] || 'file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // تحميل الملف
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // مشاركة الملف
    async shareFile(file) {
        if (navigator.share && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    files: [file],
                    title: file.name
                });
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            this.downloadFile(URL.createObjectURL(file), file.name);
        }
    }
}

// تصدير
window.FileSharingManager = FileSharingManager;
window.fileManager = new FileSharingManager();
