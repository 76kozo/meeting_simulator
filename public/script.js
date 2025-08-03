// スクリプトが読み込まれたことを確認
console.log("script.js loaded successfully.");

const formElement = document.getElementById('simulation-form');
const loadTestDataBtn = document.getElementById('load-test-data');
const loadPresetDataBtn = document.getElementById('load-preset-data');

// 設定管理用の状態
let currentSettings = {
    caseType: 'custom',
    assessments: [],
    goalPath: 'consensus',
    progressPattern: 'structured',
    expertise: 'balanced'
};

// 段階的進行とタイピング機能の変数
let currentStep = 0;
let currentStepData = null;
let isTyping = false;
let typingSpeed = 80; // 文字/秒
let skipTyping = false;

// 段階的進行用の要素
const stepProgress = document.getElementById('step-progress');
const startStepBtn = document.getElementById('start-step-btn');
const nextStepBtn = document.getElementById('next-step-btn');
const typingIndicator = document.getElementById('typing-indicator');
const typingSpeaker = document.getElementById('typing-speaker');
const typingSpeedSlider = document.getElementById('typing-speed');
const speedValue = document.getElementById('speed-value');
const skipTypingBtn = document.getElementById('skip-typing-btn');

// ステップ定義
const stepDefinitions = [
    { id: 1, name: "開会・参加者紹介", description: "会議の開始と各参加者の自己紹介" },
    { id: 2, name: "観察結果報告", description: "就労選択支援での観察結果を報告" },
    { id: 3, name: "希望・意向確認", description: "本人と保護者の希望を確認" },
    { id: 4, name: "各機関情報共有", description: "関係機関からの情報提供" },
    { id: 5, name: "意見交換", description: "専門的見地からの意見交換" },
    { id: 6, name: "支援方針確認", description: "具体的な支援方針の決定" }
];

// === 設定UIのイベントリスナー ===

// ケース選択ボタン
const caseSelectionBtns = document.querySelectorAll('.case-selection .setting-btn');
caseSelectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // アクティブ状態を更新
        caseSelectionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // 設定を更新
        currentSettings.caseType = btn.dataset.case;
        
        // UIを切り替え
        toggleInputMode();
    });
});

// ゴールパスボタン
const goalPathBtns = document.querySelectorAll('.goal-path .setting-btn');
goalPathBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        goalPathBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.goalPath = btn.dataset.goal;
    });
});

// 進行パターンボタン
const progressPatternBtns = document.querySelectorAll('.progress-pattern .setting-btn');
progressPatternBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        progressPatternBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.progressPattern = btn.dataset.pattern;
    });
});

// 専門性ボタン
const expertiseBtns = document.querySelectorAll('.expertise .setting-btn');
expertiseBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        expertiseBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSettings.expertise = btn.dataset.expertise;
    });
});

// チェックボックス
const assessmentCheckboxes = document.querySelectorAll('input[name="assessment"]');
assessmentCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        currentSettings.assessments = Array.from(assessmentCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
    });
});

// 入力モード切り替え関数
function toggleInputMode() {
    const customInput = document.getElementById('custom-input');
    const loadTestBtn = document.getElementById('load-test-data');
    const loadPresetBtn = document.getElementById('load-preset-data');
    
    if (currentSettings.caseType === 'custom') {
        customInput.style.display = 'block';
        loadTestBtn.style.display = 'inline-block';
        loadPresetBtn.style.display = 'none';
    } else {
        customInput.style.display = 'block'; // フォームは表示したまま
        loadTestBtn.style.display = 'none';
        loadPresetBtn.style.display = 'inline-block';
    }
}

// テストデータ読み込みボタンのイベントリスナー
if (loadTestDataBtn) {
    loadTestDataBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('testdata.json');
            const testData = await response.json();
            
            // フォームに値を設定
            document.getElementById('basic-info').value = testData.basicInfo;
            document.getElementById('assessment-summary').value = testData.assessmentSummary;
            document.getElementById('observation-points').value = testData.observationPoints;
            document.getElementById('participants').value = testData.participants;
            
            console.log('テストデータを読み込みました');
        } catch (error) {
            console.error('テストデータの読み込みに失敗しました:', error);
        }
    });
} else {
    console.error("Error: Load test data button not found!");
}

