// server.js 実行開始ログ
console.log("Starting server.js...");
require('dotenv').config(); // .envファイルから環境変数を読み込む
console.log(".env loaded.");
const express = require('express');
console.log("Express loaded.");
const cors = require('cors');
console.log("CORS loaded.");
const path = require('path');
const basicAuth = require('express-basic-auth');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Basic認証の設定
const users = {
    'admin': process.env.ADMIN_PASSWORD || 'default_password'
};

const auth = basicAuth({
    users,
    challenge: true,
    realm: 'Meeting Simulator'
});

// すべてのルートにBasic認証を適用
app.use(auth);

// レート制限の設定
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 50 // 15分あたり50リクエストまで
});

app.use('/api/', limiter);

// リファラーチェック
app.use((req, res, next) => {
    const referer = req.get('Referer');
    if (req.path.startsWith('/api/') && (!referer || !referer.includes(req.get('host')))) {
        return res.status(403).json({ error: '不正なアクセスです' });
    }
    next();
});

// CORSミドルウェアを設定（API ルートの前に配置）
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGIN || false
        : 'http://localhost:3000',
    credentials: true
}));

// 静的ファイルの提供
app.use(express.static('public'));

// ルートパスのハンドリング
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// JSONリクエストボディを解析するためのミドルウェア
app.use(express.json());

// Gemini APIキーを環境変数から取得
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error("エラー: GEMINI_API_KEY が .env ファイルに設定されていません。");
}

