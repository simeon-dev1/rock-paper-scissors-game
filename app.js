// World-Class Rock Paper Scissors - Game Engine
class Game {
  constructor() {
    // DOM Elements
    this.screens = {
      start: document.getElementById('start-screen'),
      gameplay: document.getElementById('gameplay-screen'),
      gameover: document.getElementById('gameover-screen'),
    };
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.roundsButtons = document.querySelectorAll('.rounds-btn');
    this.startBtn = document.getElementById('start-game-btn');
    this.quitBtn = document.getElementById('quit-btn');
    this.playAgainBtn = document.getElementById('play-again-btn');
    this.goToStartBtn = document.getElementById('go-to-start-btn');
    this.optionButtons = document.querySelectorAll('.option-btn');
    this.powerupButtons = {
      mirror: document.getElementById('powerup-mirror'),
      shield: document.getElementById('powerup-shield'),
      double: document.getElementById('powerup-double'),
    };
    this.themeToggle = document.getElementById('theme-toggle');
    
    // Display elements
    this.humanScoreText = document.getElementById('human-score-text');
    this.computerScoreText = document.getElementById('computer-score-text');
    this.humanBar = document.getElementById('human-bar');
    this.computerBar = document.getElementById('computer-bar');
    this.roundResult = document.getElementById('round-result');
    this.humanChoiceEmoji = document.getElementById('human-choice-emoji');
    this.computerChoiceEmoji = document.getElementById('computer-choice-emoji');
    this.roundCounter = document.getElementById('round-counter');
    this.modeIndicator = document.getElementById('mode-indicator');
    this.timerDisplay = document.getElementById('timer-display');
    this.timerSeconds = document.getElementById('timer-seconds');
    this.historyList = document.getElementById('history-list');
    this.gameoverMessage = document.getElementById('gameover-message');
    this.finalHumanScore = document.getElementById('final-human-score');
    this.finalComputerScore = document.getElementById('final-computer-score');
    this.achievementDiv = document.getElementById('achievement-unlock');
    
    // Game state
    this.state = {
      mode: 'best-of', // best-of, endless, timed
      maxRounds: 5,
      currentRound: 0,
      humanScore: 0,
      computerScore: 0,
      activePowerup: null, // 'mirror', 'shield', 'double'
      powerupUsedThisRound: false,
      shieldActive: false,
      lastComputerChoice: null,
      roundHistory: [],
      timerInterval: null,
      timerValue: 15,
      roundInProgress: false,
    };
    
    // Stats (localStorage)
    this.stats = this.loadStats();
    this.updateStatsPreview();
    
    // Emojis
    this.choices = ['ROCK', 'PAPER', 'SCISSORS'];
    this.emojiMap = { ROCK: '🪨', PAPER: '🧻', SCISSORS: '✂️' };
    
    // Sound engine
    this.audioCtx = null;
    
    // Confetti
    this.confettiCanvas = document.getElementById('confetti-canvas');
    this.confettiCtx = this.confettiCanvas?.getContext('2d');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupTheme();
    this.updatePowerupUI();
  }