// 佐藤太郎ケース読み込みボタン
if (loadPresetDataBtn) {
    loadPresetDataBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('preset-data.json');
            const presetData = await response.json();
            const satouData = presetData['satou-tarou'];
            
            // フォームに佐藤太郎ケースのデータを設定
            document.getElementById('basic-info').value = satouData.basicInfo;
            document.getElementById('assessment-summary').value = satouData.assessmentSummary;
            document.getElementById('observation-points').value = satouData.observationPoints;
            document.getElementById('participants').value = satouData.participants;
            
            console.log('佐藤太郎ケースを読み込みました');
        } catch (error) {
            console.error('プリセットデータの読み込みに失敗しました:', error);
            // フォールバック用の簡易データ
            document.getElementById('basic-info').value = '佐藤太郎（18歳・男性）、知的障害（B2）・自閉スペクトラム症';
            document.getElementById('assessment-summary').value = '強み: 手先が器用、高い集中力\n課題: 突発的な変更に弱い、自発的なコミュニケーションが少ない';
            document.getElementById('observation-points').value = '作業観察では手先を使った細かい作業で高い集中力を発揮。ルーティンワークを好み、予定変更時に不安を示すことがあった。';
            document.getElementById('participants').value = '田中（就労選択支援員・進行役）\n佐藤太郎（本人）\n佐藤（父）\n山田（特別支援学校教員）\n鈴木（就労継続B型事業所 職員）\n伊藤（就労移行支援事業所 職員）\n中村（相談支援専門員）\n佐々木（障害者就業・生活支援センター 支援員）';
        }
    });
}

// === タイピングアニメーション機能 ===

// タイピング速度スライダーのイベントリスナー
if (typingSpeedSlider) {
    typingSpeedSlider.addEventListener('input', (e) => {
        typingSpeed = parseInt(e.target.value);
        speedValue.textContent = typingSpeed;
    });
}

// スキップボタンのイベントリスナー
if (skipTypingBtn) {
    skipTypingBtn.addEventListener('click', () => {
        skipTyping = true;
    });
}