// フロントエンドからのシミュレーションリクエストを処理するエンドポイント
app.post('/api/generate-simulation', async (req, res) => {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        return res.status(500).json({ error: 'サーバー側でAPIキーが設定されていません。' });
    }

    try {
        const { basicInfo, assessmentSummary, observationPoints, participants, settings } = req.body;

        if (!basicInfo || !assessmentSummary || !participants) {
            return res.status(400).json({ error: '必要な情報が不足しています。' });
        }

        // デフォルトのロール説明
        const defaultRoleDescriptions = {
            '就労選択支援員': 'アセスメント結果を客観的に報告し、会議全体の進行を担当し、各参加者の意見を引き出し、中立的な立場から支援方針をまとめる視点を持つ。特に本人の意見を丁寧に聞き出すことを心がける。',
            '特別支援学校教員': '学校生活での様子、強み、課題を共有し、教育的観点から本人の特性を評価し、進路指導の経験から適切な選択肢を提案する視点を持つ。',
            '相談支援専門員': '本人の生活状況や家族の意向を把握・代弁し、福祉サービスの情報提供や利用調整を行い、長期的な視点での生活設計を支援する視点を持つ。',
            '就労継続支援B型事業所 職員': '事業所の特徴、作業内容、受け入れ体制を説明し、本人の適性や必要な配慮について意見を述べ、実習時の様子などを共有する視点を持つ。',
            '就労移行支援事業所 職員': '就労移行支援のプログラム内容や効果を説明し、一般就労の可能性や必要なスキルについて意見を述べ、B型事業所との連携やステップアップを提案する視点を持つ。',
            '障害者就業・生活支援センター 支援員': '地域の就労支援ネットワークや利用可能な社会資源について情報提供し、就職活動のサポートや定着支援について説明し、関係機関との連携調整役を担う視点を持つ。',
            '保護者': '家庭での本人の様子や将来への希望、不安を伝え、支援方針に対する意向を表明する視点を持つ。',
            '本人': '自分の希望や気持ちを積極的に表現し、質問に対して具体的に答える。実習や作業で感じたこと、好きな作業、苦手なこと、将来の希望など、自分の意見をしっかりと伝える。ただし、答えに詰まった場合は、支援者からの丁寧な質問で引き出してもらう。'
        };
        
        // カスタムロール設定があれば使用、なければデフォルトを使用
        const roleDescriptions = (settings && settings.customRoles && Object.keys(settings.customRoles).length > 0) 
            ? settings.customRoles 
            : defaultRoleDescriptions;

        const participantListWithRoles = participants.map(p => {
            let description = '（特記事項なし）';
            let specificInstruction = '';

            for (const roleKey in roleDescriptions) {
                if (p.role && p.role.includes(roleKey)) {
                    description = roleDescriptions[roleKey];
                    if (roleKey === '相談支援専門員') {
                        specificInstruction = '特に、本人の生活状況や家族の意向を踏まえ、利用可能な福祉サービス（例：グループホーム、移動支援など）や長期的な生活設計について具体的に言及・提案してください。';
                    }
                    break;
                } else if (!p.role && roleKey === '本人' && p.name.includes('本人')) {
                    description = roleDescriptions['本人'];
                    break;
                } else if (!p.role && roleKey === '保護者' && p.name.includes('保護者')) {
                    description = roleDescriptions['保護者'];
                    break;
                }
            }
            const rolePart = p.role ? `（${p.role}）` : '';
            const fullDescription = description + (specificInstruction ? ` ${specificInstruction}` : '');
            return `- ${p.name}${rolePart}: ${fullDescription}`;
        }).join('\n');

        const prompt = `
システムプロンプト

あなたは多機関連携会議のシミュレーションを行うためのAIアシスタントです。障害者の就労支援に関する専門知識を持ち、以下の各参加者の役割と期待される視点を理解して、リアルな会議の流れを再現してください。

## シミュレーションの目的
このシミュレーションは、障害者の就労選択支援における多機関連携会議の流れと各参加者の視点を再現し、支援方針決定のプロセスを明らかにすることを目的としています。

## ケース情報
# 対象者の基本情報
${basicInfo}

# アセスメント結果概要
${assessmentSummary}

# 就労選択支援事業での観察ポイント
${observationPoints || '特記事項なし'}

## 実際の参加者と期待される視点【重要：各参加者はこの視点に基づいて発言してください】
以下のリストにある各参加者は、記載された期待される視点に基づいて発言を行ってください。特に指示がある場合はそれに従ってください。
${participantListWithRoles}

## 会議の進行手順【重要：以下の7ステップに沿って議論を進めてください】
会議は以下の7つのステップで段階的に進行するように、自然な会話の流れを生成してください。各ステップの内容を省略せず、それぞれの議論を適切に行ってください。セクションタイトル（###）は出力に含めないでください。

1.  **開会・参加者紹介**: 進行役が開会宣言と目的説明後、各参加者が簡潔に自己紹介を行う。本人からも自己紹介と簡単な抱負を述べてもらう。
2.  **就労選択支援での観察結果報告**: 進行役（就労選択支援員）がアセスメント結果と観察ポイントを具体的に報告する。本人に実際の感想を確認する。
3.  **本人の希望・意向の確認**: 進行役が本人と保護者に、就労に関する希望や支援で感じたことなどを質問し、意向を確認する。本人には作業で楽しかったこと、頑張れたこと、不安なことなどを具体的に聞き出す。
4.  **各機関からの情報共有**: 学校教員、B型事業所職員、移行支援事業所職員などが、それぞれの立場から本人の状況や事業所の情報を提供する。各報告の後で本人の感想や質問を確認する。
5.  **意見交換**: 相談支援専門員、センター支援員などが中心となり、これまでの情報に基づき、専門的見地から意見交換や質疑応答を行う。本人の理解度を確認しながら進める。
6.  **方向性の検討**: 進行役が議論を整理し、B型利用、移行支援利用、その他の可能性など、今後の具体的な方向性について参加者全員で議論する。本人の意見も積極的に引き出す。
7.  **支援方針の確認**: 進行役が議論の結果を踏まえ、具体的な支援方針を提案し、参加者の合意を確認する。本人に分かりやすく説明し、各機関の役割分担と次回の会議予定なども確認する。最後に本人から決意表明や感想を聞き、保護者の最終意向も確認して閉会する。

## 表現上の注意点
-   各参加者の専門性や立場、期待される視点を反映した自然な対話を心がける
-   障害者本人を尊重した表現を使用する
-   現実的な支援の選択肢や制度的制約を考慮する
-   専門用語は適切に使用し、必要に応じて噛み砕いた説明を加える

## 出力形式
「参加者名（役割）: 発言内容」または「参加者名: 発言内容」の形式で、会議の流れに沿った対話形式のみで出力してください。（ステップタイトルは含めないでください）
会議の最後に、決定された支援方針の要点をまとめてください。

# シミュレーション開始:
`;

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ "text": prompt }] }]
        };

        console.log("Gemini APIへのリクエストボディ:", JSON.stringify(requestBody, null, 2));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45秒でタイムアウト

        try {
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!apiResponse.ok) {
                throw new Error(`Gemini APIエラー: ${apiResponse.status}`);
            }

            const responseData = await apiResponse.json();
            console.log("Gemini APIからのレスポンス:", JSON.stringify(responseData, null, 2));

            const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!generatedText) {
                throw new Error('APIから有効なテキストが返されませんでした。');
            }

            // 生成内容の制度的妥当性を検証
            const violations = validateSimulationContent(generatedText);
            const validationWarning = generateValidationWarning(violations);
            
            // 検証結果を含めてレスポンス
            const response = { 
                simulation: generatedText,
                validation: {
                    violations: violations,
                    warning: validationWarning
                }
            };

            res.json(response);
        } catch (error) {
            console.error('APIリクエストエラー:', error);
            let statusCode = 500;
            let errorMessage = 'サーバー内部でエラーが発生しました。';
            
            if (error.name === 'AbortError') {
                statusCode = 504;
                errorMessage = 'リクエストがタイムアウトしました。しばらく時間をおいて再度お試しください。';
            } else if (error.message.includes('API')) {
                statusCode = 502;
                errorMessage = 'APIサービスとの通信に問題が発生しました。';
            }
            
            res.status(statusCode).json({ 
                error: errorMessage,
                details: error.message 
            });
        }
    } catch (error) {
        console.error('サーバーエラー:', error);
        res.status(500).json({ 
            error: 'サーバー内部でエラーが発生しました。',
            details: error.message 
        });
    }
});

