const API = {
    baseURL: 'https://your-api-gateway-url.amazonaws.com/prod', // ← Amplify デプロイ後にここを更新
    
    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP Error: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            
            return await response.text();
        } catch (error) {
            console.error('API Request Error:', error);
            
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('ネットワークに接続できません。インターネット接続を確認してください。');
            }
            
            throw error;
        }
    },

    async getParticipants() {
        try {
            const response = await this.request('/participants');
            return response.participants || [];
        } catch (error) {
            console.error('参加者リスト取得エラー:', error);
            
            const cached = Utils.getFromLocalStorage('participants', []);
            if (cached.length > 0) {
                Utils.showMessage('オフラインモード: キャッシュされたデータを表示しています', 'error', 5000);
                return cached;
            }
            
            throw error;
        }
    },

    async addParticipant(name) {
        const validation = Utils.validateName(name);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        try {
            const response = await this.request('/participants', {
                method: 'POST',
                body: { name: validation.name }
            });
            
            // デモモードではupdateLocalCacheを呼ばない（simulateAPIで既に更新済み）
            if (!Utils.getFromLocalStorage('demoMode', false)) {
                this.updateLocalCache();
            }
            return response;
        } catch (error) {
            console.error('参加者追加エラー:', error);
            throw error;
        }
    },

    async drawLottery() {
        try {
            const response = await this.request('/participants/draw', {
                method: 'PUT'
            });
            
            // デモモードではupdateLocalCacheを呼ばない（simulateAPIで既に更新済み）
            if (!Utils.getFromLocalStorage('demoMode', false)) {
                this.updateLocalCache();
            }
            return response.participants || [];
        } catch (error) {
            console.error('抽選実行エラー:', error);
            throw error;
        }
    },

    async resetLottery() {
        try {
            const response = await this.request('/participants/reset', {
                method: 'DELETE'
            });
            
            // デモモードではupdateLocalCacheを呼ばない（simulateAPIで既に更新済み）
            if (!Utils.getFromLocalStorage('demoMode', false)) {
                this.updateLocalCache();
            }
            return response.participants || [];
        } catch (error) {
            console.error('抽選リセットエラー:', error);
            throw error;
        }
    },

    async clearAllParticipants() {
        try {
            const response = await this.request('/participants/clear', {
                method: 'DELETE'
            });
            
            // デモモードではupdateLocalCacheを呼ばない（simulateAPIで既に更新済み）
            if (!Utils.getFromLocalStorage('demoMode', false)) {
                this.updateLocalCache();
            }
            return response.participants || [];
        } catch (error) {
            console.error('全データ削除エラー:', error);
            throw error;
        }
    },

    async updateLocalCache() {
        try {
            const participants = await this.getParticipants();
            Utils.setToLocalStorage('participants', participants);
            Utils.setToLocalStorage('lastSync', new Date().toISOString());
        } catch (error) {
            console.error('キャッシュ更新エラー:', error);
        }
    },

    getDemoData() {
        return [
            {
                id: Utils.generateId(),
                name: '田中太郎',
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            },
            {
                id: Utils.generateId(),
                name: '佐藤花子',
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            },
            {
                id: Utils.generateId(),
                name: '鈴木一郎',
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            }
        ];
    },

    async initDemoMode() {
        const demoData = this.getDemoData();
        Utils.setToLocalStorage('participants', demoData);
        Utils.setToLocalStorage('demoMode', true);
        Utils.showMessage('デモモードで動作しています', 'error', 5000);
        return demoData;
    },

    async simulateAPI(endpoint, options = {}) {
        console.log('simulateAPI called:', endpoint, options);
        await Utils.sleep(500);
        
        const participants = Utils.getFromLocalStorage('participants', []);
        
        switch (endpoint) {
            case '/participants':
                if (options.method === 'POST') {
                    let requestData;
                    try {
                        requestData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                    } catch (error) {
                        console.error('JSON parse error:', error, options.body);
                        throw new Error('無効なJSONデータです');
                    }
                    
                    const { name } = requestData;
                    console.log('Adding participant:', name);
                    
                    if (participants.some(p => p.name === name)) {
                        throw new Error('同じ名前の参加者が既に登録されています');
                    }
                    
                    const newParticipant = {
                        id: Utils.generateId(),
                        name,
                        appliedAt: new Date().toISOString(),
                        isDrawn: false,
                        drawOrder: null
                    };
                    
                    participants.push(newParticipant);
                    Utils.setToLocalStorage('participants', participants);
                    console.log('Participant added:', newParticipant);
                    return newParticipant;
                }
                return { participants };
                
            case '/participants/draw':
                console.log('Draw lottery called');
                console.log('All participants:', participants);
                const undrawn = participants.filter(p => !p.isDrawn);
                console.log('Undrawn participants:', undrawn);
                
                if (undrawn.length === 0) {
                    console.log('No participants to draw');
                    throw new Error('抽選対象の参加者がいません');
                }
                
                const shuffled = Utils.fisherYatesShuffle(undrawn);
                console.log('Shuffled participants:', shuffled);
                
                const maxOrder = Math.max(0, ...participants.map(p => p.drawOrder || 0));
                console.log('Max existing order:', maxOrder);
                
                shuffled.forEach((participant, index) => {
                    const p = participants.find(p => p.id === participant.id);
                    if (p) {
                        p.isDrawn = true;
                        p.drawOrder = maxOrder + index + 1;
                        console.log(`Updated participant ${p.name}: order ${p.drawOrder}`);
                    }
                });
                
                Utils.setToLocalStorage('participants', participants);
                const sortedParticipants = participants.sort((a, b) => (a.drawOrder || 0) - (b.drawOrder || 0));
                console.log('Final participants after draw:', sortedParticipants);
                return { participants: sortedParticipants };
                
            case '/participants/reset':
                participants.forEach(p => {
                    p.isDrawn = false;
                    p.drawOrder = null;
                });
                Utils.setToLocalStorage('participants', participants);
                return { participants };
                
            case '/participants/clear':
                console.log('Clearing all participants');
                Utils.setToLocalStorage('participants', []);
                return { participants: [] };
                
            default:
                throw new Error('Unknown endpoint');
        }
    }
};

// ローカル環境ではデモモードを有効化
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // デモモードを自動的に有効にする
    if (!Utils.getFromLocalStorage('demoMode', false)) {
        const demoData = [
            {
                id: 'demo-1',
                name: '田中太郎',
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            },
            {
                id: 'demo-2',
                name: '佐藤花子',
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            },
            {
                id: 'demo-3',
                name: '鈴木一郎',
                appliedAt: new Date().toISOString(),
                isDrawn: false,
                drawOrder: null
            }
        ];
        Utils.setToLocalStorage('participants', demoData);
        Utils.setToLocalStorage('demoMode', true);
        console.log('デモモードが有効になりました');
    }
    
    const originalRequest = API.request;
    API.request = function(endpoint, options = {}) {
        return this.simulateAPI(endpoint, options);
    };
}