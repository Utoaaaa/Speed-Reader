let background;
let displayUnits = [];
let currentUnitIndex = 0;
let isPlaying = false;
let displayTimer = null;

// Regex for word/char mode (Chinese chars, Bopomofo, English words, numbers)
const wordTokenRegex = /[\u4e00-\u9fa5\u3105-\u3129\u02CA\u02C7\u02CB\u02D9]|[a-zA-Z0-9]+/g;

let textInput;
let playButton;
let stopButton;
let speedInput;
let statusDiv;
let currentWordDisplay;
let splitModeSelect;
let fontColorPicker;
let bgColorPicker;

function updateDisplayUnits() {
    const text = textInput.value.trim();
    const currentSplitMode = splitModeSelect.value;

    if (currentSplitMode === 'word') {
        displayUnits = text.match(wordTokenRegex) || [];
        statusDiv.textContent = `共找到 ${displayUnits.length} 個可顯示字/詞 (已忽略標點)。`;
    } else { // sentence mode - updated logic (preserve punctuation)
        const rawSentences = text.match(/[^。！？；\n]+[。！？；]?/g) || [];
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
                    // Found a comma. Segment includes the comma.
                    const segment = trimmedInitialSentence.substring(currentIndexInSentence, nextCommaIndex + 1);
                    if (segment.trim().length > 0) { // Ensure segment is not just whitespace
                        displayUnits.push(segment.trim());
                    }
                    currentIndexInSentence = nextCommaIndex + 1;
                } else {
                    // No more commas in the rest of this initialSentence segment
                    const segment = trimmedInitialSentence.substring(currentIndexInSentence);
                    if (segment.trim().length > 0) { // Ensure non-empty segment
                        displayUnits.push(segment.trim());
                    }
                    break; // Exit while loop for this initialSentence
                }
            }
        }
        // Final filter for any empty strings, though the logic above tries to prevent them
        displayUnits = displayUnits.filter(s => s.length > 0);
        statusDiv.textContent = `共找到 ${displayUnits.length} 個顯示段落。`;
    }
    
    if (displayUnits.length > 0) {
        playButton.disabled = false;
    } else {
        playButton.disabled = true;
        if (currentSplitMode === 'word') {
            statusDiv.textContent = '請輸入可播放的文字 (字/詞模式)。';
        } else {
            statusDiv.textContent = '請輸入可播放的文字 (句子/段落模式)。';
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
    if (splitModeSelect.value === 'sentence') {
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


    const tokensPerMinute = parseInt(speedInput.value) || 120; 
    const safeTokensPerMinute = Math.max(1, tokensPerMinute); 
    const delay = (60 / safeTokensPerMinute) * 1000; 

    console.log(`Displaying: "${currentToken}", Speed: ${tokensPerMinute} TPM, Delay: ${delay.toFixed(2)}ms, Mode: ${splitModeSelect.value}`);
    
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
    speedInput.disabled = false;
    splitModeSelect.disabled = false;
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
    if (background) {
        background.colors([bgColorPicker.value, bgColorPicker.value, bgColorPicker.value, bgColorPicker.value]);
    }
}

function initializeApp() {
    textInput = document.getElementById('textInput');
    playButton = document.getElementById('playButton');
    stopButton = document.getElementById('stopButton');
    speedInput = document.getElementById('speedInput');
    statusDiv = document.getElementById('status');
    currentWordDisplay = document.getElementById('currentWordDisplay');
    splitModeSelect = document.getElementById('splitModeSelect');
    fontColorPicker = document.getElementById('fontColorPicker');
    bgColorPicker = document.getElementById('bgColorPicker');

    textInput.addEventListener('input', updateDisplayUnits);
    splitModeSelect.addEventListener('change', () => {
        updateDisplayUnits();
        if (isPlaying) {
            stopPlaying(); // Stop playback if mode changes
            currentWordDisplay.textContent = ''; 
        }
    });

    fontColorPicker.addEventListener('input', (event) => {
        currentWordDisplay.style.color = event.target.value;
    });

    bgColorPicker.addEventListener('input', (event) => {
        currentWordDisplay.style.backgroundColor = event.target.value;
        if (background) {
            background.colors([event.target.value, event.target.value, event.target.value, event.target.value]);
        }
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
        speedInput.disabled = true;
        splitModeSelect.disabled = true;
        fontColorPicker.disabled = true;
        bgColorPicker.disabled = true;
        statusDiv.textContent = '正在播放...';
        
        playNextUnit();
    });

    stopButton.addEventListener('click', () => {
        stopPlaying();
    });

    window.addEventListener('beforeunload', () => {
        if (isPlaying) {
            stopPlaying();
        }
    });

    currentWordDisplay.style.color = fontColorPicker.value;
    currentWordDisplay.style.backgroundColor = bgColorPicker.value;
    updateDisplayUnits(); 

    background = new Color4Bg.BlurGradientBg({
        dom: "box",
        colors: ["#B3E6F3","#F4D1E5","#FBF6D2"],
        loop: true
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
