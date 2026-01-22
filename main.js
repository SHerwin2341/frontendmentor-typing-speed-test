// ============================================
// Typing Speed Test - Main JavaScript
// ============================================

// ============================================
// PHASE 1 – Core Typing Logic
// ============================================

// State management
const state = {
  isTestActive: false,
  isTestComplete: false,
  currentIndex: 0,
  totalErrors: 0,
  startTime: null,
  endTime: null,
  timerInterval: null,
  timeRemaining: 60,
  mode: 'timed', // 'timed' or 'passage'
  difficulty: 'easy', // 'easy', 'medium', 'hard'
  currentText: '',
  characters: [],
  personalBest: parseInt(localStorage.getItem('personalBest')) || 0
};

// Cache DOM elements
const elements = {
  typingText: document.querySelector('[data-typing-text]'),
  typingPrompt: document.querySelector('.typing-test__prompt'),
  instructionText: document.querySelector('.typing-test__instruction-text'),
  instructionSubtext: document.querySelector('.typing-test__instruction-subtext'),
  
  // Stats
  statWPM: document.querySelector('[data-stat-value="wpm"]'),
  statAccuracy: document.querySelector('[data-stat-value="accuracy"]'),
  statTime: document.querySelector('[data-stat-value="time"]'),
  
  // Results
  resultsSection: document.querySelector('.results'),
  resultsWPM: document.querySelector('[data-results-wpm]'),
  resultsAccuracy: document.querySelector('[data-results-accuracy]'),
  resultsCharacters: document.querySelector('[data-results-characters]'),
  resultsMessage: document.querySelector('[data-results-message]'),
  
  // Controls
  difficultyButtons: document.querySelectorAll('[data-difficulty]'),
  modeButtons: document.querySelectorAll('[data-mode]'),
  
  // Actions
  restartButton: document.querySelector('[data-action="restart"]'),
  goAgainButton: document.querySelector('[data-action="go-again"]'),
  
  // Personal best
  pbBanner: document.querySelector('.pb-banner'),
  pbValue: document.querySelector('[data-pb-value]')
};

// Load text data
let textData = null;

async function loadTextData() {
  try {
    const response = await fetch('./data.json');
    textData = await response.json();
  } catch (error) {
    console.error('Error loading text data:', error);
    // Fallback to default text if fetch fails
    textData = {
      easy: [{ id: 'easy-1', text: 'The sun rose over the quiet town. Birds sang in the trees as people woke up and started their day. It was going to be a warm and sunny morning.' }],
      medium: [{ id: 'medium-1', text: 'Learning a new skill takes patience and consistent practice. Whether you\'re studying a language, picking up an instrument, or mastering a sport, the key is to show up every day.' }],
      hard: [{ id: 'hard-1', text: 'The philosopher\'s argument hinged on a seemingly paradoxical assertion: that absolute freedom, pursued without constraint, inevitably undermines itself.' }]
    };
  }
}

// Get random text for current difficulty
function getRandomText() {
  if (!textData || !textData[state.difficulty]) {
    return '';
  }
  const texts = textData[state.difficulty];
  const randomIndex = Math.floor(Math.random() * texts.length);
  return texts[randomIndex].text;
}

// Initialize text display
function initializeText() {
  const text = getRandomText();
  state.currentText = text;
  state.characters = text.split('');
  
  // Clear existing content
  elements.typingText.innerHTML = '';
  
  // Create character spans
  state.characters.forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.setAttribute('data-char-index', index);
    span.textContent = char;
    elements.typingText.appendChild(span);
  });
  
  // Set first character as current
  if (state.characters.length > 0) {
    updateCharacterState(0, 'current');
  }
}

// Update character state (correct, incorrect, current)
function updateCharacterState(index, stateClass) {
  const charElement = document.querySelector(`[data-char-index="${index}"]`);
  if (!charElement) return;
  
  // Remove all state classes
  charElement.classList.remove('correct', 'incorrect', 'current');
  
  // Add new state class if provided
  if (stateClass) {
    charElement.classList.add(stateClass);
  }
}

// Start test on first keystroke
function startTest() {
  if (state.isTestActive) return;
  
  state.isTestActive = true;
  state.isTestComplete = false;
  state.startTime = Date.now();
  
  // Update instructions
  elements.instructionText.textContent = 'Keep typing...';
  elements.instructionSubtext.textContent = '';
  
  // Start timer if in timed mode
  if (state.mode === 'timed') {
    startTimer();
  }
}