// タイピングアニメーション関数
async function typeMessage(speaker, message, container, role = '') {
    return new Promise((resolve) => {
        isTyping = true;
        skipTyping = false;
        
        // タイピングインジケーターを表示
        showTypingIndicator(speaker, role);
        
        // メッセージ要素を作成
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message typing-animation';
        
        const iconDiv = document.createElement('div');
        const iconClass = getIconClass(speaker);
        iconDiv.className = `icon ${iconClass}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'name';
        nameDiv.textContent = getDisplayName(speaker, role);
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';
        
        contentDiv.appendChild(nameDiv);
        contentDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
        
        // メッセージをスクロール表示（固定ボタンエリアを考慮）
        setTimeout(() => {
            messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
        
        let currentIndex = 0;
        const totalLength = message.length;
        
        function typeNextChar() {
            if (skipTyping || currentIndex >= totalLength) {
                // タイピング完了
                bubbleDiv.innerHTML = message.replace(/\n/g, '<br>');
                hideTypingIndicator();
                isTyping = false;
                resolve();
                return;
            }
            
            // 現在までの文字を表示
            const currentText = message.substring(0, currentIndex + 1);
            bubbleDiv.innerHTML = currentText.replace(/\n/g, '<br>') + '<span class="typing-cursor"></span>';
            
            currentIndex++;
            
            // 次の文字のタイミングを計算
            const delay = 1000 / typingSpeed;
            setTimeout(typeNextChar, delay);
        }
        
        // 少し遅延してからタイピング開始
        setTimeout(typeNextChar, 500);
    });
}

// タイピングインジケーターを表示
function showTypingIndicator(speaker, role = '') {
    if (typingIndicator && typingSpeaker) {
        const displayName = getDisplayName(speaker, role);
        typingSpeaker.textContent = `${displayName}が入力中`;
        typingIndicator.classList.add('show');
        typingIndicator.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}

// タイピングインジケーターを非表示
function hideTypingIndicator() {
    if (typingIndicator) {
        typingIndicator.classList.remove('show');
    }
}

// 役割からアイコンと短縮表示を取得するマッピング
const roleMapping = {
    // 進行役・コーディネーター
    '就労選択支援員': { icon: '👨‍💼', shortRole: '進行役' },
    '進行役': { icon: '👨‍💼', shortRole: '進行役' },
    'コーディネーター': { icon: '👨‍💼', shortRole: '進行役' },
    
    // 本人・家族
    '本人': { icon: '👦', shortRole: '本人' },
    '父': { icon: '👨', shortRole: '父' },
    '母': { icon: '👩', shortRole: '母' },
    '保護者': { icon: '👨‍👩‍👧‍👦', shortRole: '保護者' },
    
    // 教育関係
    '教員': { icon: '👩‍🏫', shortRole: '教員' },
    '特別支援学校教員': { icon: '👩‍🏫', shortRole: '教員' },
    '学校教員': { icon: '👩‍🏫', shortRole: '教員' },
    '担任': { icon: '👩‍🏫', shortRole: '担任' },
    
    // 就労支援事業所
    '就労継続支援B型事業所': { icon: '👥', shortRole: 'B型' },
    'B型事業所': { icon: '👥', shortRole: 'B型' },
    '就労継続B型': { icon: '👥', shortRole: 'B型' },
    '就労移行支援事業所': { icon: '🏢', shortRole: '移行' },
    '移行支援': { icon: '🏢', shortRole: '移行' },
    '就労移行': { icon: '🏢', shortRole: '移行' },
    
    // 相談支援・専門機関
    '相談支援専門員': { icon: '💼', shortRole: '相談' },
    '相談員': { icon: '💼', shortRole: '相談' },
    '障害者就業・生活支援センター': { icon: '🏛️', shortRole: 'センター' },
    'センター': { icon: '🏛️', shortRole: 'センター' },
    '支援センター': { icon: '🏛️', shortRole: 'センター' },
    
    // その他
    '医療機関': { icon: '⚕️', shortRole: '医療' },
    '医師': { icon: '👨‍⚕️', shortRole: '医師' },
    '臨床心理士': { icon: '🧠', shortRole: '心理' },
    'ソーシャルワーカー': { icon: '🤝', shortRole: 'SW' },
    
    // デフォルト
    'default': { icon: '👤', shortRole: '' }
};

// 役割からアイコンと短縮表示を取得
function getRoleInfo(role) {
    if (!role) return roleMapping['default'];
    
    // 完全一致を優先
    for (const [key, value] of Object.entries(roleMapping)) {
        if (role === key) return value;
    }
    
    // 部分一致
    for (const [key, value] of Object.entries(roleMapping)) {
        if (role.includes(key) || key.includes(role)) return value;
    }
    
    return roleMapping['default'];
}

// 発言者名と役割から表示名を生成
function getDisplayName(speakerName, role) {
    const roleInfo = getRoleInfo(role);
    
    // 名前のクリーンアップ（既存の括弧内情報を削除）
    const cleanName = speakerName.replace(/（.*?）|\(.*?\)/g, '').trim();
    
    // アイコン + 名前 + 短縮役割
    if (roleInfo.shortRole) {
        return `${roleInfo.icon} ${cleanName}（${roleInfo.shortRole}）`;
    } else {
        return `${roleInfo.icon} ${cleanName}`;
    }
}

// 発言者名からアイコンクラスを生成するヘルパー関数（既存のCSS用）
function getIconClass(speakerName) {
    // 既存のクラス名を優先的にチェック
    if (speakerName.includes("田中")) return "tanaka";
    if (speakerName.includes("鈴木")) return "suzuki";
    if (speakerName.includes("佐々木")) return "sasaki";
    if (speakerName.includes("山田")) return "yamada";
    if (speakerName.includes("中村")) return "nakamura";
    if (speakerName.includes("伊藤")) return "ito";
    if (speakerName === "佐藤（父）" || (speakerName === "佐藤" && speakerName.includes("父"))) return "sato-father";
    if (speakerName === "佐藤太郎" || (speakerName === "佐藤" && !speakerName.includes("父"))) return "sato-taro";

    // 動的にクラス名を生成 (より汎用的)
    const normalizedName = speakerName.toLowerCase()
        .replace(/（.*?）|\(.*?\)/g, '') // 括弧と中身を削除
        .replace(/\s+/g, '-') // スペースをハイフンに
        .replace(/[^a-z0-9-]/g, ''); // 英数字とハイフン以外を削除
    if (normalizedName) return normalizedName;

    return "default"; // 不明な発言者用
}

// リトライ機能付きAPIコール
async function callApiWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP Error: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.error(`API呼び出し試行 ${attempt}/${maxRetries} 失敗:`, error);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // 指数バックオフ: 1秒、2秒、4秒待機
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`${delay/1000}秒後にリトライします...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// エラーモーダル表示
function showErrorModal(title, message, details = null) {
    // 既存のモーダルを削除
    const existingModal = document.querySelector('.error-modal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'error-modal';
    modal.innerHTML = `
        <div class="error-modal-content">
            <div class="error-modal-header">
                <h3>❌ ${title}</h3>
                <button class="error-modal-close">&times;</button>
            </div>
            <div class="error-modal-body">
                <p>${message}</p>
                ${details ? `<details><summary>詳細情報</summary><pre>${details}</pre></details>` : ''}
            </div>
            <div class="error-modal-footer">
                <button class="error-modal-retry" style="display: none;">再試行</button>
                <button class="error-modal-ok">OK</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // イベントリスナー
    modal.querySelector('.error-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.error-modal-ok').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
    
    return modal;
}

// 段階的にメッセージを表示
async function displayMessagesWithTyping(messages, container) {
    for (const message of messages) {
        if (message.speaker && message.text) {
            await typeMessage(message.speaker, message.text, container, message.role || '');
            // メッセージ間に少し間隔をあける
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
}
const regenerateBtn = document.getElementById('regenerate-btn');
const generateSummaryBtn = document.getElementById('generate-summary-btn');
const regenerateContainer = document.querySelector('.regenerate-container');
const summaryContainer = document.getElementById('summary-output');

// 最後に使用したフォームデータと会議ログを保持する変数
let lastFormData = null;
let meetingLog = '';

// === 段階的進行機能 ===

// フォーム送信時の処理（段階的進行開始）
if (formElement) {
   console.log("Form element with ID 'simulation-form' found:", formElement);
   formElement.addEventListener('submit', async function(event) {
   event.preventDefault();

    const basicInfo = document.getElementById('basic-info').value;
    const assessmentSummary = document.getElementById('assessment-summary').value;
    const observationPoints = document.getElementById('observation-points').value;
    const participantsText = document.getElementById('participants').value;
    const chatOutput = document.getElementById('chat-output');
    const loadingIndicator = document.getElementById('loading-indicator');

    // 参加者リストを解析
    const participants = participantsText.split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .map(line => {
            const match = line.match(/^(.*?)\s?[（(](.*?)[\)）]$/);
            if (match) {
                return { name: match[1].trim(), role: match[2].trim() };
            }
            return { name: line.trim(), role: '' };
        });

    console.log("解析された参加者リスト:", participants);

    // フォームデータと設定を保存
    lastFormData = {
        basicInfo,
        assessmentSummary,
        observationPoints,
        participants,
        settings: { ...currentSettings } // 設定も含める
    };
    
    console.log('現在の設定:', currentSettings);

    // 段階的進行UIを表示
    stepProgress.style.display = 'block';
    chatOutput.innerHTML = '';
    loadingIndicator.style.display = 'none';
    regenerateContainer.style.display = 'none';

    // フォームを非表示にして段階的進行を開始
    document.querySelector('.input-container').style.display = 'none';
    
    // 会議タイトルを表示
    const titleDiv = document.createElement('h2');
    titleDiv.textContent = '多機関連携会議シミュレーション';
    titleDiv.style.textAlign = 'center';
    titleDiv.style.marginBottom = '20px';
    chatOutput.appendChild(titleDiv);

    currentStep = 0;
   });
  console.log("Submit event listener successfully added to the form.");

  // ボタン要素を取得してクリックイベントリスナーも追加
  const submitButton = formElement.querySelector('button[type="submit"]');
  if (submitButton) {
      console.log("Submit button found:", submitButton);
      submitButton.addEventListener('click', function() {
          // ボタンがクリックされたことを確認
          console.log("Submit button clicked.");
      });
      console.log("Click event listener added to the submit button.");
  } else {
      console.error("Error: Submit button not found within the form!");
  }

} else {
  console.error("Error: Form element with ID 'simulation-form' not found!");
}

// 会議開始ボタンのイベントリスナー
if (startStepBtn) {
    startStepBtn.addEventListener('click', async () => {
        await startStep(1);
    });
}

// 次のステップボタンのイベントリスナー
if (nextStepBtn) {
    nextStepBtn.addEventListener('click', async () => {
        if (currentStep < stepDefinitions.length) {
            await startStep(currentStep + 1);
        }
    });
}

// ステップを開始する関数
async function startStep(stepNumber) {
    if (!lastFormData) {
        console.error('フォームデータが不足しています');
        return;
    }

    currentStep = stepNumber;
    updateStepIndicator(stepNumber);
    
    // ボタンを無効化
    startStepBtn.disabled = true;
    nextStepBtn.disabled = true;
    
    // ボタンエリアを非固定に戻す（生成中）
    const stepControls = document.querySelector('.step-controls');
    stepControls.classList.remove('floating');
    document.body.classList.remove('has-floating-controls');
    document.getElementById('chat-output').classList.remove('with-floating-controls');
    
    // セクションタイトルを追加
    const chatOutput = document.getElementById('chat-output');
    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'section-title';
    sectionTitle.innerHTML = `
        <h3>${stepDefinitions[stepNumber - 1].name}</h3>
        <p class="section-description">${stepDefinitions[stepNumber - 1].description}</p>
    `;
    chatOutput.appendChild(sectionTitle);
    
    try {
        // ステップ別のAPI呼び出し（リトライ機能付き）
        const response = await callApiWithRetry(window.location.origin + '/api/generate-step', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                stepNumber: stepNumber,
                formData: lastFormData,
                previousSteps: currentStepData || []
            }),
        });

        const data = await response.json();
        const stepMessages = parseSimulationText(data.simulation, lastFormData.participants);
        
        // タイピングアニメーションで表示
        const chatOutput = document.getElementById('chat-output');
        await displayMessagesWithTyping(stepMessages, chatOutput);
        
        // ステップデータを保存
        if (!currentStepData) currentStepData = [];
        currentStepData.push(...stepMessages);
        
        // ステップ完了
        completeStep(stepNumber);
        
    } catch (error) {
        console.error('ステップ生成エラー:', error);
        
        // 詳細なエラー情報をモーダルで表示
        const errorModal = showErrorModal(
            'ステップ生成に失敗しました',
            'シミュレーションの生成中にエラーが発生しました。ネットワーク接続を確認して再試行してください。',
            error.message
        );
        
        // 再試行ボタンを表示
        const retryBtn = errorModal.querySelector('.error-modal-retry');
        retryBtn.style.display = 'inline-block';
        retryBtn.addEventListener('click', () => {
            errorModal.remove();
            startStep(stepNumber); // 同じステップを再試行
        });
        
        displayError(error.message, document.getElementById('chat-output'));
        
        // ボタンを再有効化
        startStepBtn.disabled = false;
        nextStepBtn.disabled = false;
    }
}

// ステップインジケーターを更新
function updateStepIndicator(activeStep) {
    stepDefinitions.forEach((step, index) => {
        const stepElement = document.getElementById(`step-${step.id}`);
        if (stepElement) {
            stepElement.classList.remove('pending', 'active', 'completed');
            
            if (step.id < activeStep) {
                stepElement.classList.add('completed');
            } else if (step.id === activeStep) {
                stepElement.classList.add('active');
            } else {
                stepElement.classList.add('pending');
            }
        }
    });
}

// ステップ完了処理
function completeStep(stepNumber) {
    const stepElement = document.getElementById(`step-${stepNumber}`);
    if (stepElement) {
        stepElement.classList.remove('active');
        stepElement.classList.add('completed');
    }
    
    const stepControls = document.querySelector('.step-controls');
    
    // 次のステップボタンの表示/非表示
    if (stepNumber < stepDefinitions.length) {
        nextStepBtn.style.display = 'inline-block';
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = `ステップ${stepNumber + 1}へ: ${stepDefinitions[stepNumber].name}`;
        
        // ボタンを画面下部に固定表示
        stepControls.classList.add('floating');
        document.body.classList.add('has-floating-controls');
        document.getElementById('chat-output').classList.add('with-floating-controls');
    } else {
        // 全ステップ完了
        nextStepBtn.style.display = 'none';
        stepControls.classList.remove('floating');
        document.body.classList.remove('has-floating-controls');
        document.getElementById('chat-output').classList.remove('with-floating-controls');
        
        // 会議終了メッセージを表示
        const chatOutput = document.getElementById('chat-output');
        const endMessage = document.createElement('div');
        endMessage.style.textAlign = 'center';
        endMessage.style.padding = '20px';
        endMessage.style.background = '#e8f5e8';
        endMessage.style.borderRadius = '8px';
        endMessage.style.margin = '20px 0';
        endMessage.innerHTML = '<h3>🎉 会議が終了しました</h3><p>お疲れさまでした。</p>';
        chatOutput.appendChild(endMessage);
        
        // 会議ログを保存
        saveMeetingLog();
        
        // 再生成ボタンを表示
        regenerateContainer.style.display = 'block';
    }
    
    startStepBtn.style.display = 'none';
}

// 再生成ボタンのイベントリスナー
if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async function() {
        if (!lastFormData) return;

        // ボタンを無効化
        regenerateBtn.disabled = true;
        regenerateBtn.textContent = '生成中...';

        // 表示をクリア
        const chatOutput = document.getElementById('chat-output');
        const loadingIndicator = document.getElementById('loading-indicator');
        chatOutput.innerHTML = '';
        loadingIndicator.style.display = 'block';
        
        try {
            const response = await fetch(window.location.origin + '/api/generate-simulation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(lastFormData),
            });

            if (!response.ok) {
                throw new Error(`サーバーリクエスト失敗: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            const generatedText = data.simulation;

            if (!generatedText) {
                throw new Error("サーバーから有効なテキストが返されませんでした。");
            }

            // 結果を解析して表示
            const simulationResult = parseSimulationText(generatedText, lastFormData.participants);
            displaySimulationResult(simulationResult, chatOutput);

        } catch (error) {
            console.error('シミュレーション再生成エラー:', error);
            chatOutput.innerHTML += `<p style="color: red;">エラーが発生しました: ${error.message}</p>`;
        } finally {
            // UIを元に戻す
            loadingIndicator.style.display = 'none';
            regenerateBtn.disabled = false;
            regenerateBtn.textContent = 'シミュレーションを再生成';
        }
    });
} else {
    console.error("Error: Regenerate button not found!");
}

// AI要約・提案ボタンのイベントリスナー
if (generateSummaryBtn) {
    generateSummaryBtn.addEventListener('click', async function() {
        if (!lastFormData || !meetingLog) {
            console.error('会議データが不足しています');
            return;
        }

        // ボタンを無効化
        generateSummaryBtn.disabled = true;
        generateSummaryBtn.textContent = '生成中...';
        
        try {
            const response = await callApiWithRetry(window.location.origin + '/api/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formData: lastFormData,
                    meetingLog: meetingLog
                }),
            });

            const data = await response.json();
            
            // 要約・提案を表示
            displaySummary(data.summary);
            
        } catch (error) {
            console.error('要約生成エラー:', error);
            
            // 詳細なエラー情報をモーダルで表示
            const errorModal = showErrorModal(
                'AI要約・提案の生成に失敗しました',
                '要約の生成中にエラーが発生しました。ネットワーク接続を確認して再試行してください。',
                error.message
            );
            
            // 再試行ボタンを表示
            const retryBtn = errorModal.querySelector('.error-modal-retry');
            retryBtn.style.display = 'inline-block';
            retryBtn.addEventListener('click', () => {
                errorModal.remove();
                generateSummaryBtn.click(); // 要約生成を再試行
            });
            
            summaryContainer.innerHTML = `<p style="color: red;">エラーが発生しました: ${error.message}</p>`;
            summaryContainer.style.display = 'block';
        } finally {
            // ボタンを再有効化
            generateSummaryBtn.disabled = false;
            generateSummaryBtn.textContent = '🎆 AI要約・提案を生成';
        }
    });
} else {
    console.error("Error: Generate summary button not found!");
}

