import '@material/web/button/elevated-button.js';
import '@material/web/radio/radio.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/textfield/outlined-text-field.js';
import '@material/web/slider/slider.js';
import { styles as typescaleStyles } from '@material/web/typography/md-typescale-styles.js';

document.adoptedStyleSheets.push(typescaleStyles.styleSheet);


let background;
let displayUnits = [];
let currentUnitIndex = 0;
let isPlaying = false;
let displayTimer = null;
let fullArticle = '';

// Regex for word/char mode (Chinese chars, Bopomofo, English words, numbers)
const wordTokenRegex = /[\u4e00-\u9fa5\u3105-\u3129\u02CA\u02C7\u02CB\u02D9]|[a-zA-Z0-9]+/g;

let textInput;
let playButton;
let stopButton;
let speedSlider;
let statusDiv;
let currentWordDisplay;
let splitModeRadios;
let fontColorPicker;
let bgColorPicker;
let difficultyRadios;
let generateArticleButton;
let aiSection;
let questionContainer;
let answerInput;
let submitAnswerButton;
let feedbackP;
let fullArticleContainer;
let fullArticleP;

async function generateArticle() {
    const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
    let articleLength;

    switch (difficulty) {
        case 'easy':
            articleLength = 100;
            break;
        case 'medium':
            articleLength = 300;
            break;
        case 'hard':
            articleLength = 600;
            break;
    }

    statusDiv.textContent = '正在生成文章...';
    generateArticleButton.disabled = true;
    aiSection.classList.add('hidden');
    questionContainer.classList.add('hidden');
    fullArticleContainer.classList.add('hidden');
    feedbackP.textContent = '';
    answerInput.value = '';

    try {
        const response = await fetch('./api/deepseek', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [{ role: "system", content: `請生成一篇繁體中文的故事性文章，長度約為 ${articleLength} 字，故事需以懸疑／推理／反轉／幽默／悲劇其中一種風格進行。請避免使用通俗道德勸世故事。懸疑／推理／反轉／幽默／悲劇其中一種風格進行。請避免使用通俗道德勸世故事。。文章需包含完整事件脈絡、明確人物設定與具體細節，並穿插可用於閱讀理解測驗的資訊（如事件發生時間、地點、數據、因果關係、人物動機與行動結果等）。故事情節可以日常生活、校園事件、旅遊經歷、小型調查、職場互動或意外狀況為背景，避免寫成制式新聞或單純資料彙整報告。請務必包含至少兩個角色之間的互動，並讓事件具備起承轉合。文章結尾請提出一個封閉式的理解性問題，該問題必須對應內文中出現過的明確、可查證的事實細節，並且具有唯一正確答案。問題範例如：「林曉文最後是在哪裡找到她遺失的手機？」或「根據故事，阿凱是什麼時候決定離開公司的？」請避免是非題、主觀推論或感受性提問。請勿提供答案 ` }]
            }),
        });

        if (!response.ok) {
            let errorText;
            try {
                // 嘗試解析 JSON 錯誤，先複製回應以避免耗盡串流
                const errorData = await response.clone().json();
                errorText = errorData.error || JSON.stringify(errorData);
            } catch (e) {
                // 如果解析 JSON 失敗，則讀取純文字
                errorText = await response.text();
            }
            throw new Error(errorText);
        }

        const completion = await response.json();
        const responseText = completion.choices[0].message.content;
        const lastQuestionMarkIndex = responseText.lastIndexOf('？');
        
        aiSection.classList.remove('hidden');
        questionContainer.classList.remove('hidden');

        if (lastQuestionMarkIndex !== -1) {
            fullArticle = responseText.substring(0, lastQuestionMarkIndex + 1);
            // const question = responseText.substring(lastQuestionMarkIndex + 1).trim();
            // questionP.textContent = question;
            // statusDiv.textContent = '生成完成，AI 文章已生成，請回答問題。';
        } else {
            fullArticle = responseText;
            // questionP.textContent = '無法從生成內容中提取問題。';
            // statusDiv.textContent = '生成完成，AI 文章已生成。';
        }
        
        textInput.value = ''; // Keep text area empty
        updateDisplayUnits(fullArticle); // Prepare for playback

    } catch (error) {
        console.error('Error generating article:', error);
        let displayError = error.message;
        // 檢查錯誤訊息是否為 HTML
        if (displayError.trim().startsWith('<!DOCTYPE html>')) {
            displayError = '與後端服務的連線逾時，請稍後再試。(Error 522)';
        }
        statusDiv.textContent = `生成文章失敗: ${displayError}`;
    } finally {
        generateArticleButton.disabled = false;
    }
}

