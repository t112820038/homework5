/* ==========================================
   HYPERSPINS 9999 - ENGINE & INTERACT (WEIGHTED & FIXED)
   ========================================== */

// --- Global State ---
// 6 個指定獎項
let items = ["手機", "鈔票", "奔馳", "金條", "大金勞", "沒中"];

// 機率權重：沒中 95%，其餘 5 個大獎各 1%
let itemWeights = [1, 1, 1, 1, 1, 95];

const colors = ['#ff007f', '#9d00ff', '#00ff66', '#ffe600', '#00f3ff', '#ff3300'];

const presets = {
  default: ["手機", "鈔票", "奔馳", "金條", "大金勞", "沒中"],
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
  const freqs = [523.25, 659.25, 783.99, 1046.50];
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
  if (numItems === 0) return;
  
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
    ctx.font = 'bold 14px "Share Tech Mono", monospace';
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

// --- Weighted Random Calculation ---
function getWeightedRandomIndex() {
  if (items.length !== itemWeights.length) {
    return Math.floor(Math.random() * items.length);
  }

  const totalWeight = itemWeights.reduce((acc, w) => acc + w, 0);
  let randomNum = Math.random() * totalWeight;

  for (let i = 0; i < itemWeights.length; i++) {
    if (randomNum < itemWeights[i]) {
      return i;
    }
    randomNum -= itemWeights[i];
  }
  return items.length - 1;
}

// --- Physics Spin Mechanics ---
let spinTimeout = null;
let currentStep = 0;
let totalSteps = 0;
let initialAngle = 0;
let totalRotationAngle = 0;
let winningIndex = -1;

function spin() {
  if (isSpinning || items.length === 0) return;
  initAudio();
  isSpinning = true;
  spinBtn.classList.add('spinning');

  winningIndex = getWeightedRandomIndex();

  const numItems = items.length;
  const arc = (2 * Math.PI) / numItems;
  const randomSectorOffset = (Math.random() * 0.6 + 0.2) * arc;
  
  const targetAngleInSector = (1.5 * Math.PI) - (winningIndex * arc + randomSectorOffset);
  const extraRounds = Math.floor(Math.random() * 4 + 5) * (2 * Math.PI);
  
  initialAngle = startAngle % (2 * Math.PI);
  let targetAngle = targetAngleInSector + extraRounds;
  
  while (targetAngle < initialAngle) {
    targetAngle += 2 * Math.PI;
  }
  
  totalRotationAngle = targetAngle - initialAngle;
  currentStep = 0;
  totalSteps = Math.floor(Math.random() * 80 + 180);

  rotateWheel();
}

function rotateWheel() {
  currentStep++;
  if (currentStep >= totalSteps) {
    stopRotateWheel();
    return;
  }

  const progress = currentStep / totalSteps;
  const easeOut = 1 - Math.pow(1 - progress, 5);
  
  startAngle = initialAngle + totalRotationAngle * easeOut;
  drawWheel();

  const numItems = items.length;
  const arc = (2 * Math.PI) / numItems;
  const normalizedAngle = (2 * Math.PI - (startAngle % (2 * Math.PI))) % (2 * Math.PI);
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
  
  const winningItem = items[winningIndex];
  triggerWin(winningItem);
}

// --- Win Modal & Particles ---
function triggerWin(result) {
  playWinSound();
  winResultText.innerText = result;
  winModal.classList.remove('hidden');
  
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

// --- Item Config Handlers ---
function renderEditorItems() {
  itemsList.innerHTML = items.map((item, idx) => `
    <li class="editor-item">
      <span>${idx + 1}. ${item} (${itemWeights[idx] || 1}%)</span>
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
  itemWeights.splice(index, 1);
  renderEditorItems();
};

addItemBtn.addEventListener('click', () => {
  const val = newItemInput.value.trim();
  if (val) {
    items.push(val);
    itemWeights.push(1);
    newItemInput.value = '';
    renderEditorItems();
  }
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const key = e.target.dataset.preset;
    if (presets[key]) {
      items = [...presets[key]];
      itemWeights = items.map(() => 1);
      renderEditorItems();
    }
  });
});

// --- Modal Controls ---
openConfigBtn.addEventListener('click', () => configModal.classList.remove('hidden'));
closeConfigBtn.addEventListener('click', () => configModal.classList.add('hidden'));

claimWinBtn.addEventListener('click', () => winModal.classList.add('hidden'));

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
    p.vy += 0.2;
    p.life -= p.decay;

    if (p.life > 0) {
      pCtx.fillStyle = p.color;
      pCtx.globalAlpha = p.life;
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
