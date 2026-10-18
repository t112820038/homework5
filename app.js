/* ==========================================
   HYPERSPINS 9999 - ENGINE & INTERACT
   ========================================== */

// --- Global State ---
let items = ['超極巨冰淇淋', '再來一次', '寫10行CODE', '俯臥撐20下', '通宵派對', '恭喜大吉'];
const colors = ['#ff007f', '#9d00ff', '#00ff66', '#ffe600', '#00f3ff', '#ff3300'];

const presets = {
  food: ['拉麵', '炸雞', '麻辣鍋', '超商便當', '手搖飲', '絕食一餐'],
  punish: ['深蹲 30 下', '大聲唱歌', '喝苦茶', '模仿梗圖', '傳訊息給前任', '免罰pass'],
  number: ['100pt', '50pt', '20pt', '銘謝惠顧', '雙倍積分', '0pt']
};

let startAngle = 0;
let isSpinning = false;
let audioEnabled = true;
let audioCtx = null;
let lastSectorIndex = -1;

// --- DOM Elements ---
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spinBtn');
const openConfigBtn = document.getElementById('openConfigBtn');
const closeConfigBtn = document.getElementById('closeConfigBtn');
const configModal = document.getElementById('configModal');
const itemsList = document.getElementById('itemsList');
const newItemInput = document.getElementById('newItemInput');
const addItemBtn = document.getElementById('addItemBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const winModal = document.getElementById('winModal');
const winResultText = document.getElementById('winResultText');
const claimWinBtn = document.getElementById('claimWinBtn');
const removeWinItemBtn = document.getElementById('removeWinItemBtn');
const historyList = document.getElementById('historyList');
const historyCount = document.getElementById('historyCount');
let historyLogs = [];

// --- Web Audio API Synthesizer ---
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playTickSound() {
  if (!audioEnabled || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400 + Math.random() * 200, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.05);
}

function playWinSound() {
  if (!audioEnabled || !audioCtx) return;
  const now = audioCtx.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(f, now + i * 0.08);
    gain.gain.setValueAtTime(0.1, now + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + i * 0.08);
    osc.stop(now + i * 0.08 + 0.15);
  });
}

// --- Wheel Drawing Logic ---
function drawWheel() {
  const numItems = items.length;
  const arc = (2 * Math.PI) / numItems;
  const outsideRadius = 160;
  const textRadius = 110;
  const insideRadius = 35;

  ctx.clearRect(0, 0, 340, 340);

  for (let i = 0; i < numItems; i++) {
    const angle = startAngle + i * arc;
    ctx.fillStyle = colors[i % colors.length];

    // Sector path
    ctx.beginPath();
    ctx.arc(170, 170, outsideRadius, angle, angle + arc, false);
    ctx.arc(170, 170, insideRadius, angle + arc, angle, true);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000';
    ctx.stroke();

    // Text Render
    ctx.save();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    ctx.translate(
      170 + Math.cos(angle + arc / 2) * textRadius,
      170 + Math.sin(angle + arc / 2) * textRadius
    );
    ctx.rotate(angle + arc / 2 + Math.PI / 2);
    const text = items[i];
    ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
    ctx.restore();
  }
}

// --- Physics Spin Mechanics ---
let spinTimeout = null;
let spinAngleStart = 0;
let spinTime = 0;
let spinTimeTotal = 0;

function spin() {
  if (isSpinning || items.length === 0) return;
  initAudio();
  isSpinning = true;
  spinBtn.classList.add('spinning');
  
  spinAngleStart = Math.random() * 20 + 25; // Speed
  spinTime = 0;
  spinTimeTotal = Math.random() * 3000 + 4000; // 4-7 seconds
  rotateWheel();
}

function rotateWheel() {
  spinTime += 20;
  if (spinTime >= spinTimeTotal) {
    stopRotateWheel();
    return;
  }
  
  // Quintic Out Easing Formula
  const progress = spinTime / spinTimeTotal;
  const easeOut = Math.pow(progress - 1, 5) + 1;
  const spinAngle = spinAngleStart * (1 - easeOut);
  
  startAngle += (spinAngle * Math.PI) / 180;
  drawWheel();

  // Calculate sector sound tick
  const numItems = items.length;
  const arc = (2 * Math.PI) / numItems;
  const normalizedAngle = (2 * Math.PI - (startAngle % (2 * Math.PI))) % (2 * Math.PI);
  // Pointer is at top (1.5 PI)
  const currentSector = Math.floor(((normalizedAngle + 1.5 * Math.PI) % (2 * Math.PI)) / arc);
  
  if (currentSector !== lastSectorIndex) {
    playTickSound();
    lastSectorIndex = currentSector;
  }

  spinTimeout = requestAnimationFrame(rotateWheel);
}