// Handle keyboard input
function handleKeyPress(event) {
  // Prevent default for most keys
  if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Enter') {
    event.preventDefault();
  }
  
  // Don't process input if test is complete
  if (state.isTestComplete) {
    return;
  }
  
  // Start test on first keystroke
  if (!state.isTestActive) {
    startTest();
  }
  
  // Handle backspace
  if (event.key === 'Backspace') {
    handleBackspace();
    return;
  }
  
  // Ignore non-printable keys (except Enter which we handle)
  if (event.key.length !== 1 && event.key !== 'Enter') {
    return;
  }
  
  // Handle Enter key (treat as space)
  const inputChar = event.key === 'Enter' ? ' ' : event.key;
  
  // Check if we've reached the end
  if (state.currentIndex >= state.characters.length) {
    if (state.mode === 'passage') {
      endTest();
    }
    return;
  }
  
  // Get expected character
  const expectedChar = state.characters[state.currentIndex];
  
  // Compare input with expected
  if (inputChar === expectedChar) {
    // Correct character
    updateCharacterState(state.currentIndex, 'correct');
    state.currentIndex++;
    
    // Update current character
    if (state.currentIndex < state.characters.length) {
      updateCharacterState(state.currentIndex, 'current');
    } else if (state.mode === 'passage') {
      // Reached end of passage
      endTest();
    }
  } else {
    // Incorrect character
    updateCharacterState(state.currentIndex, 'incorrect');
    state.totalErrors++;
    state.currentIndex++;
    
    // Update current character
    if (state.currentIndex < state.characters.length) {
      updateCharacterState(state.currentIndex, 'current');
    }
  }
  
  // Update stats
  updateStats();
}

// Handle backspace
function handleBackspace() {
  if (state.currentIndex === 0) return;
  
  // Remove current state from current character
  updateCharacterState(state.currentIndex, null);
  
  // Move back one character
  state.currentIndex--;
  
  // Remove state from previous character
  updateCharacterState(state.currentIndex, null);
  
  // Set previous character as current
  updateCharacterState(state.currentIndex, 'current');
  
  // Note: We don't reduce error count on backspace as errors are permanent
}

// ============================================
// PHASE 2 – Timer Logic (Timed Mode)
// ============================================

