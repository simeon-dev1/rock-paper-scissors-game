/*************************************************************
 * RPS WORLD CLASS – PREMIUM AUTH + GAME
 *************************************************************/
const SUPABASE_URL = 'https://fqqngzpoclvisiberzev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxcW5nenBvY2x2aXNpYmVyemV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTEzNzQsImV4cCI6MjA5Mzg4NzM3NH0.LuLb0f5m1tjTbpWjGJ8uP03ImI5-7IHu3XcOgV15XvQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------- DOM Elements ----------
const screens = {
  auth: document.getElementById('auth-screen'),
  paywall: document.getElementById('paywall-screen'),
  start: document.getElementById('start-screen'),
  gameplay: document.getElementById('gameplay-screen'),
  gameover: document.getElementById('gameover-screen'),
};
const authPanels = {
  signin: document.getElementById('signin-panel'),
  signup: document.getElementById('signup-panel'),
  forgot: document.getElementById('forgot-panel'),
};
const authErrorEl = document.getElementById('auth-error');
const authSuccessEl = document.getElementById('auth-success');
const logoutBtn = document.getElementById('logout-btn');
const whatsappLink = document.getElementById('whatsapp-link');

// Current user & access
let currentUser = null;
let gameInstance = null;

// ---------- Helper: Show Screen ----------
function showScreen(screenId) {
  Object.values(screens).forEach(s => s.classList.add('hide'));
  screens[screenId].classList.remove('hide');
}

// ---------- Auth Panel Transitions ----------
function showAuthPanel(panelId) {
  Object.values(authPanels).forEach(p => {
    p.classList.add('hidden-right');
  });
  authPanels[panelId].classList.remove('hidden-right');
  authErrorEl.textContent = '';
  authSuccessEl.textContent = '';
}

document.getElementById('show-signup').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthPanel('signup');
});
document.getElementById('show-signin-from-signup').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthPanel('signin');
});
document.getElementById('forgot-password-btn').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthPanel('forgot');
});
document.getElementById('back-to-signin-btn').addEventListener('click', (e) => {
  e.preventDefault();
  showAuthPanel('signin');
});

// ---------- Password Visibility Toggle ----------
document.querySelectorAll('.password-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    btn.textContent = isPassword ? '🙈' : '👁️';
  });
});

// ---------- Password Strength Meter ----------
document.getElementById('signup-password').addEventListener('input', (e) => {
  const val = e.target.value;
  const bar = document.querySelector('.strength-bar');
  const text = document.querySelector('.strength-text');
  let strength = 0;
  if (val.length >= 6) strength++;
  if (val.match(/[A-Z]/)) strength++;
  if (val.match(/[0-9]/)) strength++;
  if (val.match(/[^A-Za-z0-9]/)) strength++;

  const percent = (strength / 4) * 100;
  bar.style.width = percent + '%';
  if (strength <= 1) bar.style.background = 'var(--lose)';
  else if (strength === 2 || strength === 3) bar.style.background = 'var(--tie)';
  else bar.style.background = 'var(--win)';

  if (strength === 0) text.textContent = '';
  else if (strength <= 2) text.textContent = 'Weak';
  else if (strength === 3) text.textContent = 'Good';
  else text.textContent = 'Strong';
  text.style.color = strength <= 2 ? 'var(--lose)' : strength === 3 ? 'var(--tie)' : 'var(--win)';
});

// ---------- Auth Functions ----------
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    shakeElement(document.getElementById('signup-panel'));
    authErrorEl.textContent = error.message;
    return;
  }
  if (data.user && !data.session) {
    // Email confirmation required
    authSuccessEl.textContent = '✅ Account created! Check your email (including spam) for the confirmation link, then log in.';
    setTimeout(() => showAuthPanel('signin'), 3000);
  } else {
    // Confirmation disabled
    await handleUserRecord(data.user);
    await checkAccess();
  }
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    shakeElement(document.getElementById('signin-panel'));
    authErrorEl.textContent = error.message;
    return;
  }
  currentUser = data.user;
  await handleUserRecord(data.user);
  await checkAccess();
}

