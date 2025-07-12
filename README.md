# プレゼン登壇者抽選アプリ

プレゼンテーション登壇者の抽選順を決めるWebアプリケーションです。

## 機能

- **申し込み画面** (`/apply`): 参加者が名前を入力して抽選に申し込み
- **抽選画面** (`/draw`): 管理者が抽選を実行して順番を決定

## 技術構成

- **フロントエンド**: HTML/CSS/Vanilla JavaScript
- **バックエンド**: AWS Amplify + Lambda + DynamoDB
- **ローカル開発**: デモモード (LocalStorage使用)

## ローカル開発

```bash
# サーバー起動
npm start
# または
python3 -m http.server 8080

# ブラウザでアクセス
open http://localhost:8080
```

ローカル環境では自動的にデモモードで動作し、サンプルデータが表示されます。

## AWS Amplify デプロイ

### 前提条件

- AWS CLI のインストールと設定
- Amplify CLI のインストール

```bash
npm install -g @aws-amplify/cli
amplify configure
```

### デプロイ手順

1. **Amplify プロジェクト初期化**
```bash
amplify init
```

2. **API とストレージを追加**
```bash
# DynamoDB テーブル追加
amplify add storage
# 設定例:
# - サービス: DynamoDB
# - テーブル名: participants
# - パーティションキー: id (String)

# Lambda 関数追加
amplify add function
# 設定例:
# - 関数名: participants
# - テンプレート: Hello World
# - アクセス許可: DynamoDB (上記で作成したテーブル)

# API Gateway 追加
amplify add api
# 設定例:
# - サービス: REST
# - リソース名: participants
# - パス: /participants
# - Lambda関数: participants (上記で作成)
```

3. **設定ファイルを既存のものに置き換え**
```bash
# このリポジトリの amplify/backend/ 内のファイルを
# 生成された amplify/backend/ にコピー
```

4. **デプロイ実行**
```bash
amplify push
```

5. **フロントエンドのAPI URL設定**
```javascript
// shared/api.js の baseURL を更新
const API = {
    baseURL: 'https://your-api-gateway-url.amazonaws.com/prod',
    // ...
}
```

## ファイル構成

```
lt-tyusen/
├── index.html              # エントリーポイント
├── pages/                  # 各ページのコンポーネント
│   ├── apply.html/.js/.css # 申し込みページ
│   └── draw.html/.js/.css  # 抽選ページ
├── shared/                 # 共通ライブラリ
│   ├── api.js             # API通信
│   ├── common.css         # 共通スタイル
│   └── utils.js           # ユーティリティ
├── amplify/               # AWS Amplify設定
│   └── backend/
│       ├── api/           # API Gateway設定
│       ├── function/      # Lambda関数
│       └── storage/       # DynamoDB設定
└── package.json
```

## API エンドポイント

- `GET /participants` - 参加者一覧取得
- `POST /participants` - 参加者追加
- `PUT /participants/draw` - 抽選実行
- `DELETE /participants/reset` - 抽選リセット

## データモデル

```javascript
{
  "id": "string (UUID)",           // 参加者ID
  "name": "string",                // 参加者名
  "appliedAt": "string (ISO)",     // 応募日時
  "isDrawn": "boolean",            // 抽選済みフラグ
  "drawOrder": "number | null"     // 抽選順番
}
```

## セキュリティ

- 入力値のサニタイゼーション
- XSS対策
- CORS設定
- API Rate Limiting (AWS側で設定)

## トラブルシューティング

### ローカル開発時の問題

- **ページが表示されない**: HTTP サーバーが起動しているか確認
- **データが保存されない**: ブラウザの LocalStorage が有効か確認

### デプロイ時の問題

- **API エラー**: Lambda 関数のログを CloudWatch で確認
- **CORS エラー**: API Gateway の CORS 設定を確認
- **DynamoDB エラー**: IAM ロールの権限を確認

## ライセンス

MIT License