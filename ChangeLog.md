# ChangeLog

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
