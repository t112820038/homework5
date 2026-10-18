/* ==========================================
   HYPERSPINS 9999 - ENGINE & INTERACT (WEIGHTED PROBABILITY)
   ========================================== */

// --- Global State ---
// 6 個獎項名稱
let items = ["手機", "鈔票", "奔馳", "金條", "大金勞", "沒中"];

// 每個獎項對應的抽中機率權重 (總和 = 100%)
// "沒中" 佔 95%，其餘 5 個大獎各佔 1% (合計 5%)
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

// 紀錄預先計算好的目標停止角度與中獎索引
let targetIndex = -1;
let targetAngle = 0;

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

// --- 加權隨機抽獎演算法 (Weighted Random Choice) ---
function getWeightedRandomIndex() {
  // 如果項目數量跟權重陣列不一致（例如使用者手動新增/刪除項目），改為等機率
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
let spinTime = 0;
let spinTimeTotal = 0;
let initialStartAngle = 0;

function spin() {
  if (isSpinning || items.length === 0) return;
  initAudio();
  isSpinning = true;
  spinBtn.classList.add('spinning');

  // 1. 根據機率預先決定中獎 Index
  targetIndex = getWeightedRandomIndex();

  // 2. 計算目標扇區對應的角度 (指針在頂部 270 度 / 1.5 PI 位置)
  const numItems = items.length;
  const arc = (2 * Math.PI) / numItems;
  
  // 讓停下的位置落在扇區中央（加上微幅隨機偏移，避免每次都停在正
