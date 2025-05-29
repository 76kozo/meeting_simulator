// スクリプトが読み込まれたことを確認
console.log("script.js loaded successfully.");

const formElement = document.getElementById('simulation-form');
const regenerateBtn = document.getElementById('regenerate-btn');
const regenerateContainer = document.querySelector('.regenerate-container');

// 最後に使用したフォームデータを保持する変数
let lastFormData = null;

if (formElement) {
   console.log("Form element with ID 'simulation-form' found:", formElement);
   formElement.addEventListener('submit', async function(event) {
   // イベントリスナーが発火したことを確認
   console.log("Form submitted. Event listener triggered.");
   event.preventDefault(); // デフォルトのフォーム送信をキャンセル

    const basicInfo = document.getElementById('basic-info').value;
    const assessmentSummary = document.getElementById('assessment-summary').value;
    const observationPoints = document.getElementById('observation-points').value; // 新しいフィールドの値を取得
    const participantsText = document.getElementById('participants').value;
    const chatOutput = document.getElementById('chat-output');
    const loadingIndicator = document.getElementById('loading-indicator');

    // 参加者リストを解析 (役割も保持) - より堅牢な解析
    const participants = participantsText.split('\n')
        .map(line => line.trim()) // 前後の空白を除去
        .filter(line => line) // 空行を除外
        .map(line => {
            // 正規表現を改善: 全角/半角括弧、スペースの有無に対応
            const match = line.match(/^(.*?)\s?[（(](.*?)[\)）]$/);
            if (match) {
                return { name: match[1].trim(), role: match[2].trim() };
            }
            // 括弧がない場合は役割なしとみなす
            return { name: line.trim(), role: '' };
        });

    // デバッグ用に解析結果を出力
    console.log("解析された参加者リスト:", participants);

    // 以前の結果を完全にクリアし、ローディング表示
    chatOutput.innerHTML = ''; // 表示エリアを完全に空にする
    loadingIndicator.style.display = 'block';
    regenerateContainer.style.display = 'none'; // 再生成ボタンを非表示

   try {
       // tryブロックに入ったことを確認
       console.log("Entering try block...");
        // --- ローカルプロキシサーバー経由でAPI呼び出し ---
        const proxyUrl = 'http://localhost:3000/api/generate-simulation'; // ローカルサーバーのエンドポイント

        const requestBody = {
            basicInfo: basicInfo,
            assessmentSummary: assessmentSummary,
            observationPoints: observationPoints,
            participants: participants
        };

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorMessage = `サーバーリクエスト失敗: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                console.error("サーバーエラーレスポンス:", errorData);
                errorMessage += `. ${errorData?.error || ''} ${errorData?.details || ''}`;
            } catch (e) {
                // JSON解析に失敗した場合
                console.error("サーバーエラーレスポンスの解析失敗:", e);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("サーバーからのレスポンス:", data);

        // サーバーから返された生成済みテキストを取得
        const generatedText = data.simulation;

        if (!generatedText) {
            console.error("サーバーレスポンス解析エラー: テキストが見つかりません。", data);
            throw new Error("サーバーから有効なテキストが返されませんでした。");
        }

        console.log("生成されたテキスト:", generatedText);

        // 生成されたテキストを解析して表示用データに変換
        const simulationResult = parseSimulationText(generatedText, participants);

        // フォームデータを保存
        lastFormData = {
            basicInfo,
            assessmentSummary,
            observationPoints,
            participants
        };

        // 結果をチャット形式で表示
        displaySimulationResult(simulationResult, chatOutput);
        
        // 再生成ボタンを表示
        regenerateContainer.style.display = 'block';
        // --- ローカルプロキシサーバー経由でのAPI呼び出し ここまで ---

    } catch (error) {
        console.error('シミュレーション生成エラー:', error);
        chatOutput.innerHTML += `<p style="color: red;">エラーが発生しました: ${error.message}</p>`;
    } finally {
        // ローディング非表示
        loadingIndicator.style.display = 'none';
    }
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
            const response = await fetch('http://localhost:3000/api/generate-simulation', {
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
           } else { // Corrected position for else
                console.warn(`Item ${index} is missing speaker or text, or they are not strings. Skipping message creation.`, item);
           }
       } catch (e) { // Corrected position for catch
           console.error(`Error processing item ${index}:`, item, e);
       }
   }); // Corrected position for forEach closing parenthesis
}
// --- 結果表示関数 ここまで ---