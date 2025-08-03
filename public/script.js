// スクリプトが読み込まれたことを確認
console.log("script.js loaded successfully.");

const formElement = document.getElementById('simulation-form');
const loadTestDataBtn = document.getElementById('load-test-data');

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
async function typeMessage(speaker, message, container) {
    return new Promise((resolve) => {
        isTyping = true;
        skipTyping = false;
        
        // タイピングインジケーターを表示
        showTypingIndicator(speaker);
        
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
        nameDiv.textContent = speaker;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';
        
        contentDiv.appendChild(nameDiv);
        contentDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(iconDiv);
        messageDiv.appendChild(contentDiv);
        container.appendChild(messageDiv);
        
        // メッセージをスクロール表示
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
        
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
function showTypingIndicator(speaker) {
    if (typingIndicator && typingSpeaker) {
        typingSpeaker.textContent = `${speaker}が入力中`;
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

// 段階的にメッセージを表示
async function displayMessagesWithTyping(messages, container) {
    for (const message of messages) {
        if (message.speaker && message.text) {
            await typeMessage(message.speaker, message.text, container);
            // メッセージ間に少し間隔をあける
            await new Promise(resolve => setTimeout(resolve, 800));
        }
    }
}
const regenerateBtn = document.getElementById('regenerate-btn');
const regenerateContainer = document.querySelector('.regenerate-container');

// 最後に使用したフォームデータを保持する変数
let lastFormData = null;

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

    // フォームデータを保存
    lastFormData = {
        basicInfo,
        assessmentSummary,
        observationPoints,
        participants
    };

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
    
    try {
        // ステップ別のAPI呼び出し
        const response = await fetch(window.location.origin + '/api/generate-step', {
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

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API呼び出し失敗: ${response.status}`);
        }

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
    
    // 次のステップボタンの表示/非表示
    if (stepNumber < stepDefinitions.length) {
        nextStepBtn.style.display = 'inline-block';
        nextStepBtn.disabled = false;
        nextStepBtn.textContent = `ステップ${stepNumber + 1}へ: ${stepDefinitions[stepNumber].name}`;
    } else {
        // 全ステップ完了
        nextStepBtn.style.display = 'none';
        
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

    // 発言者名からアイコンクラスを生成するヘルパー関数
    const getIconClass = (speakerName) => {
        // 既存のクラス名を優先的にチェック
        if (speakerName.includes("田中")) return "tanaka";
        if (speakerName.includes("鈴木")) return "suzuki";
        if (speakerName.includes("佐々木")) return "sasaki";
        if (speakerName.includes("山田")) return "yamada";
        if (speakerName.includes("中村")) return "nakamura";
        if (speakerName.includes("伊藤")) return "ito";
        if (speakerName === "佐藤（父）" || (speakerName === "佐藤" && result.some(item => item.speaker === "佐藤（父）"))) return "sato-father";
        if (speakerName === "佐藤太郎" || (speakerName === "佐藤" && result.some(item => item.speaker === "佐藤太郎"))) return "sato-taro";

        // 動的にクラス名を生成 (より汎用的)
        const normalizedName = speakerName.toLowerCase()
            .replace(/（.*?）|\(.*?\)/g, '') // 括弧と中身を削除
            .replace(/\s+/g, '-') // スペースをハイフンに
            .replace(/[^a-z0-9-]/g, ''); // 英数字とハイフン以外を削除
        if (normalizedName) return normalizedName;

        return "default"; // 不明な発言者用
    };

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
               nameDiv.textContent = item.role ? `${item.speaker}（${item.role}）` : item.speaker;

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