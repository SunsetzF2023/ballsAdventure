import { WORLD } from './config.js';
import { screenToWorld } from './utils.js';
import { gameState, loadProgress } from './gameState.js';
import { Renderer } from './renderer.js';
import { updateGame, handleCardLaunch, dayComplete, gameOver, setupDay } from './gameLogic.js';
import { initializeUI, updateHUD, selectCard, showBuildOverlay, hideBuildOverlay } from './ui.js';

// 全局变量
let canvas, ctx, renderer;
let view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };
let isDragging = false;
let dragStartPos = null;
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
  
  // 加载存档
  loadProgress();
  console.log('存档加载完成');
  
  // 设置第一天
  setupDay(gameState.gameProgress.currentDay);
  console.log('游戏天数设置完成');
  
  // 初始化UI
  initializeUI();
  console.log('UI初始化完成');
  
  // 设置输入事件
  setupInputEvents();
  console.log('输入事件设置完成');
  
  // 设置UI事件
  setupUIEvents();
  console.log('UI事件设置完成');
  
  // 开始游戏循环
  requestAnimationFrame(gameLoop);
  
  console.log('游戏初始化完成');
}

// 调整画布大小
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
  view.scale = Math.min(w / WORLD.w, h / WORLD.h);
  view.ox = (w - WORLD.w * view.scale) / 2;
  view.oy = (h - WORLD.h * view.scale) / 2;
  
  // 更新gameState中的view
  gameState.view = view;
}

// 设置输入事件
function setupInputEvents() {
  // 鼠标事件
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseup', handleMouseUp);
  
  // 触摸事件
  canvas.addEventListener('touchstart', handleTouchStart);
  canvas.addEventListener('touchmove', handleTouchMove);
  canvas.addEventListener('touchend', handleTouchEnd);
  
  // 防止右键菜单
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}

// 设置UI事件
function setupUIEvents() {
  // 覆盖层按钮
  const overlayBtn = document.getElementById("overlayBtn");
  overlayBtn.addEventListener('click', () => {
    hideOverlay();
    
    // 根据当前状态决定下一步
    if (gameState.rewardSystem.showReward) {
      // 选择奖励后进入下一天
      gameState.rewardSystem.showReward = false;
      setupDay(gameState.day);
    } else if (gameState.wall.hp <= 0) {
      // 游戏结束，重新开始
      setupDay(1);
    } else {
      // 正常过关，进入下一天
      setupDay(gameState.day);
    }
  });
  
  // 建设界面按钮
  const backToGameBtn = document.getElementById("backToGameBtn");
  backToGameBtn.addEventListener('click', hideBuildOverlay);
  
  // 键盘事件
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    if (gameState.pausedOverlay) {
      hideOverlay();
    } else {
      showBuildOverlay();
    }
  }
  
  // B键打开建设界面
  if (e.key === 'b' || e.key === 'B') {
    showBuildOverlay();
  }
}

// 鼠标事件处理
function handleMouseDown(e) {
  if (gameState.pausedOverlay) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  if (gameState.selectedCardId) {
    isDragging = true;
    dragStartPos = { x, y };
  }
}

function handleMouseMove(e) {
  if (!isDragging || !dragStartPos) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 可以在这里添加拖拽预览效果
}

function handleMouseUp(e) {
  if (!isDragging || !dragStartPos) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // 检查是否在弹弓附近开始拖拽
  const worldStart = screenToWorld(dragStartPos.x, dragStartPos.y, view);
  const slingDist = Math.hypot(worldStart.x - 360, worldStart.y - 1130); // 弹弓位置
  
  if (slingDist < 50) {
    // 在弹弓附近，执行发射
    const success = handleCardLaunch(gameState.selectedCardId, dragStartPos.x, dragStartPos.y, x, y);
    if (success) {
      gameState.selectedCardId = null;
      updateHUD();
      // 重新渲染卡牌以更新状态
      const cardsEl = document.getElementById("cards");
      cardsEl.innerHTML = '';
      // 这里需要重新调用renderCards，但由于模块依赖，先简化处理
    }
  }
  
  isDragging = false;
  dragStartPos = null;
}

// 触摸事件处理
function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousedown', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const mouseEvent = new MouseEvent('mousemove', {
    clientX: touch.clientX,
    clientY: touch.clientY
  });
  canvas.dispatchEvent(mouseEvent);
}

function handleTouchEnd(e) {
  e.preventDefault();
  const mouseEvent = new MouseEvent('mouseup', {});
  canvas.dispatchEvent(mouseEvent);
}

// 覆盖层相关函数
function hideOverlay() {
  const overlayEl = document.getElementById("overlay");
  overlayEl.classList.add("hidden");
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
  }
  
  // 渲染游戏
  renderer.render();
  
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
  selectCard,
  dayComplete,
  gameOver
};