function startTimer() {
  state.timeRemaining = 60;
  updateTimerDisplay();
  
  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    updateTimerDisplay();
    
    if (state.timeRemaining <= 0) {
      clearInterval(state.timerInterval);
      state.timeRemaining = 0;
      endTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (elements.statTime) {
    elements.statTime.textContent = `${state.timeRemaining}s`;
  }
}

function stopTimer() {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

// ============================================
// PHASE 3 – Mode & Difficulty
// ============================================

function setDifficulty(difficulty) {
  if (state.isTestActive) return; // Don't change during test
  
  state.difficulty = difficulty;
  
  // Update active button
  elements.difficultyButtons.forEach(btn => {
    if (btn.dataset.difficulty === difficulty) {
      btn.classList.add('controls__option--active');
    } else {
      btn.classList.remove('controls__option--active');
    }
  });
  
  // Reload text
  resetTest();
}

function setMode(mode) {
  if (state.isTestActive) return; // Don't change during test
  
  state.mode = mode;
  
  // Update active button
  elements.modeButtons.forEach(btn => {
    if (btn.dataset.mode === mode) {
      btn.classList.add('controls__option--active');
    } else {
      btn.classList.remove('controls__option--active');
    }
  });
  
  // Reset test
  resetTest();
}

// ============================================
// PHASE 4 – Stats
// ============================================

function calculateWPM() {
  if (!state.startTime) return 0;
  
  const elapsedTime = state.isTestComplete 
    ? (state.endTime - state.startTime) / 1000 
    : (Date.now() - state.startTime) / 1000;
  
  if (elapsedTime === 0) return 0;
  
  // Calculate words typed (5 characters = 1 word)
  const charactersTyped = state.currentIndex;
  const wordsTyped = charactersTyped / 5;
  
  // WPM = (words typed / time in minutes)
  const minutes = elapsedTime / 60;
  const wpm = minutes > 0 ? Math.round(wordsTyped / minutes) : 0;
  
  return wpm;
}

function calculateAccuracy() {
  if (state.currentIndex === 0) return 100;
  
  const totalChars = state.currentIndex;
  const correctChars = totalChars - state.totalErrors;
  const accuracy = Math.round((correctChars / totalChars) * 100);
  
  return Math.max(0, accuracy); // Ensure non-negative
}

function updateStats() {
  // Update WPM
  const wpm = calculateWPM();
  if (elements.statWPM) {
    elements.statWPM.textContent = wpm;
  }
  
  // Update Accuracy
  const accuracy = calculateAccuracy();
  if (elements.statAccuracy) {
    elements.statAccuracy.textContent = `${accuracy}%`;
  }
  
  // Timer is updated separately in timer function
}

function endTest() {
  if (state.isTestComplete) return;
  
  state.isTestComplete = true;
  state.isTestActive = false;
  state.endTime = Date.now();
  
  // Stop timer
  stopTimer();
  
  // Calculate final stats
  const finalWPM = calculateWPM();
  const finalAccuracy = calculateAccuracy();
  const charactersTyped = state.currentIndex;
  const totalCharacters = state.characters.length;
  
  // Update personal best
  if (finalWPM > state.personalBest) {
    state.personalBest = finalWPM;
    localStorage.setItem('personalBest', finalWPM.toString());
    updatePersonalBestBanner();
  }
  
  // Show results
  showResults(finalWPM, finalAccuracy, charactersTyped, totalCharacters);
  
  // Hide typing test section
  if (elements.typingPrompt) {
    elements.typingPrompt.style.display = 'none';
  }
  if (document.querySelector('.typing-test__instructions')) {
    document.querySelector('.typing-test__instructions').style.display = 'none';
  }
}

function showResults(wpm, accuracy, typed, total) {
  // Update results values
  if (elements.resultsWPM) {
    elements.resultsWPM.textContent = wpm;
  }
  if (elements.resultsAccuracy) {
    elements.resultsAccuracy.textContent = `${accuracy}%`;
  }
  if (elements.resultsCharacters) {
    elements.resultsCharacters.textContent = `${typed}/${total}`;
  }
  
  // Update message based on performance
  let message = 'Solid run. Keep pushing to beat your high score.';
  if (wpm >= state.personalBest && wpm > 0) {
    message = 'New personal best! Amazing work!';
  } else if (accuracy >= 95 && wpm > 50) {
    message = 'Excellent accuracy and speed!';
  } else if (accuracy >= 90) {
    message = 'Great accuracy! Keep it up.';
  } else if (wpm > 60) {
    message = 'Fast typing! Focus on accuracy.';
  }
  
  if (elements.resultsMessage) {
    elements.resultsMessage.textContent = message;
  }
  
  // Show results section
  if (elements.resultsSection) {
    elements.resultsSection.classList.remove('hidden');
  }
}

// ============================================
// PHASE 5 – UI Interaction
// ============================================

function resetTest() {
  // Reset state
  state.isTestActive = false;
  state.isTestComplete = false;
  state.currentIndex = 0;
  state.totalErrors = 0;
  state.startTime = null;
  state.endTime = null;
  state.timeRemaining = 60;
  
  // Stop timer
  stopTimer();
  
  // Reset text
  initializeText();
  
  // Reset stats display
  if (elements.statWPM) {
    elements.statWPM.textContent = '0';
  }
  if (elements.statAccuracy) {
    elements.statAccuracy.textContent = '0%';
  }
  if (elements.statTime) {
    elements.statTime.textContent = '0s';
  }
  
  // Reset instructions
  if (elements.instructionText) {
    elements.instructionText.textContent = 'Start Typing Test';
  }
  if (elements.instructionSubtext) {
    elements.instructionSubtext.textContent = 'Or click the text and start typing';
  }
  
  // Show typing test section
  if (elements.typingPrompt) {
    elements.typingPrompt.style.display = '';
  }
  if (document.querySelector('.typing-test__instructions')) {
    document.querySelector('.typing-test__instructions').style.display = '';
  }
  
  // Hide results
  if (elements.resultsSection) {
    elements.resultsSection.classList.add('hidden');
  }
  
  // Focus on typing area
  if (elements.typingPrompt) {
    elements.typingPrompt.focus();
  }
}

function updatePersonalBestBanner() {
  if (elements.pbValue) {
    elements.pbValue.textContent = state.personalBest;
  }
  if (elements.pbBanner) {
    elements.pbBanner.classList.remove('hidden');
    elements.pbBanner.setAttribute('aria-hidden', 'false');
  }
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
  // Keyboard input
  if (elements.typingPrompt) {
    elements.typingPrompt.addEventListener('keydown', handleKeyPress);
    elements.typingPrompt.addEventListener('click', () => {
      elements.typingPrompt.focus();
    });
  }
  
  // Difficulty buttons
  elements.difficultyButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setDifficulty(btn.dataset.difficulty);
    });
  });
  
  // Mode buttons
  elements.modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });
  
  // Restart button
  if (elements.restartButton) {
    elements.restartButton.addEventListener('click', resetTest);
  }
  
  // Go again button
  if (elements.goAgainButton) {
    elements.goAgainButton.addEventListener('click', resetTest);
  }
}

// ============================================
// Initialization
// ============================================

async function init() {
  // Load text data
  await loadTextData();
  
  // Initialize text
  initializeText();
  
  // Set up event listeners
  setupEventListeners();
  
  // Update personal best banner if exists
  if (state.personalBest > 0) {
    updatePersonalBestBanner();
  }
  
  // Focus on typing area
  if (elements.typingPrompt) {
    elements.typingPrompt.focus();
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