// AI要約・提案生成エンドポイント
app.post('/api/generate-summary', async (req, res) => {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        return res.status(500).json({ error: 'サーバー側でAPIキーが設定されていません。' });
    }

    try {
        const { formData, meetingLog } = req.body;

        if (!formData || !meetingLog) {
            return res.status(400).json({ error: '必要な情報が不足しています。' });
        }

        // AI要約・提案用プロンプトを生成
        const summaryPrompt = generateSummaryPrompt(formData, meetingLog);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ "text": summaryPrompt }] }]
        };

        console.log('AI要約・提案のGemini APIリクエスト:', JSON.stringify(requestBody, null, 2));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        try {
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!apiResponse.ok) {
                throw new Error(`Gemini APIエラー: ${apiResponse.status}`);
            }

            const responseData = await apiResponse.json();
            console.log('AI要約・提案のGemini APIレスポンス:', JSON.stringify(responseData, null, 2));

            const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!generatedText) {
                throw new Error('APIから有効なテキストが返されませんでした。');
            }

            res.json({ summary: generatedText });
        } catch (error) {
            console.error('APIリクエストエラー:', error);
            let statusCode = 500;
            let errorMessage = 'サーバー内部でエラーが発生しました。';
            
            if (error.name === 'AbortError') {
                statusCode = 504;
                errorMessage = 'リクエストがタイムアウトしました。しばらく時間をおいて再度お試しください。';
            } else if (error.message.includes('API')) {
                statusCode = 502;
                errorMessage = 'APIサービスとの通信に問題が発生しました。';
            }
            
            res.status(statusCode).json({ 
                error: errorMessage,
                details: error.message 
            });
        }
    } catch (error) {
        console.error('サーバーエラー:', error);
        res.status(500).json({ 
            error: 'サーバー内部でエラーが発生しました。',
            details: error.message 
        });
    }
});