async function checkAnswer() {
    const answer = answerInput.value.trim();
    if (!answer) {
        feedbackP.textContent = '請輸入答案。';
        return;
    }

    feedbackP.textContent = '正在檢查答案...';
    submitAnswerButton.disabled = true;

    try {
        const response = await fetch('./api/deepseek', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: `這是文章：${fullArticle}` },
                    { role: "user", content: `這是使用者的回答：${answer}` },
                    { role: "user", content: `請判斷這個回答是否正確，並簡短地用中文回答「正確」或「不正確，原因是...」。` }
                ]
            }),
        });

        if (!response.ok) {
            let errorText;
            try {
                // 嘗試解析 JSON 錯誤，先複製回應以避免耗盡串流
                const errorData = await response.clone().json();
                errorText = errorData.error || JSON.stringify(errorData);
            } catch (e) {
                // 如果解析 JSON 失敗，則讀取純文字
                errorText = await response.text();
            }
            throw new Error(errorText);
        }
        
        const completion = await response.json();
        feedbackP.textContent = completion.choices[0].message.content;
        fullArticleP.textContent = fullArticle;
        fullArticleContainer.classList.remove('hidden');
        textInput.value = fullArticle;
        updateDisplayUnits();

    } catch (error) {
        console.error('Error checking answer:', error);
        let displayError = error.message;
        // 檢查錯誤訊息是否為 HTML
        if (displayError.trim().startsWith('<!DOCTYPE html>')) {
            displayError = '與後端服務的連線逾時，請稍後再試。(Error 522)';
        }
        feedbackP.textContent = `檢查答案失敗: ${displayError}`;
    } finally {
        submitAnswerButton.disabled = false;
    }
}


function updateDisplayUnits(sourceText = null) {
    const isAiTab = document.getElementById('radio-1').checked;
    let textToProcess = '';

    if (sourceText !== null) {
        textToProcess = sourceText.trim();
    } else {
        textToProcess = isAiTab ? fullArticle.trim() : textInput.value.trim();
    }

    const currentSplitMode = document.querySelector('input[name="splitMode"]:checked').value;

    if (currentSplitMode === 'word') {
        displayUnits = textToProcess.match(wordTokenRegex) || [];
    } else { // sentence mode
        const rawSentences = textToProcess.match(/[^。！？；\n]+[。！？；]?/g) || [];
        displayUnits = [];
        for (const initialSentence of rawSentences) {
            const trimmedInitialSentence = initialSentence.trim();
            if (trimmedInitialSentence.length === 0) {
                continue;
            }
            let currentIndexInSentence = 0;
            while (currentIndexInSentence < trimmedInitialSentence.length) {
                let nextCommaIndex = trimmedInitialSentence.indexOf('，', currentIndexInSentence);
                if (nextCommaIndex !== -1) {
                    const segment = trimmedInitialSentence.substring(currentIndexInSentence, nextCommaIndex + 1);
                    if (segment.trim().length > 0) {
                        displayUnits.push(segment.trim());
                    }
                    currentIndexInSentence = nextCommaIndex + 1;
                } else {
                    const segment = trimmedInitialSentence.substring(currentIndexInSentence);
                    if (segment.trim().length > 0) {
                        displayUnits.push(segment.trim());
                    }
                    break;
                }
            }
        }
        displayUnits = displayUnits.filter(s => s.length > 0);
    }

    playButton.disabled = displayUnits.length === 0;

    if (displayUnits.length > 0) {
        if (currentSplitMode === 'word') {
            statusDiv.textContent = `共找到 ${displayUnits.length} 個可顯示字/詞 (已忽略標點)。`;
        } else {
            statusDiv.textContent = `共找到 ${displayUnits.length} 個顯示段落。`;
        }
    } else {
        if (isAiTab) {
            statusDiv.textContent = '';
        } else {
            if (currentSplitMode === 'word') {
                statusDiv.textContent = '請輸入可播放的文字 (字/詞模式)。';
            } else {
                statusDiv.textContent = '請輸入可播放的文字 (句子/段落模式)。';
            }
        }
    }

    currentUnitIndex = 0;
    if (!isPlaying) {
        currentWordDisplay.textContent = '';
    }
}