async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin, // will redirect here after reset
  });
  if (error) {
    shakeElement(document.getElementById('forgot-panel'));
    authErrorEl.textContent = error.message;
  } else {
    authSuccessEl.textContent = '✅ Password reset link sent! Check your email.';
  }
}

async function signOut() {
  await supabase.auth.signOut();
  currentUser = null;
  if (gameInstance) {
    gameInstance.destroy();
    gameInstance = null;
  }
  logoutBtn.style.display = 'none';
  showScreen('auth');
}

// Ensure user record exists
async function handleUserRecord(user) {
  const { data } = await supabase.from('rpc_users').select('id').eq('id', user.id).single();
  if (!data) {
    await supabase.from('rpc_users').insert({ id: user.id });
  }
}

// Check trial / subscription
async function checkAccess() {
  if (!currentUser) return showScreen('auth');

  const { data: userRec } = await supabase
    .from('rpc_users')
    .select('trial_ends_at')
    .eq('id', currentUser.id)
    .single();

  const { data: sub } = await supabase
    .from('rpc_subscriptions')
    .select('subscription_expiry')
    .eq('user_id', currentUser.id)
    .single();

  const now = new Date();
  const trialEnd = userRec?.trial_ends_at ? new Date(userRec.trial_ends_at) : null;
  const subExpiry = sub?.subscription_expiry ? new Date(sub.subscription_expiry) : null;

  if ((subExpiry && subExpiry > now) || (trialEnd && trialEnd > now)) {
    showGameMenu();
  } else {
    showScreen('paywall');
    whatsappLink.href = `https://wa.me/2347062605368?text=I've%20paid%20for%20RPS%20subscription.%20My%20email%20is%20${encodeURIComponent(currentUser.email)}.%20Please%20confirm.`;
  }
}

function showGameMenu() {
  showScreen('start');
  if (!gameInstance) gameInstance = new Game();
}

// Shake animation
function shakeElement(el) {
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 300);
}

// ---------- Event Listeners ----------
document.getElementById('signup-btn').addEventListener('click', () => {
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (password.length < 6) {
    authErrorEl.textContent = 'Password must be at least 6 characters.';
    return;
  }
  signUp(email, password);
});

document.getElementById('signin-btn').addEventListener('click', () => {
  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  signIn(email, password);
});

document.getElementById('send-reset-btn').addEventListener('click', () => {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) return;
  sendPasswordReset(email);
});

logoutBtn.addEventListener('click', signOut);
document.getElementById('check-access-btn').addEventListener('click', checkAccess);

// Auth state listener (handles redirects from email confirmation)
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    currentUser = session.user;
    logoutBtn.style.display = 'inline-block';
    await handleUserRecord(session.user);
    await checkAccess();
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    logoutBtn.style.display = 'none';
    showScreen('auth');
  }
});

// Initial session check
supabase.auth.getUser().then(({ data: { user } }) => {
  if (user) {
    currentUser = user;
    logoutBtn.style.display = 'inline-block';
    handleUserRecord(user).then(() => checkAccess());
  } else {
    showScreen('auth');
  }
});

// ==================== GAME ENGINE ====================
class Game {
  constructor() {
    // DOM elements (same as before)
    this.modeButtons = document.querySelectorAll('.mode-btn');
    this.roundsButtons = document.querySelectorAll('.rounds-btn');
    this.startBtn = document.getElementById('start-game-btn');
    this.quitBtn = document.getElementById('quit-btn');
    this.playAgainBtn = document.getElementById('play-again-btn');
    this.goToStartBtn = document.getElementById('go-to-start-btn');
    this.optionButtons = document.querySelectorAll('.option-btn');
    this.powerupMirror = document.getElementById('powerup-mirror');
    this.powerupShield = document.getElementById('powerup-shield');
    this.powerupDouble = document.getElementById('powerup-double');
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
    this.themeToggle = document.getElementById('theme-toggle');

    this.state = {
      mode: 'best-of',
      maxRounds: 5,
      currentRound: 0,
      humanScore: 0,
      computerScore: 0,
      activePowerup: null,
      powerupUsedThisRound: false,
      shieldActive: false,
      lastComputerChoice: null,
      timerInterval: null,
      timerValue: 15,
      roundInProgress: false,
    };

    this.choices = ['ROCK','PAPER','SCISSORS'];
    this.emojiMap = { ROCK:'🪨', PAPER:'🧻', SCISSORS:'✂️' };
    this.stats = this.loadStats();
    this.updateStatsPreview();
    this.audioCtx = null;
    this.confettiCanvas = document.getElementById('confetti-canvas');
    this.confettiCtx = this.confettiCanvas?.getContext('2d');

    this.setupEventListeners();
    this.setupTheme();
    this.updatePowerupUI();
  }