  /* ---------- Event Listeners ---------- */
  setupEventListeners() {
    // Mode selection
    this.modeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });
    this.roundsButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.roundsButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.maxRounds = parseInt(btn.dataset.rounds);
      });
    });
    
    this.startBtn.addEventListener('click', () => this.startGame());
    this.quitBtn.addEventListener('click', () => this.quitToMenu());
    this.playAgainBtn.addEventListener('click', () => this.startGame());
    this.goToStartBtn.addEventListener('click', () => this.quitToMenu());
    
    this.optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this.state.roundInProgress) return;
        const choice = btn.dataset.choice;
        this.playRound(choice);
      });
    });
    
    this.powerupButtons.mirror.addEventListener('click', () => this.activatePowerup('mirror'));
    this.powerupButtons.shield.addEventListener('click', () => this.activatePowerup('shield'));
    this.powerupButtons.double.addEventListener('click', () => this.activatePowerup('double'));
    
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
  }

  /* ---------- Mode & Navigation ---------- */
  setMode(mode) {
    this.state.mode = mode;
    this.modeButtons.forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
    document.getElementById('best-of-options').style.display = mode === 'best-of' ? 'flex' : 'none';
  }

  startGame() {
    this.resetGameState();
    this.switchScreen('gameplay');
    
    if (this.state.mode === 'best-of') {
      this.modeIndicator.textContent = `Best of ${this.state.maxRounds}`;
      this.roundCounter.textContent = `Round 1/${this.state.maxRounds}`;
    } else if (this.state.mode === 'endless') {
      this.modeIndicator.textContent = 'First to 5';
      this.roundCounter.textContent = 'Round 1';
    } else if (this.state.mode === 'timed') {
      this.modeIndicator.textContent = 'Timed Mode';
      this.roundCounter.textContent = 'Round 1';
      this.timerDisplay.classList.remove('hide');
    }
    
    this.updateScoreDisplay();
    this.clearChoices();
    this.startNewRound();
  }

  startNewRound() {
    this.state.currentRound++;
    this.state.roundInProgress = true;
    this.state.powerupUsedThisRound = false;
    this.roundResult.textContent = '';
    
    if (this.state.mode === 'best-of') {
      this.roundCounter.textContent = `Round ${this.state.currentRound}/${this.state.maxRounds}`;
    } else {
      this.roundCounter.textContent = `Round ${this.state.currentRound}`;
    }
    
    this.clearChoices();
    this.enableOptionButtons(true);
    this.updatePowerupUI();
    
    if (this.state.mode === 'timed') {
      this.startTimer();
    }
  }

  quitToMenu() {
    this.stopTimer();
    this.switchScreen('start');
    this.updateStatsPreview();
  }

  switchScreen(screenId) {
    Object.values(this.screens).forEach(s => s.classList.add('hide'));
    this.screens[screenId].classList.remove('hide');
  }

  /* ---------- Game Logic ---------- */
  playRound(humanChoice) {
    if (!this.state.roundInProgress) return;
    
    let computerChoice = this.getComputerChoice();
    let effectiveHuman = humanChoice;
    
    // Handle powerup: Mirror
    if (this.state.activePowerup === 'mirror') {
      if (this.state.lastComputerChoice) {
        effectiveHuman = this.state.lastComputerChoice;
        this.showNotification('🪞 Mirror used! Copied last move.');
      }
      this.state.activePowerup = null;
    }
    
    // Update last computer choice for mirror
    this.state.lastComputerChoice = computerChoice;
    
    // Determine result
    let result = this.getResult(effectiveHuman, computerChoice);
    
    // Shield blocks a loss
    if (result === 'lose' && this.state.shieldActive) {
      result = 'tie';
      this.state.shieldActive = false;
      this.showNotification('🛡️ Shield blocked a loss!');
    }
    
    // Double points powerup
    let points = 1;
    if (this.state.activePowerup === 'double' && result === 'win') {
      points = 2;
      this.showNotification('✨ Double points activated!');
      this.state.activePowerup = null;
    }
    
    // Apply result
    if (result === 'win') {
      this.state.humanScore += points;
      this.roundResult.innerHTML = `<span style="color: var(--win)">You won! 💪</span>`;
      this.playSound('win');
    } else if (result === 'lose') {
      this.state.computerScore++;
      this.roundResult.innerHTML = `<span style="color: var(--lose)">Computer won 😓</span>`;
      this.playSound('lose');
    } else {
      this.roundResult.innerHTML = `<span style="color: var(--tie)">It's a tie 🧐</span>`;
      this.playSound('tie');
    }
    
    // Update display
    this.humanChoiceEmoji.textContent = this.emojiMap[effectiveHuman];
    this.computerChoiceEmoji.textContent = this.emojiMap[computerChoice];
    this.animateChoiceCards();
    this.addHistoryEntry(effectiveHuman, computerChoice, result);
    this.updateScoreDisplay();
    
    // Deactivate double powerup if not used (it expires after round)
    if (this.state.activePowerup === 'double') {
      this.state.activePowerup = null;
    }
    
    this.stopTimer();
    this.state.roundInProgress = false;
    this.enableOptionButtons(false);
    this.updatePowerupUI();
    
    // Check game over conditions
    setTimeout(() => this.checkGameOver(), 1200);
  }

  getComputerChoice() {
    // Slightly smarter AI: if human used a powerup last round, random but uniform
    const rand = Math.random();
    if (rand < 0.33) return 'ROCK';
    else if (rand < 0.66) return 'PAPER';
    else return 'SCISSORS';
  }

  getResult(human, computer) {
    if (human === computer) return 'tie';
    if (
      (human === 'ROCK' && computer === 'SCISSORS') ||
      (human === 'PAPER' && computer === 'ROCK') ||
      (human === 'SCISSORS' && computer === 'PAPER')
    ) return 'win';
    return 'lose';
  }

  checkGameOver() {
    let gameOver = false;
    let winner = null;
    
    if (this.state.mode === 'endless' || this.state.mode === 'timed') {
      if (this.state.humanScore >= 5) {
        gameOver = true;
        winner = 'human';
      } else if (this.state.computerScore >= 5) {
        gameOver = true;
        winner = 'computer';
      }
    } else if (this.state.mode === 'best-of') {
      const needed = Math.ceil(this.state.maxRounds / 2);
      if (this.state.humanScore >= needed) {
        gameOver = true;
        winner = 'human';
      } else if (this.state.computerScore >= needed) {
        gameOver = true;
        winner = 'computer';
      } else if (this.state.currentRound >= this.state.maxRounds) {
        // Max rounds reached, decide by score
        gameOver = true;
        winner = this.state.humanScore > this.state.computerScore ? 'human' : 
                 this.state.computerScore > this.state.humanScore ? 'computer' : 'tie';
      }
    }
    
    if (gameOver) {
      this.endGame(winner);
    } else {
      // Next round after short delay
      setTimeout(() => this.startNewRound(), 500);
    }
  }

  endGame(winner) {
    this.stopTimer();
    this.state.roundInProgress = false;
    
    // Update stats
    if (winner === 'human') {
      this.stats.wins++;
      this.stats.streak++;
      this.stats.bestStreak = Math.max(this.stats.bestStreak, this.stats.streak);
      this.gameoverMessage.textContent = '🎉 You Won!';
    } else if (winner === 'computer') {
      this.stats.losses++;
      this.stats.streak = 0;
      this.gameoverMessage.textContent = '😔 Computer Won';
    } else {
      this.stats.ties++;
      this.gameoverMessage.textContent = '🤝 It\'s a Tie!';
    }
    this.stats.gamesPlayed++;
    this.saveStats();
    
    this.finalHumanScore.textContent = this.state.humanScore;
    this.finalComputerScore.textContent = this.state.computerScore;
    this.achievementDiv.textContent = '';
    
    // Check achievements
    if (this.stats.wins === 1 && this.stats.gamesPlayed === 1) {
      this.achievementDiv.textContent = '🏅 First Victory!';
    } else if (this.stats.bestStreak >= 5) {
      this.achievementDiv.textContent = '🔥 5-Game Win Streak!';
    }
    
    this.switchScreen('gameover');
    if (winner === 'human') this.launchConfetti();
    this.playSound(winner === 'human' ? 'win' : 'lose');
  }

  /* ---------- Powerups ---------- */
  activatePowerup(type) {
    if (!this.state.roundInProgress || this.state.powerupUsedThisRound) return;
    if (type === 'mirror' && !this.state.lastComputerChoice) {
      this.showNotification('Mirror needs a previous round!');
      return;
    }
    this.state.activePowerup = type;
    this.state.powerupUsedThisRound = true;
    this.updatePowerupUI();
    this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} activated!`);
    if (type === 'shield') this.state.shieldActive = true;
  }

  updatePowerupUI() {
    this.powerupButtons.mirror.disabled = !this.state.roundInProgress || this.state.powerupUsedThisRound;
    this.powerupButtons.shield.disabled = !this.state.roundInProgress || this.state.powerupUsedThisRound || this.state.shieldActive;
    this.powerupButtons.double.disabled = !this.state.roundInProgress || this.state.powerupUsedThisRound;
  }

  /* ---------- Timer ---------- */
  startTimer() {
    this.state.timerValue = 15;
    this.timerSeconds.textContent = this.state.timerValue;
    this.timerDisplay.classList.remove('hide');
    this.stopTimer();
    this.state.timerInterval = setInterval(() => {
      this.state.timerValue--;
      this.timerSeconds.textContent = this.state.timerValue;
      if (this.state.timerValue <= 0) {
        this.stopTimer();
        this.forceRandomChoice();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.state.timerInterval) {
      clearInterval(this.state.timerInterval);
      this.state.timerInterval = null;
    }
    this.timerDisplay.classList.add('hide');
  }

  forceRandomChoice() {
    if (!this.state.roundInProgress) return;
    const randomChoice = this.choices[Math.floor(Math.random() * 3)];
    this.playRound(randomChoice);
  }

  /* ---------- UI Updates ---------- */
  updateScoreDisplay() {
    this.humanScoreText.textContent = this.state.humanScore;
    this.computerScoreText.textContent = this.state.computerScore;
    
    const maxNeeded = this.state.mode === 'best-of' ? Math.ceil(this.state.maxRounds/2) : 5;
    const humanPercent = Math.min((this.state.humanScore / maxNeeded) * 100, 100);
    const computerPercent = Math.min((this.state.computerScore / maxNeeded) * 100, 100);
    
    this.humanBar.style.width = `${humanPercent}%`;
    this.computerBar.style.width = `${computerPercent}%`;
  }

  clearChoices() {
    this.humanChoiceEmoji.textContent = '❓';
    this.computerChoiceEmoji.textContent = '❓';
  }

  enableOptionButtons(enable) {
    this.optionButtons.forEach(btn => btn.disabled = !enable);
  }

  animateChoiceCards() {
    document.getElementById('human-choice-card')?.classList.add('flash');
    document.getElementById('computer-choice-card')?.classList.add('flash');
    setTimeout(() => {
      document.getElementById('human-choice-card')?.classList.remove('flash');
      document.getElementById('computer-choice-card')?.classList.remove('flash');
    }, 400);
  }

  showNotification(msg) {
    this.roundResult.innerHTML = msg;
    setTimeout(() => { if (this.roundResult.innerHTML === msg) this.roundResult.innerHTML = ''; }, 2000);
  }

  addHistoryEntry(human, computer, result) {
    const entry = {
      round: this.state.currentRound,
      human,
      computer,
      result,
    };
    this.state.roundHistory.push(entry);
    const li = document.createElement('li');
    li.innerHTML = `R${entry.round}: ${this.emojiMap[human]} vs ${this.emojiMap[computer]} → ${result}`;
    this.historyList.prepend(li);
    if (this.historyList.children.length > 20) this.historyList.removeChild(this.historyList.lastChild);
  }

  /* ---------- Stats & Storage ---------- */
  loadStats() {
    const saved = localStorage.getItem('rps_worldclass_stats');
    return saved ? JSON.parse(saved) : {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      streak: 0,
      bestStreak: 0,
    };
  }
  saveStats() {
    localStorage.setItem('rps_worldclass_stats', JSON.stringify(this.stats));
  }
  updateStatsPreview() {
    document.getElementById('total-wins').textContent = this.stats.wins;
    const total = this.stats.gamesPlayed || 1;
    const rate = Math.round((this.stats.wins / total) * 100);
    document.getElementById('win-rate').textContent = `${rate}%`;
  }

  /* ---------- Theme ---------- */
  setupTheme() {
    const saved = localStorage.getItem('rps_theme') || 'dark';
    document.body.className = saved;
  }
  toggleTheme() {
    const current = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.className = current;
    localStorage.setItem('rps_theme', current);
  }

  /* ---------- Sound ---------- */
  playSound(type) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      gain.gain.value = 0.1;
      if (type === 'win') { osc.type = 'sine'; osc.frequency.value = 600; }
      else if (type === 'lose') { osc.type = 'sawtooth'; osc.frequency.value = 300; }
      else { osc.type = 'triangle'; osc.frequency.value = 450; }
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch (e) { /* silent fail */ }
  }

  /* ---------- Confetti ---------- */
  launchConfetti() {
    if (!this.confettiCtx) return;
    const w = this.confettiCanvas.width = window.innerWidth;
    const h = this.confettiCanvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h - h,
        size: Math.random() * 8 + 2,
        speedY: Math.random() * 6 + 3,
        speedX: Math.random() * 4 - 2,
        color: `hsl(${Math.random() * 360}, 80%, 65%)`,
      });
    }
    const ctx = this.confettiCtx;
    let frame = 0;
    const animate = () => {
      if (frame > 100) { ctx.clearRect(0, 0, w, h); return; }
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }

  /* ---------- Reset State ---------- */
  resetGameState() {
    this.state.humanScore = 0;
    this.state.computerScore = 0;
    this.state.currentRound = 0;
    this.state.activePowerup = null;
    this.state.powerupUsedThisRound = false;
    this.state.shieldActive = false;
    this.state.lastComputerChoice = null;
    this.state.roundHistory = [];
    this.state.roundInProgress = false;
    this.historyList.innerHTML = '';
    this.stopTimer();
    this.timerDisplay.classList.add('hide');
  }
}

// Boot the game
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