function playNextUnit() {
    if (!isPlaying || currentUnitIndex >= displayUnits.length) {
        stopPlaying();
        if (currentUnitIndex >= displayUnits.length && displayUnits.length > 0) {
            statusDiv.textContent = '播放完畢。';
        }
        return;
    }

    const currentToken = displayUnits[currentUnitIndex];
    currentWordDisplay.textContent = currentToken;

    // Adjust font size dynamically for Apple-style UI
    const baseFontSizeVW = 7; 
    if (document.querySelector('input[name="splitMode"]:checked').value === 'sentence') {
        let fontSize = baseFontSizeVW;
        if (currentToken.length > 40) {
            fontSize = baseFontSizeVW * 0.6;
        } else if (currentToken.length > 20) {
            fontSize = baseFontSizeVW * 0.8;
        }
        currentWordDisplay.style.fontSize = `${fontSize}vw`;
    } else { // word mode
        let wordFontSize = baseFontSizeVW * 1.8;
        if (window.innerWidth <= 768) {
           wordFontSize = baseFontSizeVW * 2.2;
        }
         if (window.innerWidth <= 480) {
           wordFontSize = baseFontSizeVW * 2.5;
        }
        currentWordDisplay.style.fontSize = `${wordFontSize}vw`;
    }


    const tokensPerMinute = parseInt(speedSlider.value) || 120; 
    const safeTokensPerMinute = Math.max(1, tokensPerMinute); 
    const delay = (60 / safeTokensPerMinute) * 1000; 

    console.log(`Displaying: "${currentToken}", Speed: ${tokensPerMinute} TPM, Delay: ${delay.toFixed(2)}ms, Mode: ${document.querySelector('input[name="splitMode"]:checked').value}`);
    
    currentUnitIndex++; 

    displayTimer = setTimeout(playNextUnit, delay);
}

function stopPlaying() {
    isPlaying = false; 
    if (displayTimer) {
        clearTimeout(displayTimer);
        displayTimer = null;
    }
    
    textInput.disabled = false;
    speedSlider.disabled = false;
    for (const radio of splitModeRadios) {
        radio.disabled = false;
    }
    fontColorPicker.disabled = false;
    bgColorPicker.disabled = false;
    stopButton.disabled = true;
    playButton.disabled = displayUnits.length === 0;


    if (statusDiv.textContent === '播放完畢。' || statusDiv.textContent === '正在播放...') {
         updateDisplayUnits(); 
    } else if (displayUnits.length > 0) {
         statusDiv.textContent = '播放已停止。';
    } else { 
         statusDiv.textContent = '請輸入文字。';
    }
}