// 段階別シミュレーション生成エンドポイント
app.post('/api/generate-step', async (req, res) => {
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        return res.status(500).json({ error: 'サーバー側でAPIキーが設定されていません。' });
    }

    try {
        const { stepNumber, formData, previousSteps } = req.body;
        const { basicInfo, assessmentSummary, observationPoints, participants } = formData;

        if (!basicInfo || !assessmentSummary || !participants || !stepNumber) {
            return res.status(400).json({ error: '必要な情報が不足しています。' });
        }

        // ステップ別のプロンプトを生成
        const stepPrompt = generateStepPrompt(stepNumber, formData, previousSteps);

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [{ parts: [{ "text": stepPrompt }] }]
        };

        console.log(`ステップ${stepNumber}のGemini APIリクエスト:`, JSON.stringify(requestBody, null, 2));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000); // 30秒でタイムアウト（短縮）

        try {
            const apiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!apiResponse.ok) {
                throw new Error(`Gemini APIエラー: ${apiResponse.status}`);
            }

            const responseData = await apiResponse.json();
            console.log(`ステップ${stepNumber}のGemini APIレスポンス:`, JSON.stringify(responseData, null, 2));

            const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!generatedText) {
                throw new Error('APIから有効なテキストが返されませんでした。');
            }

            // 生成内容の制度的妥当性を検証
            const violations = validateSimulationContent(generatedText);
            const validationWarning = generateValidationWarning(violations);
            
            // 検証結果を含めてレスポンス
            const response = { 
                simulation: generatedText,
                validation: {
                    violations: violations,
                    warning: validationWarning
                }
            };

            res.json(response);
        } catch (error) {
            console.error('APIリクエストエラー:', error);
            let statusCode = 500;
            let errorMessage = 'サーバー内部でエラーが発生しました。';
            
            if (error.name === 'AbortError') {
                statusCode = 504;
                errorMessage = 'リクエストがタイムアウトしました。しばらく時間をおいて再度お試しください。';
            } else if (error.message.includes('API')) {
                statusCode = 502;
                errorMessage = 'APIサービスとの通信に問題が発生しました。';
            }
            
            res.status(statusCode).json({ 
                error: errorMessage,
                details: error.message 
            });
        }
    } catch (error) {
        console.error('サーバーエラー:', error);
        res.status(500).json({ 
            error: 'サーバー内部でエラーが発生しました。',
            details: error.message 
        });
    }
});