  setupEventListeners() {
    this.modeButtons.forEach(b => b.addEventListener('click', () => this.setMode(b.dataset.mode)));
    this.roundsButtons.forEach(b => b.addEventListener('click', () => {
      this.roundsButtons.forEach(r => r.classList.remove('active'));
      b.classList.add('active');
      this.state.maxRounds = parseInt(b.dataset.rounds);
    }));
    this.startBtn.addEventListener('click', () => this.startGame());
    this.quitBtn.addEventListener('click', () => this.quitToMenu());
    this.playAgainBtn.addEventListener('click', () => this.startGame());
    this.goToStartBtn.addEventListener('click', () => this.quitToMenu());
    this.optionButtons.forEach(b => b.addEventListener('click', () => {
      if (!this.state.roundInProgress) return;
      this.playRound(b.dataset.choice);
    }));
    this.powerupMirror.addEventListener('click', () => this.activatePowerup('mirror'));
    this.powerupShield.addEventListener('click', () => this.activatePowerup('shield'));
    this.powerupDouble.addEventListener('click', () => this.activatePowerup('double'));
    this.themeToggle.addEventListener('click', () => this.toggleTheme());
  }

  setMode(mode) {
    this.state.mode = mode;
    this.modeButtons.forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
    document.getElementById('best-of-options').style.display = mode === 'best-of' ? 'flex' : 'none';
  }

