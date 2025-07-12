const API = {
    // Firestore を使用
    async getParticipants() {
        try {
            const snapshot = await db.collection('participants').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('参加者リスト取得エラー:', error);
            throw error;
        }
    },

    async addParticipant(name) {
        const validation = Utils.validateName(name);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        try {
            // 重複チェック
            const existing = await this.getParticipants();
            if (existing.some(p => p.name === validation.name)) {
                throw new Error('同じ名前の参加者が既に登録されています');
            }

            const participant = {
                name: validation.name,
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            };
            
            const docRef = await db.collection('participants').add(participant);
            return { id: docRef.id, ...participant };
        } catch (error) {
            console.error('参加者追加エラー:', error);
            throw error;
        }
    },

    async drawLottery() {
        try {
            const participants = await this.getParticipants();
            const undrawn = participants.filter(p => !p.isDrawn);
            
            if (undrawn.length === 0) {
                throw new Error('抽選対象の参加者がいません');
            }
            
            const shuffled = Utils.fisherYatesShuffle(undrawn);
            
            const batch = db.batch();
            const maxOrder = Math.max(0, ...participants.map(p => p.drawOrder || 0));
            
            shuffled.forEach((participant, index) => {
                const ref = db.collection('participants').doc(participant.id);
                batch.update(ref, {
                    isDrawn: true,
                    drawOrder: maxOrder + index + 1
                });
            });
            
            await batch.commit();
            return await this.getParticipants();
        } catch (error) {
            console.error('抽選実行エラー:', error);
            throw error;
        }
    },

    async resetLottery() {
        try {
            const participants = await this.getParticipants();
            const batch = db.batch();
            
            participants.forEach(participant => {
                const ref = db.collection('participants').doc(participant.id);
                batch.update(ref, {
                    isDrawn: false,
                    drawOrder: firebase.firestore.FieldValue.delete()
                });
            });
            
            await batch.commit();
            return await this.getParticipants();
        } catch (error) {
            console.error('抽選リセットエラー:', error);
            throw error;
        }
    },

    async clearAllParticipants() {
        try {
            const participants = await this.getParticipants();
            const batch = db.batch();
            
            participants.forEach(participant => {
                const ref = db.collection('participants').doc(participant.id);
                batch.delete(ref);
            });
            
            await batch.commit();
            return [];
        } catch (error) {
            console.error('全データ削除エラー:', error);
            throw error;
        }
    }
};