// ステップ別プロンプト生成関数
function generateStepPrompt(stepNumber, formData, previousSteps) {
    const { basicInfo, assessmentSummary, observationPoints, participants } = formData;
    
    // デフォルトのロール説明（フロントエンドのdefaultRolesと同期）
    const defaultRoleDescriptions = {
        '就労選択支援員': 'アセスメント結果を客観的に報告し、会議全体の進行を担当し、各参加者の意見を引き出し、中立的な立場から支援方針をまとめる視点を持つ。特に本人の意見を丁寧に聞き出すことを心がける。',
        '特別支援学校教員': '学校生活での様子、強み、課題を共有し、教育的観点から本人の特性を評価し、進路指導の経験から適切な選択肢を提案する視点を持つ。',
        '相談支援専門員': '本人の生活状況や家族の意向を把握・代弁し、福祉サービスの情報提供や利用調整を行い、長期的な視点での生活設計を支援する視点を持つ。',
        '就労継続支援B型事業所 職員': '事業所の特徴、作業内容、受け入れ体制を説明し、本人の適性や必要な配慮について意見を述べ、実習時の様子などを共有する視点を持つ。',
        '就労移行支援事業所 職員': '就労移行支援のプログラム内容や効果を説明し、一般就労の可能性や必要なスキルについて意見を述べ、B型事業所との連携やステップアップを提案する視点を持つ。',
        '障害者就業・生活支援センター 支援員': '地域の就労支援ネットワークや利用可能な社会資源について情報提供し、就職活動のサポートや定着支援について説明し、関係機関との連携調整役を担う視点を持つ。',
        '保護者': '家庭での本人の様子や将来への希望、不安を伝え、支援方針に対する意向を表明する視点を持つ。',
        '本人': '自分の希望や気持ちを積極的に表現し、質問に対して具体的に答える。実習や作業で感じたこと、好きな作業、苦手なこと、将来の希望など、自分の意見をしっかりと伝える。ただし、答えに詰まった場合は、支援者からの丁寧な質問で引き出してもらう。'
    };
    
    // カスタムロール設定があれば使用、なければデフォルトを使用
    const roleDescriptions = (formData.settings && formData.settings.customRoles && Object.keys(formData.settings.customRoles).length > 0) 
        ? formData.settings.customRoles 
        : defaultRoleDescriptions;

    const participantListWithRoles = participants.map(p => {
        let description = '（特記事項なし）';
        let specificInstruction = '';

        for (const roleKey in roleDescriptions) {
            if (p.role && p.role.includes(roleKey)) {
                description = roleDescriptions[roleKey];
                if (roleKey === '相談支援専門員') {
                    specificInstruction = '特に、本人の生活状況や家族の意向を踏まえ、利用可能な福祉サービス（例：グループホーム、移動支援など）や長期的な生活設計について具体的に言及・提案してください。';
                }
                break;
            } else if (!p.role && roleKey === '本人' && p.name.includes('本人')) {
                description = roleDescriptions['本人'];
                break;
            } else if (!p.role && roleKey === '保護者' && p.name.includes('保護者')) {
                description = roleDescriptions['保護者'];
                break;
            }
        }
        const rolePart = p.role ? `（${p.role}）` : '';
        const fullDescription = description + (specificInstruction ? ` ${specificInstruction}` : '');
        return `- ${p.name}${rolePart}: ${fullDescription}`;
    }).join('\n');

    // ステップ別の詳細設定
    const stepSettings = {
        1: {
            title: "開会・参加者紹介",
            description: "会議の開始と各参加者の自己紹介を行います。進行役が開会を宣言し、会議の目的を説明した後、各参加者が簡潔に自己紹介を行います。本人からも自己紹介と簡単な抱負を述べてもらいます。",
            expectedMessages: "6-8発言"
        },
        2: {
            title: "就労選択支援での観察結果報告",
            description: "進行役（就労選択支援員）がアセスメント結果と観察ポイントを具体的に報告します。本人に実際の感想も確認します。",
            expectedMessages: "4-6発言"
        },
        3: {
            title: "本人の希望・意向の確認",
            description: "進行役が本人と保護者に、就労に関する希望や支援で感じたことなどを質問し、意向を確認します。本人には作業で楽しかったこと、頑張れたこと、不安なことなどを具体的に聞き出します。",
            expectedMessages: "5-7発言"
        },
        4: {
            title: "各機関からの情報共有",
            description: "学校教員、B型事業所職員、移行支援事業所職員などが、それぞれの立場から本人の状況や事業所の情報を提供します。各報告の後で本人の感想や質問を確認します。",
            expectedMessages: "6-9発言"
        },
        5: {
            title: "意見交換",
            description: "相談支援専門員、センター支援員などが中心となり、これまでの情報に基づき、専門的見地から意見交換や質疑応答を行います。本人の理解度を確認しながら進めます。",
            expectedMessages: "5-8発言"
        },
        6: {
            title: "支援方針の確認",
            description: "進行役が議論の結果を踏まえ、具体的な支援方針を提案し、参加者の合意を確認します。本人に分かりやすく説明し、各機関の役割分担と次回の会議予定なども確認します。最後に本人から決意表明や感想を聞き、保護者の最終意向も確認して閉会します。",
            expectedMessages: "4-6発言"
        }
    };

    const currentStepInfo = stepSettings[stepNumber];
    const previousContext = previousSteps.length > 0 ? 
        `\n\n## これまでの会議の流れ\n${previousSteps.map(step => `${step.speaker}: ${step.text}`).join('\n')}` : '';

    let basePrompt = `
あなたは多機関連携会議のシミュレーションを行うためのAIアシスタントです。障害者の就労支援に関する専門知識を持ち、リアルな会議の流れを再現してください。

## 現在のステップ: ${currentStepInfo.title}
${currentStepInfo.description}

## ケース情報
### 対象者の基本情報
${basicInfo}

### アセスメント結果概要
${assessmentSummary}

### 就労選択支援事業での観察ポイント
${observationPoints || '特記事項なし'}

## 参加者と期待される視点
${participantListWithRoles}
${previousContext}`;

    // 設定に基づくプロンプト拡張
    if (formData.settings) {
        basePrompt += enhancePromptWithSettings(formData.settings);
    }
    
    basePrompt += `

## 出力指示
- 「参加者名（役割）: 発言内容」または「参加者名: 発言内容」の形式で出力
- ${currentStepInfo.expectedMessages}程度の自然な対話を生成
- このステップに特化した内容のみ生成
- 自然な会話調で表現する
- 本人の発言を必ず含める

## 注意事項
- ステップタイトルは出力に含めない
- 他のステップの内容は含めない
- 自然で現実的な対話を心がける

シミュレーション開始:
`;

    return basePrompt;
}

