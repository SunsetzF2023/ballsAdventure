import { WORLD, SLING } from './config.js';
import { screenToWorld } from './utils.js';
import { gameState, loadProgress } from './gameState.js';
import { Renderer } from './renderer.js';
import { updateGame, setupDay } from './gameLogic.js';
import { initializeUI, updateHUD, showBuildOverlay, hideBuildOverlay } from './ui.js';
import { InputHandler } from './input.js';
import { CARDS, getAvailableCards } from './cards.js';

// 全局变量
let canvas, ctx, renderer;
let view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };
let inputHandler;
let lastFrameTime = 0;

// 初始化函数
function init() {
  console.log('开始初始化游戏...');
  
  // 获取画布
  canvas = document.getElementById("game");
  if (!canvas) {
    console.error('无法找到canvas元素');
    return;
  }
  ctx = canvas.getContext("2d", { alpha: false });
  
  console.log('Canvas获取成功');
  
  // 设置视图
  resize();
  window.addEventListener('resize', resize);
  
  // 初始化渲染器
  renderer = new Renderer(ctx, view);
  console.log('渲染器初始化完成');
  
  // 初始化输入处理器
  inputHandler = new InputHandler(canvas);
  console.log('输入处理器初始化完成');
  
  // 加载存档
  loadProgress();
  console.log('存档加载完成');
  
  // 设置第一天
  setupDay(gameState.gameProgress.currentDay);
  console.log('游戏天数设置完成');
  
  // 初始化UI
  initializeUI();
  console.log('UI初始化完成');
  
  // 设置UI事件
  setupUIEvents();
  console.log('UI事件设置完成');
  
  // 渲染初始卡牌
  renderCards();
  
  // 开始游戏循环
  requestAnimationFrame(gameLoop);
  
  console.log('游戏初始化完成');
}

// 调整画布大小 - 强制场地居中
function resize() {
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = w;
  view.h = h;
  
  // 计算合适的缩放比例，确保场地完全可见
  const scaleX = w / WORLD.w;
  const scaleY = h / WORLD.h;
  view.scale = Math.min(scaleX, scaleY, 2.0); // 允许更大缩放
  
  // 强制场地居中 - 这是关键
  const scaledWorldWidth = WORLD.w * view.scale;
  const scaledWorldHeight = WORLD.h * view.scale;
  view.ox = (w - scaledWorldWidth) / 2;
  view.oy = (h - scaledWorldHeight) / 2;
  
  console.log(`场地居中: 世界${WORLD.w}x${WORLD.h}, 缩放${view.scale}, 偏移${view.ox},${view.oy}`);
  
  // 更新gameState中的view
  gameState.view = view;
}

// 渲染卡牌
function renderCards() {
  const cardsEl = document.getElementById("cards");
  if (!cardsEl) return;
  
  cardsEl.innerHTML = "";
  
  // 获取当前可用的8张卡牌
  const availableCards = getAvailableCards(gameState.day);
  
  // 按每行2张卡牌排列
  const cardsPerRow = 2;
  const rows = [];
  
  for (let i = 0; i < availableCards.length; i += cardsPerRow) {
    rows.push(availableCards.slice(i, i + cardsPerRow));
  }
  
  rows.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.style.display = "flex";
    rowEl.style.gap = "8px";
    rowEl.style.marginBottom = "8px";
    
    row.forEach((card) => {
      const el = document.createElement("div");
      el.className = "card";
      el.dataset.cardId = card.id;
      
      // 卡牌内容
      el.innerHTML = `
        <div class="card-content">
          <div class="card-name">${card.name}</div>
          <div class="card-cost">${card.cost}</div>
          <div class="card-desc">${card.desc}</div>
          ${card.type === 'role' ? '<div class="tag role">角色</div>' : '<div class="tag spell">法术</div>'}
        </div>
      `;
      
      // 点击事件
      el.addEventListener("click", () => {
        inputHandler.selectCard(card.id);
        updateCardStyles();
        updateHint();
      });
      
      rowEl.appendChild(el);
    });
    
    cardsEl.appendChild(rowEl);
  });
  
  updateCardStyles();
}

// 更新卡牌样式
function updateCardStyles() {
  for (const el of document.querySelectorAll(".card")) {
    const id = el.dataset.cardId;
    const card = CARDS.find((c) => c.id === id);
    el.classList.toggle("selected", id === inputHandler.selectedCardId);
    el.classList.toggle("disabled", !!card && card.cost > gameState.mana);
  }
}

// 更新提示信息
function updateHint() {
  const card = CARDS.find((c) => c.id === inputHandler.selectedCardId);
  const hintEl = document.getElementById("hudHint");
  if (!hintEl) return;
  
  if (!card) {
    hintEl.textContent = "选择卡牌：角色卡在弹弓发射；法术卡点击场地施放。";
    return;
  }
  
  if (card.type === "role") {
    hintEl.textContent = `在弹弓附近拖拽发射 ${card.name}。`;
  } else {
    hintEl.textContent = `点击场地施放 ${card.name}。`;
  }
}

// 设置UI事件
function setupUIEvents() {
  // 覆盖层按钮
  const overlayBtn = document.getElementById("overlayBtn");
  if (overlayBtn) {
    overlayBtn.addEventListener('click', () => {
      hideOverlay();
      setupDay(gameState.day);
    });
  }
  
  // 确保建设界面默认隐藏
  const buildOverlay = document.getElementById("buildOverlay");
  if (buildOverlay) {
    buildOverlay.classList.add('hidden');
  }
  
  // 建设界面按钮
  const backToGameBtn = document.getElementById("backToGameBtn");
  if (backToGameBtn) {
    backToGameBtn.addEventListener('click', () => {
      console.log('返回游戏按钮点击');
      hideBuildOverlay();
    });
  }
  
  // 键盘事件
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    if (gameState.pausedOverlay) {
      hideOverlay();
    } else {
      // ESC键不应该自动打开建设界面
      console.log('ESC键按下，但建设界面需要手动打开');
    }
  }
  
  // B键打开建设界面
  if (e.key === 'b' || e.key === 'B') {
    showBuildOverlay();
  }
}

// 覆盖层相关函数
function hideOverlay() {
  const overlayEl = document.getElementById("overlay");
  if (overlayEl) {
    overlayEl.classList.add("hidden");
  }
  gameState.pausedOverlay = false;
}

// 游戏循环
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastFrameTime) / 1000, 0.1); // 限制最大时间步长
  lastFrameTime = timestamp;
  
  if (!gameState.pausedOverlay) {
    // 更新游戏时间
    gameState.now = timestamp / 1000;
    
    // 更新游戏逻辑
    updateGame(dt);
    
    // 更新UI
    updateHUD();
    updateCardStyles();
  }
  
  // 渲染游戏
  renderer.render();
  
  // 绘制瞄准线
  if (inputHandler) {
    inputHandler.drawAim(ctx);
  }
  
  // 继续循环
  requestAnimationFrame(gameLoop);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM加载完成，开始初始化...');
  try {
    init();
  } catch (error) {
    console.error('初始化失败:', error);
  }
});

// 导出一些全局函数供HTML调用
window.gameFunctions = {
  showBuildOverlay,
  hideBuildOverlay,
  renderCards
};