  startGame() {
    this.resetGameState();
    showScreen('gameplay');
    if (this.state.mode === 'best-of') {
      this.modeIndicator.textContent = `Best of ${this.state.maxRounds}`;
      this.roundCounter.textContent = `Round 1/${this.state.maxRounds}`;
    } else if (this.state.mode === 'endless') {
      this.modeIndicator.textContent = 'First to 5';
      this.roundCounter.textContent = 'Round 1';
    } else {
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
    this.roundCounter.textContent = this.state.mode === 'best-of'
      ? `Round ${this.state.currentRound}/${this.state.maxRounds}`
      : `Round ${this.state.currentRound}`;
    this.clearChoices();
    this.enableOptionButtons(true);
    this.updatePowerupUI();
    if (this.state.mode === 'timed') this.startTimer();
  }

  playRound(humanChoice) {
    if (!this.state.roundInProgress) return;
    let computerChoice = this.getComputerChoice();
    let effective = humanChoice;
    if (this.state.activePowerup === 'mirror') {
      if (this.state.lastComputerChoice) {
        effective = this.state.lastComputerChoice;
        this.showNotification('🪞 Mirror used!');
      }
      this.state.activePowerup = null;
    }
    this.state.lastComputerChoice = computerChoice;
    let result = this.getResult(effective, computerChoice);
    if (result === 'lose' && this.state.shieldActive) {
      result = 'tie';
      this.state.shieldActive = false;
      this.showNotification('🛡️ Shield blocked a loss!');
    }
    let points = 1;
    if (this.state.activePowerup === 'double' && result === 'win') {
      points = 2;
      this.showNotification('✨ Double points!');
      this.state.activePowerup = null;
    }
    if (result === 'win') {
      this.state.humanScore += points;
      this.roundResult.innerHTML = `<span style="color:var(--win)">You won! 💪</span>`;
      this.playSound('win');
    } else if (result === 'lose') {
      this.state.computerScore++;
      this.roundResult.innerHTML = `<span style="color:var(--lose)">Computer won 😓</span>`;
      this.playSound('lose');
    } else {
      this.roundResult.innerHTML = `<span style="color:var(--tie)">It's a tie 🧐</span>`;
      this.playSound('tie');
    }
    this.humanChoiceEmoji.textContent = this.emojiMap[effective];
    this.computerChoiceEmoji.textContent = this.emojiMap[computerChoice];
    this.animateChoiceCards();
    this.addHistoryEntry(effective, computerChoice, result);
    this.updateScoreDisplay();
    if (this.state.activePowerup === 'double') this.state.activePowerup = null;
    this.stopTimer();
    this.state.roundInProgress = false;
    this.enableOptionButtons(false);
    this.updatePowerupUI();
    setTimeout(() => this.checkGameOver(), 1200);
  }

  getComputerChoice() {
    const rand = Math.random();
    return rand < 0.33 ? 'ROCK' : rand < 0.66 ? 'PAPER' : 'SCISSORS';
  }

  getResult(a, b) {
    if (a === b) return 'tie';
    if ((a === 'ROCK' && b === 'SCISSORS') || (a === 'PAPER' && b === 'ROCK') || (a === 'SCISSORS' && b === 'PAPER')) return 'win';
    return 'lose';
  }

  checkGameOver() {
    let gameOver = false, winner = null;
    const needed = Math.ceil(this.state.maxRounds / 2);
    if (this.state.mode === 'best-of') {
      if (this.state.humanScore >= needed) { gameOver = true; winner = 'human'; }
      else if (this.state.computerScore >= needed) { gameOver = true; winner = 'computer'; }
      else if (this.state.currentRound >= this.state.maxRounds) {
        gameOver = true;
        winner = this.state.humanScore > this.state.computerScore ? 'human' : (this.state.computerScore > this.state.humanScore ? 'computer' : 'tie');
      }
    } else {
      if (this.state.humanScore >= 5) { gameOver = true; winner = 'human'; }
      else if (this.state.computerScore >= 5) { gameOver = true; winner = 'computer'; }
    }
    if (gameOver) this.endGame(winner);
    else setTimeout(() => this.startNewRound(), 500);
  }

  endGame(winner) {
    this.stopTimer();
    this.state.roundInProgress = false;
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
      this.gameoverMessage.textContent = '🤝 Tie!';
    }
    this.stats.gamesPlayed++;
    this.saveStats();
    this.finalHumanScore.textContent = this.state.humanScore;
    this.finalComputerScore.textContent = this.state.computerScore;
    this.achievementDiv.textContent = '';
    if (this.stats.wins === 1 && this.stats.gamesPlayed === 1) this.achievementDiv.textContent = '🏅 First Victory!';
    else if (this.stats.bestStreak >= 5) this.achievementDiv.textContent = '🔥 5-Game Win Streak!';
    showScreen('gameover');
    if (winner === 'human') this.launchConfetti();
    this.playSound(winner === 'human' ? 'win' : 'lose');
  }

  activatePowerup(type) {
    if (!this.state.roundInProgress || this.state.powerupUsedThisRound) return;
    if (type === 'mirror' && !this.state.lastComputerChoice) { this.showNotification('Need previous round!'); return; }
    this.state.activePowerup = type;
    this.state.powerupUsedThisRound = true;
    this.updatePowerupUI();
    if (type === 'shield') this.state.shieldActive = true;
    this.showNotification(`${type.charAt(0).toUpperCase() + type.slice(1)} activated!`);
  }

  updatePowerupUI() {
    this.powerupMirror.disabled = !this.state.roundInProgress || this.state.powerupUsedThisRound;
    this.powerupShield.disabled = !this.state.roundInProgress || this.state.powerupUsedThisRound || this.state.shieldActive;
    this.powerupDouble.disabled = !this.state.roundInProgress || this.state.powerupUsedThisRound;
  }

  startTimer() {
    this.state.timerValue = 15;
    this.timerSeconds.textContent = this.state.timerValue;
    this.timerDisplay.classList.remove('hide');
    this.stopTimer();
    this.state.timerInterval = setInterval(() => {
      this.state.timerValue--;
      this.timerSeconds.textContent = this.state.timerValue;
      if (this.state.timerValue <= 0) { this.stopTimer(); this.forceRandomChoice(); }
    }, 1000);
  }

  stopTimer() {
    if (this.state.timerInterval) { clearInterval(this.state.timerInterval); this.state.timerInterval = null; }
    this.timerDisplay.classList.add('hide');
  }

