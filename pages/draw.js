class DrawPage {
    constructor() {
        console.log('DrawPage constructor called');
        this.drawBtn = document.getElementById('draw-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.drawStatus = document.getElementById('draw-status');
        this.drawnList = document.getElementById('drawn-list');
        this.undrawnList = document.getElementById('undrawn-list');
        this.drawnCount = document.getElementById('drawn-count');
        this.undrawnCount = document.getElementById('undrawn-count');
        
        console.log('DrawPage elements:', {
            drawBtn: !!this.drawBtn,
            resetBtn: !!this.resetBtn,
            drawStatus: !!this.drawStatus
        });
        
        this.participants = [];
        
        this.initEventListeners();
        this.loadParticipants();
    }

    initEventListeners() {
        this.drawBtn.addEventListener('click', () => this.handleDraw());
        this.resetBtn.addEventListener('click', () => this.handleReset());
    }


    async loadParticipants() {
        try {
            this.participants = await API.getParticipants();
            this.renderParticipants();
            this.updateStatus();
        } catch (error) {
            console.error('参加者リスト取得エラー:', error);
            this.drawStatus.innerHTML = 'データの読み込みに失敗しました';
            this.drawStatus.className = 'draw-status warning';
        }
    }

    async handleDraw() {
        console.log('handleDraw called');
        console.log('Current participants:', this.participants);
        
        const undrawnParticipants = this.participants.filter(p => !p.isDrawn);
        console.log('Undrawn participants count:', undrawnParticipants.length);
        
        if (undrawnParticipants.length === 0) {
            console.log('No undrawn participants');
            Utils.showMessage('抽選対象の参加者がいません', 'error');
            return;
        }

        this.setLoading(true);
        console.log('Starting lottery...');

        try {
            const result = await API.drawLottery();
            console.log('Lottery result:', result);
            
            this.participants = result;
            
            Utils.showMessage(`${undrawnParticipants.length}名の抽選が完了しました！`, 'success');
            
            this.renderParticipants();
            this.updateStatus();
            
            this.animateNewlyDrawn();
            
        } catch (error) {
            console.error('抽選エラー:', error);
            Utils.showMessage(error.message || '抽選に失敗しました', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleReset() {
        if (!confirm('抽選結果をリセットしてもよろしいですか？')) {
            return;
        }

        this.setLoading(true);

        try {
            this.participants = await API.resetLottery();
            
            Utils.showMessage('抽選結果をリセットしました', 'success');
            
            this.renderParticipants();
            this.updateStatus();
            
        } catch (error) {
            console.error('リセットエラー:', error);
            Utils.showMessage(error.message || 'リセットに失敗しました', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    renderParticipants() {
        const drawnParticipants = this.participants
            .filter(p => p.isDrawn)
            .sort((a, b) => a.drawOrder - b.drawOrder);
        
        const undrawnParticipants = this.participants
            .filter(p => !p.isDrawn)
            .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        this.drawnCount.textContent = drawnParticipants.length;
        this.undrawnCount.textContent = undrawnParticipants.length;

        this.drawnList.innerHTML = drawnParticipants.length > 0
            ? drawnParticipants.map(p => this.renderParticipantCard(p, true)).join('')
            : '<div class="empty-state">まだ抽選されていません</div>';

        this.undrawnList.innerHTML = undrawnParticipants.length > 0
            ? undrawnParticipants.map(p => this.renderParticipantCard(p, false)).join('')
            : '<div class="empty-state">未抽選の参加者はいません</div>';
    }

    renderParticipantCard(participant, isDrawn) {
        const cardClass = isDrawn ? 'drawn' : 'undrawn';
        const orderBadge = isDrawn 
            ? `<span class="draw-order">${participant.drawOrder}番目</span>`
            : '';

        return `
            <div class="participant-card ${cardClass}" data-id="${participant.id}">
                <div class="participant-header">
                    <span class="participant-name">${this.escapeHtml(participant.name)}</span>
                    ${orderBadge}
                </div>
                <div class="participant-meta">
                    <span class="applied-time">申込: ${Utils.formatDate(participant.appliedAt)}</span>
                </div>
            </div>
        `;
    }

    updateStatus() {
        const totalParticipants = this.participants.length;
        const drawnParticipants = this.participants.filter(p => p.isDrawn).length;
        const undrawnParticipants = totalParticipants - drawnParticipants;

        if (totalParticipants === 0) {
            this.drawStatus.innerHTML = '参加者がいません。まず申し込みページで参加者を登録してください。';
            this.drawStatus.className = 'draw-status warning';
            this.drawBtn.disabled = true;
            this.resetBtn.style.display = 'none';
            return;
        }

        if (undrawnParticipants === 0) {
            this.drawStatus.innerHTML = `🎉 全${totalParticipants}名の抽選が完了しました！`;
            this.drawStatus.className = 'draw-status success';
            this.drawBtn.disabled = true;
            this.resetBtn.style.display = 'inline-block';
            
            const completeMessage = document.createElement('div');
            completeMessage.className = 'lottery-complete';
            completeMessage.textContent = '全員の抽選が完了しました！';
            
            const container = this.drawStatus.parentNode;
            if (!container.querySelector('.lottery-complete')) {
                container.insertBefore(completeMessage, this.drawStatus.nextSibling);
            }
        } else {
            this.drawStatus.innerHTML = `参加者${totalParticipants}名中、${drawnParticipants}名が抽選済みです。残り${undrawnParticipants}名が未抽選です。`;
            this.drawStatus.className = 'draw-status';
            this.drawBtn.disabled = false;
            this.resetBtn.style.display = drawnParticipants > 0 ? 'inline-block' : 'none';
            
            const existingComplete = document.querySelector('.lottery-complete');
            if (existingComplete) {
                existingComplete.remove();
            }
        }
    }

    animateNewlyDrawn() {
        const drawnCards = this.drawnList.querySelectorAll('.participant-card.drawn');
        drawnCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('draw-animation');
                setTimeout(() => {
                    card.classList.remove('draw-animation');
                }, 2000);
            }, index * 200);
        });
    }

    setLoading(loading) {
        this.drawBtn.disabled = loading;
        this.resetBtn.disabled = loading;
        this.drawBtn.textContent = loading ? '抽選中...' : '抽選開始';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

new DrawPage();