// 障害福祉制度の制約情報データベース
const disabilityServiceConstraints = {
    serviceRestrictions: {
        concurrentUse: [
            {
                services: ['就労継続支援B型', '就労移行支援'],
                restriction: '同時利用不可',
                detail: 'B型事業所と移行支援事業所の併用・隔日利用は認められていません'
            },
            {
                services: ['就労選択支援'],
                restriction: '単独利用が原則',
                detail: '就労選択支援は他のサービスとの同時利用はできません'
            }
        ],
        ageRestrictions: [
            {
                service: '就労継続支援B型',
                minAge: 18,
                detail: '18歳未満の利用は原則認められていません'
            },
            {
                service: '就労移行支援',
                minAge: 18,
                maxAge: 65,
                detail: '18歳以上65歳未満が対象です'
            }
        ],
        usagePeriods: [
            {
                service: '就労移行支援',
                standardPeriod: '2年',
                maxExtension: '1年',
                detail: '標準利用期間は2年、特別な場合に1年延長可能'
            }
        ]
    },
    procedureRequirements: [
        {
            requirement: 'サービス等利用計画',
            detail: '相談支援専門員によるサービス等利用計画の作成が必要'
        },
        {
            requirement: '市町村支給決定',
            detail: '利用前に市町村による支給決定を受ける必要がある'
        }
    ]
};

// 制度制約情報をプロンプトに追加する関数
function getConstraintsPrompt() {
    return `

### 【重要】障害福祉制度の遵守事項

**サービス利用の制約:**
- 就労継続支援B型と就労移行支援の同時利用・併用・隔日利用は認められていません
- 就労選択支援は他サービスとの同時利用はできません（単独利用が原則）
- 18歳未満は就労継続支援B型を利用できません
- 就労移行支援の標準利用期間は2年（特別な場合1年延長可能）

**必要な手続き:**
- 相談支援専門員によるサービス等利用計画の作成が必要
- 市町村による支給決定が前提となります

**重要な注意事項:**
上記の制度上の制約に反する発言や提案は絶対に行わないでください。
制度に沿った適切な支援計画のみを議論してください。`;
}