// 会議ログを保存する関数
function saveMeetingLog() {
    if (!currentStepData) return;
    
    meetingLog = currentStepData.map(step => {
        return `${step.speaker}: ${step.text}`;
    }).join('\n');
    
    console.log('会議ログを保存しました');
}

// AI要約・提案を表示する関数
function displaySummary(summaryHtml) {
    summaryContainer.innerHTML = `
        <h3>📊 会議の結果要約 & ✨ 次のステップへの提案</h3>
        ${summaryHtml}
    `;
    summaryContainer.style.display = 'block';
    
    // スムーズにスクロール
    setTimeout(() => {
        summaryContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}


// --- APIレスポンス解析関数 ---
function parseSimulationText(text, participants) {
    const lines = text.split('\n');
    const result = [];
    const participantMap = new Map(participants.map(p => [p.name, p.role]));

    // 正規表現: 全角/半角コロンに対応
    const speakerRegex = /^(.*?)\s?[（(](.*?)[\)）]\s*[：:]\s*(.*)$/;
    const speakerOnlyRegex = /^([^（(:]+?)\s*[：:]\s*(.*)$/;
    // sectionHeaderRegex は不要になったので削除

    let currentSpeakerBlock = null; // 直前の発言ブロックを保持

    lines.forEach(line => {
        const trimmedLine = line.trim();

        if (trimmedLine === '') {
            currentSpeakerBlock = null; // 空行でリセット
            return;
        }

        let speaker = null;
        let role = '';
        let utterance = '';
        let matchFound = false;

        let match = trimmedLine.match(speakerRegex);
        if (match) {
            speaker = match[1].trim();
            role = match[2] ? match[2].trim() : (participantMap.get(speaker) || '');
            utterance = match[3].trim();
            matchFound = true;
        } else {
            match = trimmedLine.match(speakerOnlyRegex);
            if (match) {
                const potentialSpeaker = match[1].trim();
                // 参加者リストに名前が存在するか確認
                const foundParticipant = participants.find(p => p.name === potentialSpeaker || potentialSpeaker.startsWith(p.name));
                if (foundParticipant) {
                    speaker = potentialSpeaker;
                    role = foundParticipant.role || '';
                    utterance = match[2].trim();
                    matchFound = true;
                }
            }
        }

        if (matchFound) {
            // 新しい発言ブロックを作成
            const newBlock = { speaker: speaker, role: role, text: utterance };
            result.push(newBlock);
            currentSpeakerBlock = newBlock; // 現在の発言ブロックを更新
        } else if (currentSpeakerBlock) {
            // 直前の発言ブロックがあれば、そのテキストに追加する (複数行対応)
            currentSpeakerBlock.text += (currentSpeakerBlock.text ? '\n' : '') + trimmedLine;
        } else {
            // どのパターンにも一致せず、直前のブロックもない行は無視
            console.warn("Ignoring line (not a speaker line and no previous block):", trimmedLine);
        }
    });

    // 解析結果をログ出力
    console.log("Parsed Simulation Result (Speaker lines only):", JSON.stringify(result, null, 2));
    return result;
}
// --- APIレスポンス解析関数 ここまで ---


// --- 結果表示関数 ---
function displaySimulationResult(result, container) {
   // 関数が呼び出されたことと受け取ったデータを確認
   console.log("Displaying result:", JSON.stringify(result, null, 2));

   // 結果表示エリアの先頭に見出しを追加
   const resultTitle = document.createElement('h2');
   resultTitle.textContent = '多機関連携会議シミュレーション結果';
   container.appendChild(resultTitle);

   // ステップ1のタイトルを表示
   const step1Title = document.createElement('h3');
   step1Title.textContent = '開会・参加者紹介'; // プロンプトで指定したステップ名
   container.appendChild(step1Title);


    // 既存のスタイルシートルールをキャッシュ (パフォーマンス改善)
    const existingClasses = new Set();
    try {
        [...document.styleSheets].forEach(sheet => {
            // 同一オリジンポリシーによりクロスオリジンのスタイルシートにはアクセスできない場合がある
            if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                 console.warn("Skipping CSS rules check for cross-origin sheet:", sheet.href);
                 return;
            }
            try {
                [...sheet.cssRules].forEach(rule => {
                    if (rule.selectorText && rule.selectorText.startsWith('.icon.')) {
                        existingClasses.add(rule.selectorText.substring(6)); // '.icon.' の後を取得
                    }
                });
            } catch (e) {
                // セキュリティエラーなどでルールにアクセスできない場合
                console.warn("Cannot access CSS rules for sheet:", sheet.href || 'inline style', e);
            }
        });
    } catch (e) {
         console.error("Error accessing style sheets:", e);
    }


   // 解析された発言をすべて表示 (ステップ区切りは一旦なし)
   result.forEach((item, index) => {
       try { // Add try block here
           // 各アイテムの処理開始をログ出力
           console.log(`Processing item ${index}:`, item);

           // section_header は parseSimulationText で除外されるはずだが念のためチェック
           if (item.type === 'section_header') {
                console.warn("Unexpected section_header found:", item);
                return; // section_header は表示しない
           }

           // speaker と text が存在するか再確認
           if (item.speaker && typeof item.speaker === 'string' && item.text && typeof item.text === 'string') {
               console.log(`Item ${index} has speaker and text. Creating message element...`);
               const messageDiv = document.createElement('div');
               messageDiv.className = 'message';

               const iconDiv = document.createElement('div');
               const iconClass = getIconClass(item.speaker);
               iconDiv.className = `icon ${iconClass}`;

               // CSSにクラスが存在しない場合、動的にスタイルを適用 (色を生成)
               if (!existingClasses.has(iconClass)) {
                    // 簡易的なハッシュで色を生成 (一貫性はあるが色はランダム)
                    let hash = 0;
                    for (let i = 0; i < item.speaker.length; i++) {
                        hash = item.speaker.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const color = `hsl(${hash % 360}, 70%, 80%)`;
                    iconDiv.style.backgroundColor = color;
                    // 新しいクラスを existingClasses に追加して、次回以降のチェックをスキップ
                    existingClasses.add(iconClass);
                    console.log(`Generated style for .icon.${iconClass}`);
               }

               const contentDiv = document.createElement('div');
               contentDiv.className = 'content';

               const nameDiv = document.createElement('div');
               nameDiv.className = 'name';
               nameDiv.textContent = getDisplayName(item.speaker, item.role || '');

               const bubbleDiv = document.createElement('div');
               bubbleDiv.className = 'bubble';
               bubbleDiv.innerHTML = item.text.replace(/\n/g, '<br>');

               contentDiv.appendChild(nameDiv);
               contentDiv.appendChild(bubbleDiv);
               messageDiv.appendChild(iconDiv);
               messageDiv.appendChild(contentDiv);
               container.appendChild(messageDiv);
               
               // メッセージが追加されたことをログ出力
               console.log(`Appended message element for item ${index} (Speaker: ${item.speaker})`);
           } else {
                console.warn(`Item ${index} is missing speaker or text, or they are not strings. Skipping message creation.`, item);
           }
       } catch (e) {
           console.error(`Error processing item ${index}:`, item, e);
       }
   });
}

// --- エラー表示関数 ---
function displayError(message, container, loader) {
    if (container) {
        container.innerHTML = `<p style="color: red;">${message}</p>`;
    }
    if (loader) {
        loader.style.display = 'none';
    }
    console.error("Displayed error:", message);
}