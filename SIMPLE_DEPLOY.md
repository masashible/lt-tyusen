# 🚀 簡単デプロイガイド（推奨）

## 🎯 Vercel + Firebase での公開（最も簡単）

### 📋 事前準備
1. [GitHub](https://github.com) アカウント作成
2. [Vercel](https://vercel.com) アカウント作成（GitHubでサインイン）
3. [Firebase](https://firebase.google.com) アカウント作成（Googleアカウント）

## 🗂️ ステップ1: GitHubにアップロード

### 1. GitHubリポジトリ作成
```bash
cd /Users/masashi.kitagawa/claude-test/lt-tyusen
git init
git add .
git commit -m "Initial commit"
```

GitHub で新しいリポジトリ作成後：
```bash
git remote add origin https://github.com/USERNAME/lt-tyusen.git
git push -u origin main
```

## 🔥 ステップ2: Firebase設定

### 1. Firebase プロジェクト作成
- [Firebase Console](https://console.firebase.google.com) を開く
- 「プロジェクトを追加」をクリック
- プロジェクト名: `lt-tyusen`

### 2. Firestore データベース作成
- 「Firestore Database」を選択
- 「データベースを作成」
- 「テストモードで開始」を選択
- ロケーション: `asia-northeast1` (東京)

### 3. Web アプリ登録
- プロジェクト設定 → 「アプリを追加」→ Web
- アプリ名: `lt-tyusen`
- Firebase SDK設定をコピー

## 📝 ステップ3: コード修正

### 1. Firebase SDK 追加
`index.html` と `admin/lottery.html` の `<head>` に追加：
```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore-compat.js"></script>
<script>
  // Firebase 設定（Firebase コンソールからコピー）
  const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
</script>
```

### 2. API.js 修正
`shared/api.js` をFirestore用に変更：
```javascript
const API = {
    // Firestore を使用
    async getParticipants() {
        const snapshot = await db.collection('participants').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async addParticipant(name) {
        const participant = {
            name,
            appliedAt: new Date().toISOString(),
            isDrawn: false,
            drawOrder: null
        };
        const docRef = await db.collection('participants').add(participant);
        return { id: docRef.id, ...participant };
    },

    async drawLottery() {
        const participants = await this.getParticipants();
        const undrawn = participants.filter(p => !p.isDrawn);
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
    },

    async resetLottery() {
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
    },

    async clearAllParticipants() {
        const participants = await this.getParticipants();
        const batch = db.batch();
        
        participants.forEach(participant => {
            const ref = db.collection('participants').doc(participant.id);
            batch.delete(ref);
        });
        
        await batch.commit();
        return [];
    }
};
```

## 🌐 ステップ4: Vercel デプロイ

### 1. Vercel にアクセス
- [vercel.com](https://vercel.com) でサインイン
- 「New Project」をクリック
- GitHub リポジトリを選択

### 2. デプロイ設定
- Framework Preset: `Other`
- Root Directory: `./`
- Build Command: 空欄
- Output Directory: `./`

### 3. デプロイ実行
- 「Deploy」ボタンクリック
- 数分でデプロイ完了

## 🎉 完成！

### アクセス URL
- **申し込み画面**: https://your-app.vercel.app/
- **抽選管理画面**: https://your-app.vercel.app/admin/lottery.html

### 💰 料金
- **Vercel**: 無料（個人利用）
- **Firebase**: 無料枠あり（月間数万アクセス）

## 🔄 更新方法
GitHubにpushするだけで自動デプロイ！
```bash
git add .
git commit -m "Update"
git push
```

## 🔒 セキュリティ設定

### Firebase セキュリティルール
Firestore のセキュリティルールを設定：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /participants/{document} {
      allow read, write: if true; // 本番では適切な認証ルールに変更
    }
  }
}
```