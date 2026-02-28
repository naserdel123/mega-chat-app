/**
 * Voice Manager - إدارة المكالمات الصوتية وتسجيل الرسائل
 */

class VoiceManager {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.recordingTime = 0;
        this.timerInterval = null;
        this.analyser = null;
        this.dataArray = null;
        this.canvas = null;
        this.canvasCtx = null;
    }

    // طلب إذن الميكروفون
    async requestPermission() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            return true;
        } catch (err) {
            console.error('Microphone permission denied:', err);
            return false;
        }
    }

    // بدء التسجيل
    async startRecording() {
        if (this.isRecording) return;
        
        const hasPermission = await this.requestPermission();
        if (!hasPermission) {
            alert('يرجى السماح بالوصول إلى الميكروفون');
            return;
        }

        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(this.stream);
        
        this.mediaRecorder.ondataavailable = (event) => {
            this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
            this.onRecordingComplete(audioBlob);
        };

        // إعداد محلل الصوت للموجات
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(this.stream);
        this.analyser = audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        // إعداد Canvas
        this.canvas = document.getElementById('waveCanvas');
        this.canvasCtx = this.canvas.getContext('2d');
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;

        this.mediaRecorder.start();
        this.isRecording = true;
        this.recordingTime = 0;
        
        // بدء المؤقت
        this.timerInterval = setInterval(() => {
            this.recordingTime++;
            this.updateTimer();
            this.drawWaveform();
        }, 1000);

        // تحديث الواجهة
        document.getElementById('voiceRecorder').classList.remove('hidden');
        document.querySelector('.input-container').classList.add('hidden');
    }

    // إيقاف التسجيل
    stopRecording() {
        if (!this.isRecording) return;
        
        this.mediaRecorder.stop();
        this.stream.getTracks().forEach(track => track.stop());
        
        clearInterval(this.timerInterval);
        this.isRecording = false;
        
        // إخفاء مسجل الصوت
        document.getElementById('voiceRecorder').classList.add('hidden');
        document.querySelector('.input-container').classList.remove('hidden');
    }

    // إلغاء التسجيل
    cancelRecording() {
        this.stopRecording();
        this.audioChunks = [];
    }

    // عند اكتمال التسجيل
    onRecordingComplete(audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        const duration = this.recordingTime;
        
        // إرسال الرسالة الصوتية
        if (window.app && window.app.currentConversation) {
            const message = {
                id: Date.now(),
                type: 'voice',
                audioUrl: audioUrl,
                duration: duration,
                sent: true,
                time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                status: 'sent'
            };
            
            window.app.currentConversation.messages.push(message);
            window.app.renderMessages();
            window.app.scrollToBottom();
        }
    }

    // تحديث المؤقت
    updateTimer() {
        const minutes = Math.floor(this.recordingTime / 60);
        const seconds = this.recordingTime % 60;
        document.getElementById('recordingTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // رسم الموجة الصوتية
    drawWaveform() {
        if (!this.analyser) return;
        
        const ctx = this.canvasCtx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        const barWidth = (width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < this.dataArray.length; i++) {
            barHeight = (this.dataArray[i] / 255) * height;
            
            const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            
            x += barWidth + 1;
        }
        
        requestAnimationFrame(() => this.drawWaveform());
    }

    // تشغيل صوت
    playAudio(url) {
        const audio = new Audio(url);
        audio.play();
        return audio;
    }

    // مكالمة صوتية (محاكاة)
    async startVoiceCall(contactId) {
        // هنا يتم الاتصال بـ WebRTC
        console.log('Starting voice call with:', contactId);
        
        // إظهار واجهة المكالمة
        this.showCallInterface('voice', contactId);
    }

    // مكالمة فيديو (محاكاة)
    async startVideoCall(contactId) {
        console.log('Starting video call with:', contactId);
        this.showCallInterface('video', contactId);
    }

    // واجهة المكالمة
    showCallInterface(type, contactId) {
        const overlay = document.createElement('div');
        overlay.className = 'call-overlay';
        overlay.innerHTML = `
            <div class="call-container">
                <div class="call-avatar">
                    <img src="https://i.pravatar.cc/150?img=${contactId}" alt="Caller">
                    <div class="call-ring"></div>
                </div>
                <h2>جاري الاتصال...</h2>
                <p>02:35</p>
                <div class="call-actions">
                    <button class="call-btn mute"><i class="fas fa-microphone"></i></button>
                    <button class="call-btn end" onclick="this.closest('.call-overlay').remove()">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                    <button class="call-btn speaker"><i class="fas fa-volume-up"></i></button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
    }
}

// تهيئة
document.addEventListener('DOMContentLoaded', () => {
    window.voiceManager = new VoiceManager();
    
    // أزرار التسجيل
    document.getElementById('voiceBtn')?.addEventListener('click', () => {
        window.voiceManager.startRecording();
    });
    
    document.getElementById('cancelRecording')?.addEventListener('click', () => {
        window.voiceManager.cancelRecording();
    });
    
    document.getElementById('sendVoice')?.addEventListener('click', () => {
        window.voiceManager.stopRecording();
    });
});
                  