  forceRandomChoice() {
    if (!this.state.roundInProgress) return;
    this.playRound(this.choices[Math.floor(Math.random() * 3)]);
  }

  updateScoreDisplay() {
    this.humanScoreText.textContent = this.state.humanScore;
    this.computerScoreText.textContent = this.state.computerScore;
    const maxNeeded = this.state.mode === 'best-of' ? Math.ceil(this.state.maxRounds / 2) : 5;
    this.humanBar.style.width = `${Math.min((this.state.humanScore / maxNeeded) * 100, 100)}%`;
    this.computerBar.style.width = `${Math.min((this.state.computerScore / maxNeeded) * 100, 100)}%`;
  }

  clearChoices() { this.humanChoiceEmoji.textContent = '❓'; this.computerChoiceEmoji.textContent = '❓'; }
  enableOptionButtons(enable) { this.optionButtons.forEach(b => b.disabled = !enable); }
  animateChoiceCards() {
    document.getElementById('human-choice-card')?.classList.add('flash');
    document.getElementById('computer-choice-card')?.classList.add('flash');
    setTimeout(() => {
      document.getElementById('human-choice-card')?.classList.remove('flash');
      document.getElementById('computer-choice-card')?.classList.remove('flash');
    }, 400);
  }
  showNotification(msg) { this.roundResult.innerHTML = msg; setTimeout(() => { if (this.roundResult.innerHTML === msg) this.roundResult.innerHTML = ''; }, 2000); }
  addHistoryEntry(human, computer, result) {
    const li = document.createElement('li');
    li.innerHTML = `R${this.state.currentRound}: ${this.emojiMap[human]} vs ${this.emojiMap[computer]} → ${result}`;
    this.historyList.prepend(li);
    if (this.historyList.children.length > 20) this.historyList.removeChild(this.historyList.lastChild);
  }

  loadStats() {
    const saved = localStorage.getItem('rps_worldclass_stats');
    return saved ? JSON.parse(saved) : { gamesPlayed: 0, wins: 0, losses: 0, ties: 0, streak: 0, bestStreak: 0 };
  }
  saveStats() { localStorage.setItem('rps_worldclass_stats', JSON.stringify(this.stats)); }
  updateStatsPreview() {
    document.getElementById('total-wins').textContent = this.stats.wins;
    const total = this.stats.gamesPlayed || 1;
    document.getElementById('win-rate').textContent = `${Math.round((this.stats.wins / total) * 100)}%`;
  }

  setupTheme() {
    const saved = localStorage.getItem('rps_theme') || 'dark';
    document.body.className = saved;
  }
  toggleTheme() {
    const current = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.className = current;
    localStorage.setItem('rps_theme', current);
  }

  playSound(type) {
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain); gain.connect(this.audioCtx.destination);
      gain.gain.value = 0.1;
      if (type === 'win') { osc.type = 'sine'; osc.frequency.value = 600; }
      else if (type === 'lose') { osc.type = 'sawtooth'; osc.frequency.value = 300; }
      else { osc.type = 'triangle'; osc.frequency.value = 450; }
      osc.start(); gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.2);
      osc.stop(this.audioCtx.currentTime + 0.2);
    } catch(e) {}
  }

  launchConfetti() {
    if (!this.confettiCtx) return;
    const w = this.confettiCanvas.width = window.innerWidth;
    const h = this.confettiCanvas.height = window.innerHeight;
    const particles = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h - h,
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
        p.y += p.speedY; p.x += p.speedX;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.fill();
      });
      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }

  resetGameState() {
    this.state.humanScore = 0; this.state.computerScore = 0; this.state.currentRound = 0;
    this.state.activePowerup = null; this.state.powerupUsedThisRound = false; this.state.shieldActive = false;
    this.state.lastComputerChoice = null; this.state.roundInProgress = false;
    this.historyList.innerHTML = ''; this.stopTimer(); this.timerDisplay.classList.add('hide');
  }

  quitToMenu() {
    this.stopTimer();
    showScreen('start');
    this.updateStatsPreview();
  }

  destroy() { this.stopTimer(); }
}
