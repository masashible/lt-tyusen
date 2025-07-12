class ApplyPage {
    constructor() {
        console.log('ApplyPage constructor called');
        this.form = document.getElementById('apply-form');
        this.nameInput = document.getElementById('participant-name');
        this.submitBtn = document.getElementById('submit-btn');
        this.participantsCount = document.getElementById('participants-count');
        this.participantsList = document.getElementById('participants-list');
        
        this.initEventListeners();
        this.loadParticipants();
    }

    initEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.nameInput.addEventListener('input', Utils.debounce(() => {
            this.validateInput();
        }, 300));
        
        this.nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit(e);
            }
        });
    }


    validateInput() {
        const name = this.nameInput.value.trim();
        const validation = Utils.validateName(name);
        
        if (name.length > 0 && !validation.valid) {
            this.nameInput.setCustomValidity(validation.message);
            this.submitBtn.disabled = true;
        } else {
            this.nameInput.setCustomValidity('');
            this.submitBtn.disabled = name.length === 0;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const name = this.nameInput.value.trim();
        const validation = Utils.validateName(name);
        
        if (!validation.valid) {
            Utils.showMessage(validation.message, 'error');
            return;
        }

        this.setLoading(true);

        try {
            await API.addParticipant(validation.name);
            
            Utils.showMessage(`${validation.name}さんの申し込みを受け付けました！`, 'success');
            
            this.submitBtn.classList.add('submit-success');
            setTimeout(() => {
                this.submitBtn.classList.remove('submit-success');
            }, 600);
            
            this.form.reset();
            this.submitBtn.disabled = true;
            
            await this.loadParticipants();
            
        } catch (error) {
            console.error('申し込みエラー:', error);
            Utils.showMessage(error.message || '申し込みに失敗しました', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async loadParticipants() {
        try {
            const participants = await API.getParticipants();
            this.renderParticipants(participants);
        } catch (error) {
            console.error('参加者リスト取得エラー:', error);
            this.participantsCount.textContent = '参加者リストの取得に失敗しました';
            this.participantsList.innerHTML = '<div class="empty-state">データを読み込めませんでした</div>';
        }
    }

    renderParticipants(participants) {
        const activeParticipants = participants.filter(p => !p.isDrawn);
        const drawnParticipants = participants.filter(p => p.isDrawn);
        
        this.participantsCount.innerHTML = `
            総参加者数: <strong>${participants.length}名</strong>
            ${drawnParticipants.length > 0 ? `<span style="margin-left: 1rem; color: #666;">(抽選済み: ${drawnParticipants.length}名)</span>` : ''}
        `;

        if (activeParticipants.length === 0 && drawnParticipants.length === 0) {
            this.participantsList.innerHTML = '<div class="empty-state">まだ参加者がいません</div>';
            return;
        }

        const participantsToShow = activeParticipants.length > 0 ? activeParticipants : participants;
        
        this.participantsList.innerHTML = participantsToShow
            .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
            .map(participant => `
                <div class="participant-item">
                    <span class="participant-name">${this.escapeHtml(participant.name)}</span>
                    <span class="participant-time">${Utils.formatDate(participant.appliedAt)}</span>
                </div>
            `).join('');
    }

    setLoading(loading) {
        this.submitBtn.disabled = loading;
        this.submitBtn.textContent = loading ? '送信中...' : '申し込む';
        this.nameInput.disabled = loading;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

new ApplyPage();