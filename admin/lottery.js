class LotteryPage {
    constructor() {
        console.log('LotteryPage constructor called');
        this.drawBtn = document.getElementById('draw-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.refreshBtn = document.getElementById('refresh-btn');
        this.drawStatus = document.getElementById('draw-status');
        this.drawnList = document.getElementById('drawn-list');
        this.undrawnList = document.getElementById('undrawn-list');
        this.drawnCount = document.getElementById('drawn-count');
        this.undrawnCount = document.getElementById('undrawn-count');
        
        console.log('LotteryPage elements:', {
            drawBtn: !!this.drawBtn,
            resetBtn: !!this.resetBtn,
            refreshBtn: !!this.refreshBtn,
            drawStatus: !!this.drawStatus
        });
        
        this.participants = [];
        
        this.initEventListeners();
        this.showAdminNote();
        this.loadParticipants();
    }

    initEventListeners() {
        this.drawBtn.addEventListener('click', () => this.handleDraw());
        this.resetBtn.addEventListener('click', () => this.handleReset());
        this.refreshBtn.addEventListener('click', () => this.loadParticipants());
        
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.handleClearAll());
        }
    }

    showAdminNote() {
        const container = document.querySelector('.container');
        const adminNote = document.createElement('div');
        adminNote.className = 'admin-note';
        adminNote.innerHTML = `
            <strong>🔐 管理者画面</strong><br>
            この画面は抽選管理用です。参加者の申し込みは <a href="../index.html">申し込み画面</a> で行ってください。
        `;
        container.insertBefore(adminNote, container.firstChild);
    }

    async loadParticipants() {
        try {
            console.log('Loading participants...');
            this.participants = await API.getParticipants();
            console.log('Loaded participants:', this.participants);
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
        console.log('Starting lottery animation...');

        try {
            // アニメーション付きで抽選を実行
            await this.showLotteryAnimation(undrawnParticipants);
            
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

    async showLotteryAnimation(participants) {
        return new Promise((resolve) => {
            // オーバーレイを作成
            const overlay = document.createElement('div');
            overlay.className = 'lottery-overlay';
            
            // ルーレット
            const wheel = document.createElement('div');
            wheel.className = 'lottery-wheel';
            
            // 参加者リスト
            const participantsList = document.createElement('div');
            participantsList.className = 'lottery-participants';
            
            participants.forEach((participant, index) => {
                const participantEl = document.createElement('div');
                participantEl.className = 'lottery-participant';
                participantEl.textContent = participant.name;
                participantEl.style.animationDelay = `${index * 0.1}s`;
                participantsList.appendChild(participantEl);
            });
            
            // メッセージ
            const message = document.createElement('div');
            message.className = 'lottery-message';
            message.textContent = 'プレゼンテーション順序抽選を開始します...';
            
            // 結果表示エリア
            const result = document.createElement('div');
            result.className = 'lottery-result-area';
            
            // 閉じるボタン
            const closeBtn = document.createElement('button');
            closeBtn.className = 'lottery-close';
            closeBtn.textContent = '閉じる';
            closeBtn.style.display = 'none';
            
            overlay.appendChild(closeBtn);
            overlay.appendChild(message);
            overlay.appendChild(wheel);
            overlay.appendChild(participantsList);
            overlay.appendChild(result);
            
            document.body.appendChild(overlay);
            
            // アニメーション開始
            setTimeout(() => {
                wheel.classList.add('spinning');
                message.textContent = '順番を決定中...';
            }, 1000);
            
            // 順番決定アニメーション
            setTimeout(() => {
                this.animateOrderSelection(participants, participantsList, result, closeBtn, overlay, resolve);
            }, 2000);
        });
    }

    animateOrderSelection(participants, participantsList, result, closeBtn, overlay, resolve) {
        const shuffled = Utils.fisherYatesShuffle([...participants]);
        let currentStep = 0;
        let speed = 150;
        
        // 結果表示エリアを準備
        result.innerHTML = '<h3 style="color: white; margin-bottom: 1rem;">🎯 プレゼンテーション順序</h3>';
        const orderList = document.createElement('div');
        orderList.className = 'lottery-order-list';
        result.appendChild(orderList);
        
        const revealNext = () => {
            if (currentStep < shuffled.length) {
                // 参加者を一つずつハイライト
                document.querySelectorAll('.lottery-participant').forEach(el => {
                    el.classList.remove('selected');
                });
                
                // ランダムに選択演出
                let flashCount = 0;
                const flashInterval = setInterval(() => {
                    const randomIndex = Math.floor(Math.random() * participants.length);
                    document.querySelectorAll('.lottery-participant').forEach(el => {
                        el.classList.remove('selected');
                    });
                    participantsList.children[randomIndex].classList.add('selected');
                    
                    flashCount++;
                    if (flashCount > 8) {
                        clearInterval(flashInterval);
                        
                        // 最終的に決定した参加者をハイライト
                        const selectedParticipant = shuffled[currentStep];
                        const selectedIndex = participants.findIndex(p => p.id === selectedParticipant.id);
                        
                        document.querySelectorAll('.lottery-participant').forEach(el => {
                            el.classList.remove('selected');
                        });
                        participantsList.children[selectedIndex].classList.add('selected', 'order-decided');
                        
                        // 順序リストに追加
                        const orderItem = document.createElement('div');
                        orderItem.className = 'order-item';
                        orderItem.innerHTML = `
                            <span class="order-number">${currentStep + 1}</span>
                            <span class="order-name">${selectedParticipant.name}</span>
                        `;
                        orderList.appendChild(orderItem);
                        
                        // アニメーション
                        setTimeout(() => {
                            orderItem.classList.add('revealed');
                        }, 100);
                        
                        currentStep++;
                        
                        // 次の参加者へ
                        setTimeout(() => {
                            revealNext();
                        }, 1000);
                    }
                }, 100);
            } else {
                // 全員の順序決定完了
                setTimeout(() => {
                    const finalMessage = document.createElement('div');
                    finalMessage.className = 'lottery-final-message';
                    finalMessage.innerHTML = '🎉 全員の発表順序が決定しました！';
                    result.appendChild(finalMessage);
                    
                    closeBtn.style.display = 'block';
                    
                    closeBtn.onclick = () => {
                        overlay.remove();
                        resolve();
                    };
                    
                    // 5秒後に自動で閉じる
                    setTimeout(() => {
                        if (overlay.parentNode) {
                            overlay.remove();
                            resolve();
                        }
                    }, 5000);
                }, 1000);
            }
        };
        
        revealNext();
    }

    async handleReset() {
        if (!confirm('抽選結果をリセットしてもよろしいですか？\n※この操作は取り消せません')) {
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

    async handleClearAll() {
        const confirmMessage = '⚠️ 全ての申し込みデータを削除します\n\n' +
                             '・全ての参加者データが削除されます\n' +
                             '・抽選結果も削除されます\n' +
                             '・この操作は元に戻せません\n\n' +
                             '本当に実行しますか？';
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // 2回目の確認
        if (!confirm('最終確認です。\n全てのデータを削除してもよろしいですか？')) {
            return;
        }

        this.setLoading(true);

        try {
            this.participants = await API.clearAllParticipants();
            
            Utils.showMessage('全てのデータを削除しました', 'success');
            
            this.renderParticipants();
            this.updateStatus();
            
        } catch (error) {
            console.error('全削除エラー:', error);
            Utils.showMessage(error.message || 'データの削除に失敗しました', 'error');
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
            ? `<span class="draw-order">発表順: ${participant.drawOrder}番目</span>`
            : '<span class="undrawn-badge">未抽選</span>';

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
            this.drawStatus.innerHTML = '参加者がいません。<a href="../index.html">申し込み画面</a>で参加者を登録してください。';
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
            completeMessage.textContent = '全員の抽選が完了しました！結果を印刷またはコピーして保存してください。';
            
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
        this.refreshBtn.disabled = loading;
        
        const clearAllBtn = document.getElementById('clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.disabled = loading;
        }
        
        this.drawBtn.textContent = loading ? '抽選中...' : '抽選開始';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}