// 設定に基づくプロンプト拡張関数
function enhancePromptWithSettings(settings) {
    let enhancement = '';
    
    // 制度制約情報を最初に追加
    enhancement += getConstraintsPrompt();
    
    // 発言文字数の指示を追加
    if (settings.speechLength) {
        const speechLengthInstructions = {
            1: '各発言は30-50文字程度で簡潔に表現してください。',
            2: '各発言は50-80文字程度で要点を絞って表現してください。',
            3: '各発言は80-120文字程度で適度な詳しさで表現してください。',
            4: '各発言は120-180文字程度でやや詳細に表現してください。',
            5: '各発言は180-250文字程度で詳細かつ具体的に表現してください。'
        };
        enhancement += `\n\n### 発言の長さ指示\n${speechLengthInstructions[settings.speechLength]}\n`;
    }
    
    // 事前アセスメント情報の追加
    if (settings.assessments && settings.assessments.length > 0) {
        const assessmentTexts = {
            'work-observation': '作業観察結果が詳細に実施されている',
            'aptitude-test': '適性検査による客観的データがある', 
            'interview-result': '本人面談による意向確認が行われている',
            'school-report': '学校からの詳細な情報提供がある',
            'family-interview': '家族面談による家庭状況の把握ができている',
            'medical-info': '医療機関からの専門的な情報がある'
        };
        
        const selectedAssessments = settings.assessments.map(a => assessmentTexts[a]).join('、');
        enhancement += `\n\n### 利用可能な事前アセスメント情報\n${selectedAssessments}\n`;
    }
    
    // ゴールパスに応じた指示
    const goalInstructions = {
        'consensus': '参加者全員の合意形成を重視し、異なる意見を調整しながら進めてください。',
        'exploration': '様々な選択肢を幅広く検討し、本人の可能性を最大限探索してください。',
        'empowerment': '本人の自己決定と主体性を最重視し、本人の発言を中心に据えてください。'
    };
    enhancement += `\n### 会議のゴール設定\n${goalInstructions[settings.goalPath]}\n`;
    
    // 進行パターンの指示
    const progressInstructions = {
        'structured': 'あらかじめ決められた議題に沿って、段階的に構造化して進行してください。',
        'flexible': '参加者の発言や状況に応じて、柔軟で自然な流れで進行してください。'
    };
    enhancement += `\n### 進行方針\n${progressInstructions[settings.progressPattern]}\n`;
    
    // 専門性の強調
    const expertiseInstructions = {
        'balanced': '各専門職の視点をバランス良く取り入れながら進めてください。',
        'technical': '各分野の専門的知見と技術的観点を重視した議論を展開してください。',
        'person-centered': '専門的視点よりも本人中心の考え方を最優先に進めてください。'
    };
    enhancement += `\n### 専門性の活用方針\n${expertiseInstructions[settings.expertise]}\n`;
    
    return enhancement;
}

// 事実確認用プロンプト生成関数
function generateFactCheckPrompt(generatedContent) {
    return `
生成された会議内容について、障害福祉制度の正確性を確認してください。

【確認対象の内容】
${generatedContent}

【チェック項目】
1. 就労継続支援B型と就労移行支援の同時利用・併用・隔日利用について言及がないか
2. 18歳未満のB型利用について間違った記述がないか
3. 就労移行支援の利用期間について正確な記述になっているか
4. サービス等利用計画や市町村支給決定について適切に言及されているか

【指示】
もし制度上不適切な内容が含まれている場合は、該当部分を指摘し、正しい内容に修正した会議ログを出力してください。
制度的に問題がない場合は「制度確認完了：問題なし」と回答してください。`;
}

