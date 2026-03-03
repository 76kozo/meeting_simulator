# ChangeLog

## 2026-03-03 - Firebase移行・セキュリティ強化・バリデーション修正

### 変更1: Vercel → Firebase 移行

#### 概要
デプロイ基盤をVercelからFirebase Hosting + Cloud Functions（asia-northeast1）に移行。

#### 変更内容
- `functions/index.js`: `server.js` の全ロジックをCloud Functionsに移植
- `functions/package.json`: Cloud Functions用の依存関係を定義
- `firebase.json`: Hosting + Functions設定（全リクエストをFunctionsにリライト）
- `hosting_empty/`: 空ディレクトリ（Hostingの静的ファイル配信を無効化）
- `.gitignore`: Firebase関連のパターンに更新
- 削除: `vercel.json`, `server.js`, `.vercel/`

#### セキュリティ
- Firebase Secretsで`GEMINI_API_KEY`と`ADMIN_PASSWORD`を管理
- 全リクエストをCloud Functions経由にルーティングし、Basic認証を全ページに適用
- Express `trust proxy` を有効化（Cloud Run リバースプロキシ対応）
- レート制限の`validate: false`設定（Cloud Functions環境対応）
- リファラーチェックをFirebase Hostingドメイン対応に修正

### 変更2: 制度検証バリデーションの誤検出修正

#### 問題
「特別支援学校高等部**3年生**」（学年）と「就労**移行**支援事業所 職員」（参加者名）の組み合わせが、「移行支援を3年利用する提案」と誤判定されていた。

#### 修正内容
- `validateSimulationContent()` を文脈考慮版に全面改修
  - 文全体ではなく**文単位**で分割し、同一文内での文脈を考慮したパターンマッチに変更
  - 「3年生」「3年度」等の学年・一般表現を正規表現で除外
  - 年齢制限チェックもB型利用の文脈（利用/通所/入所等）がある場合のみ検出
- ステップ1〜3（開会・報告・確認）ではバリデーションをスキップ
- ステップ4〜6（情報共有・意見交換・方針確認）でのみ実行

## 2026-02-02 - Gemini APIモデル更新・Vercelデプロイ修正

### 問題
- シミュレーション実行時に「APIサービスとの通信に問題が発生しました」エラーが発生
- Vercelデプロイ後にBasic認証でログインできない問題

### 原因
1. **Geminiモデル廃止**: 使用していた `gemini-2.0-flash-exp`（実験版）が廃止され、APIエラーが発生
2. **Vercel環境変数未設定**: `.vercel`ディレクトリの再作成時にプロジェクトリンクが変わり、環境変数（`GEMINI_API_KEY`, `ADMIN_PASSWORD`）が未設定の状態になった
3. **Deployment Protection**: VercelのStandard Protection（SSO認証）が有効で、アプリ自体のBasic認証の前にアクセスがブロックされていた
4. **環境変数の改行混入**: `echo`コマンドで環境変数を設定した際に末尾の改行文字が含まれ、パスワード不一致が発生

### 修正内容
- `server.js`: Gemini APIモデルを `gemini-2.0-flash-exp` → `gemini-2.5-flash` に変更（3箇所）
- Vercel環境変数 `GEMINI_API_KEY` と `ADMIN_PASSWORD` を再設定
- Vercel Deployment Protection（Standard Protection）を無効化
- 環境変数を `printf` で改行なしに再設定して認証問題を解消