function stopRotateWheel() {
  isSpinning = false;
  spinBtn.classList.remove('spinning');
  
  const numItems = items.length;
  const arc = (2 * Math.PI) / numItems;
  const degrees = (startAngle * 180) / Math.PI + 90; // Align with top pointer
  const arcd = (arc * 180) / Math.PI;
  const index = Math.floor((360 - (degrees % 360)) / arcd) % numItems;
  
  const winningItem = items[index];
  triggerWin(winningItem);
}

// --- Win Modal & Particles ---
function triggerWin(result) {
  playWinSound();
  winResultText.innerText = result;
  winModal.classList.remove('hidden');
  
  // Add Log
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  historyLogs.unshift({ time, result });
  renderHistory();
  
  triggerConfetti();
}

function renderHistory() {
  historyCount.innerText = historyLogs.length;
  if (historyLogs.length === 0) {
    historyList.innerHTML = `<li class="empty-log">NO DATA IN BUFFER...</li>`;
    return;
  }
  historyList.innerHTML = historyLogs.map(log => `
    <li class="history-item">
      <span>${log.result}</span>
      <span style="color:#888">${log.time}</span>
    </li>
  `).join('');
}

// --- Item Config Drawer Handlers ---
function renderEditorItems() {
  itemsList.innerHTML = items.map((item, idx) => `
    <li class="editor-item">
      <span>${idx + 1}. ${item}</span>
      <button class="del-item-btn" onclick="removeItem(${idx})">✖</button>
    </li>
  `).join('');
  drawWheel();
}

window.removeItem = function(index) {
  if (items.length <= 2) {
    alert("SYSTEM ERROR: 最少需要 2 個選項！");
    return;
  }
  items.splice(index, 1);
  renderEditorItems();
};

addItemBtn.addEventListener('click', () => {
  const val = newItemInput.value.trim();
  if (val) {
    items.push(val);
    newItemInput.value = '';
    renderEditorItems();
  }
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const key = e.target.dataset.preset;
    if (presets[key]) {
      items = [...presets[key]];
      renderEditorItems();
    }
  });
});

// --- Modal Visibility Controls ---
openConfigBtn.addEventListener('click', () => configModal.classList.remove('hidden'));
closeConfigBtn.addEventListener('click', () => configModal.classList.add('hidden'));

claimWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));

removeWinItemBtn.addEventListener('click', () => {
  const currentWinText = winResultText.innerText;
  const idx = items.indexOf(currentWinText);
  if (idx !== -1 && items.length > 2) {
    items.splice(idx, 1);
    renderEditorItems();
  } else if (items.length <= 2) {
    alert("選項少於 2 個，無法繼續剔除！");
  }
  winModal.classList.add('hidden');
});

// --- Sound Toggle ---
toggleAudioBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  toggleAudioBtn.innerText = audioEnabled ? '🔊 SFX: ON' : '🔇 SFX: OFF';
  toggleAudioBtn.style.opacity = audioEnabled ? '1' : '0.5';
});

spinBtn.addEventListener('click', spin);

// --- Particle Glitch Confetti ---
const pCanvas = document.getElementById('particleCanvas');
const pCtx = pCanvas.getContext('2d');
let particles = [];

function resizeParticleCanvas() {
  pCanvas.width = window.innerWidth;
  pCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeParticleCanvas);
resizeParticleCanvas();

function triggerConfetti() {
  particles = [];
  const pColors = ['#ff007f', '#9d00ff', '#00ff66', '#ffe600', '#00f3ff'];
  for (let i = 0; i < 70; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 16 - 4,
      size: Math.random() * 8 + 4,
      color: pColors[Math.floor(Math.random() * pColors.length)],
      life: 1.0,
      decay: Math.random() * 0.02 + 0.015
    });
  }
  animateParticles();
}

function animateParticles() {
  pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
  particles.forEach((p, i) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // Gravity
    p.life -= p.decay;

    if (p.life > 0) {
      pCtx.fillStyle = p.color;
      pCtx.globalAlpha = p.life;
      // Glitch Square Particle
      pCtx.fillRect(p.x, p.y, p.size, p.size);
    } else {
      particles.splice(i, 1);
    }
  });

  if (particles.length > 0) {
    requestAnimationFrame(animateParticles);
  }
}

// --- Initialization ---
renderEditorItems();