// 自動検証機能：生成内容の制度的妥当性をチェック
function validateSimulationContent(generatedText) {
    const violations = [];
    const normalizedText = generatedText.toLowerCase();
    
    // B型と移行支援の同時利用チェック
    const hasB型 = normalizedText.includes('b型') || normalizedText.includes('継続支援');
    const has移行 = normalizedText.includes('移行支援') || normalizedText.includes('移行');
    
    if (hasB型 && has移行) {
        const problematicPatterns = [
            '隔日', '併用', '同時利用', '並行', '組み合わせ', 
            'b型も移行も', '移行もb型も', 'どちらも利用'
        ];
        
        for (const pattern of problematicPatterns) {
            if (normalizedText.includes(pattern)) {
                violations.push({
                    type: 'serviceRestriction',
                    message: 'B型と移行支援の同時利用は認められていません',
                    pattern: pattern,
                    severity: 'high'
                });
                break;
            }
        }
    }
    
    // 18歳未満のB型利用チェック
    if (hasB型) {
        const agePatterns = ['17歳', '16歳', '15歳', '14歳', '高校生でb型', '未成年でb型'];
        for (const pattern of agePatterns) {
            if (normalizedText.includes(pattern)) {
                violations.push({
                    type: 'ageRestriction',
                    message: '18歳未満はB型事業所を利用できません',
                    pattern: pattern,
                    severity: 'high'
                });
                break;
            }
        }
    }
    
    // 移行支援の期間チェック
    if (has移行) {
        const incorrectPeriods = ['3年', '4年', '5年', '無期限', '期限なし'];
        for (const period of incorrectPeriods) {
            if (normalizedText.includes(period) && normalizedText.includes('移行')) {
                violations.push({
                    type: 'usagePeriod',
                    message: '移行支援の利用期間は原則2年（延長1年）です',
                    pattern: period,
                    severity: 'medium'
                });
                break;
            }
        }
    }
    
    return violations;
}

// 検証結果に基づいて警告を生成
function generateValidationWarning(violations) {
    if (violations.length === 0) return null;
    
    const highSeverityViolations = violations.filter(v => v.severity === 'high');
    const mediumSeverityViolations = violations.filter(v => v.severity === 'medium');
    
    let warning = '⚠️ 制度上の問題が検出されました:\n\n';
    
    if (highSeverityViolations.length > 0) {
        warning += '【重要な問題】\n';
        highSeverityViolations.forEach(v => {
            warning += `- ${v.message}\n`;
        });
        warning += '\n';
    }
    
    if (mediumSeverityViolations.length > 0) {
        warning += '【注意事項】\n';
        mediumSeverityViolations.forEach(v => {
            warning += `- ${v.message}\n`;
        });
    }
    
    warning += '\n※ この内容は参考情報として生成されました。実際の制度運用については、最新の法令・通知を必ず確認してください。';
    
    return warning;
}

// AI要約・提案用プロンプト生成関数
function generateSummaryPrompt(formData, meetingLog) {
    const { basicInfo, assessmentSummary, observationPoints, participants } = formData;
    
    return `
あなたは経験豊富な障害福祉の専門家であり、多機関連携会議のファシリテーターです。
以下の会議の会話ログを分析し、次の2つのタスクを実行してください。出力はHTML形式でお願いします。

## タスク1: 会議の結論の要約
以下の3つの項目で、会議で決定された事項を簡潔にまとめてください。見出しは<h4>タグで、内容は<ul><li>タグで記述してください。
- 支援方針
- 短期目標(3ヶ月後)
- 役割分担

## タスク2: ✨ 次のステップへの創造的な提案
会議の結果を踏まえ、本人と支援チームが次に取り組むべき、具体的で希望の持てるアクションプランを3つ提案してください。単なるタスクリストではなく、本人の強みを活かし、自己肯定感を高めるような、創造的でワクワクするような提案を心がけてください。見出しは<h4>タグで、各提案は<p>タグで記述してください。

## ケース情報参考
### 対象者の基本情報
${basicInfo}

### アセスメント結果概要
${assessmentSummary}

### 観察ポイント
${observationPoints || '特記事項なし'}

## 会議ログ
${meetingLog}
`;
}

// 危険なAPIキー公開エンドポイントを削除
// セキュリティ上の理由により、このエンドポイントは削除されました

// サーバー起動
console.log(`Attempting to start server on port ${port}...`);
app.listen(port, () => {
    console.log(`プロキシサーバーが http://localhost:${port} で起動しました`);
});