function initializeApp() {
    textInput = document.getElementById('textInput');
    playButton = document.getElementById('playButton');
    stopButton = document.getElementById('stopButton');
    speedSlider = document.getElementById('speedSlider');
    statusDiv = document.getElementById('status');
    currentWordDisplay = document.getElementById('currentWordDisplay');
    splitModeRadios = document.getElementsByName('splitMode');
    fontColorPicker = document.getElementById('fontColorPicker');
    bgColorPicker = document.getElementById('bgColorPicker');
    difficultyRadios = document.getElementsByName('difficulty');
    generateArticleButton = document.getElementById('generateArticleButton');
    aiSection = document.getElementById('ai-section');
    questionContainer = document.getElementById('question-container');
    answerInput = document.getElementById('answerInput');
    submitAnswerButton = document.getElementById('submitAnswerButton');
    feedbackP = document.getElementById('feedback');
    fullArticleContainer = document.getElementById('full-article-container');
    fullArticleP = document.getElementById('fullArticle');


    textInput.addEventListener('input', () => {
        updateDisplayUnits();
        if (textInput.value.trim().length > 0) {
            playButton.disabled = false;
        } else {
            playButton.disabled = true;
        }
    });

    answerInput.addEventListener('input', () => {
        if (answerInput.value.trim().length > 0) {
            submitAnswerButton.disabled = false;
        } else {
            submitAnswerButton.disabled = true;
        }
    });

    for (const radio of splitModeRadios) {
        radio.addEventListener('change', () => {
            updateDisplayUnits();
            if (isPlaying) {
                stopPlaying(); // Stop playback if mode changes
                currentWordDisplay.textContent = '';
            }
        });
    }

    fontColorPicker.addEventListener('input', (event) => {
        currentWordDisplay.style.color = event.target.value;
    });

    bgColorPicker.addEventListener('input', (event) => {
        currentWordDisplay.style.backgroundColor = event.target.value;
    });

    playButton.addEventListener('click', () => {
        if (displayUnits.length === 0) {
            updateDisplayUnits(); 
            if (displayUnits.length === 0) { 
                statusDiv.textContent = '請先輸入文字並選擇模式。';
                return;
            }
        }
        if (isPlaying) return;


        isPlaying = true;
        playButton.disabled = true;
        stopButton.disabled = false;
        textInput.disabled = true;
        speedSlider.disabled = true;
        for (const radio of splitModeRadios) {
            radio.disabled = true;
        }
        fontColorPicker.disabled = true;
        bgColorPicker.disabled = true;
        statusDiv.textContent = '正在播放...';
        
        playNextUnit();
    });

    stopButton.addEventListener('click', () => {
        stopPlaying();
    });

    generateArticleButton.addEventListener('click', generateArticle);
    submitAnswerButton.addEventListener('click', checkAnswer);

    window.addEventListener('beforeunload', () => {
        if (isPlaying) {
            stopPlaying();
        }
    });

    currentWordDisplay.style.color = fontColorPicker.value;
    currentWordDisplay.style.backgroundColor = bgColorPicker.value;
    updateDisplayUnits(); 

    try {
        background = new Color4Bg.AestheticFluidBg({
            dom: "box",
            colors: ["#C3ECF7","#D2F7F7","#F9F9EF","#FFE3EE","#F5D5F7","#C3ECF7"],
            loop: true
        });
    } catch (e) {
        console.error("Failed to initialize background animation:", e);
        // Find the element with id "box" and hide it if the animation fails
        const boxElement = document.getElementById('box');
        if (boxElement) {
            boxElement.style.display = 'none';
        }
    }

    const radio1 = document.getElementById('radio-1');
    const radio2 = document.getElementById('radio-2');
    const aiGenerateTab = document.getElementById('ai-generate');
    const manualInputTab = document.getElementById('manual-input');

    function handleTabSwitch() {
        const isAiTab = radio1.checked;
        aiGenerateTab.classList.toggle('hidden', !isAiTab);
        manualInputTab.classList.toggle('hidden', isAiTab);
        aiSection.classList.toggle('hidden', !isAiTab);
        // When switching tabs, update the display units based on the new context
        updateDisplayUnits(); 
    }

    radio1.addEventListener('change', handleTabSwitch);
    radio2.addEventListener('change', handleTabSwitch);

    // Set initial state
    handleTabSwitch();

    for (const radio of difficultyRadios) {
        radio.addEventListener('change', () => {
            // This is just for debugging, but it might fix the issue
            // if the browser needs a JS event to re-render the CSS.
            console.log('Difficulty changed to:', document.querySelector('input[name="difficulty"]:checked').value);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
