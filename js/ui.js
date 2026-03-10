import { CARDS } from './config.js';
import { gameState } from './gameState.js';
import { performGacha, showOverlay, hideOverlay } from './gameLogic.js';

// UI元素引用
const elements = {
  hudDay: document.getElementById("hudDay"),
  hudMana: document.getElementById("hudMana"),
  hudPortal: document.getElementById("hudPortal"),
  hudWall: document.getElementById("hudWall"),
  hudHint: document.getElementById("hudHint"),
  cardsEl: document.getElementById("cards"),
  overlayEl: document.getElementById("overlay"),
  overlayTitle: document.getElementById("overlayTitle"),
  overlayDesc: document.getElementById("overlayDesc"),
  overlayBtn: document.getElementById("overlayBtn"),
  
  // 建设界面元素
  buildOverlayEl: document.getElementById("buildOverlay"),
  buildCoinsEl: document.getElementById("buildCoins"),
  buildBestDayEl: document.getElementById("buildBestDay"),
  currentSaveNameEl: document.getElementById("currentSaveName"),
  saveSlotsEl: document.getElementById("saveSlots"),
  newSaveNameEl: document.getElementById("newSaveName"),
  createNewSaveBtn: document.getElementById("createNewSaveBtn"),
  gachaBtn: document.getElementById("gachaBtn"),
  backToGameBtn: document.getElementById("backToGameBtn"),
  gachaResultsEl: document.getElementById("gachaResults"),
  
  // 游戏界面元素
  gameGachaBtn: document.getElementById("gameGachaBtn"),
  gameCoinsEl: document.getElementById("gameCoins"),
};

// 更新HUD显示
export function updateHUD() {
  elements.hudDay.textContent = `Day ${gameState.day}`;
  elements.hudMana.textContent = `Mana ${Math.floor(gameState.mana)}/${gameState.maxMana}`;
  elements.hudPortal.textContent = `Portal ${Math.ceil(gameState.portal.hp)}/${Math.ceil(gameState.portal.maxHp)}`;
  elements.hudWall.textContent = `Wall ${Math.ceil(gameState.wall.hp)}/${Math.ceil(gameState.wall.maxHp)}`;
  
  // 更新游戏界面的金币显示
  if (elements.gameCoinsEl) {
    elements.gameCoinsEl.textContent = gameState.gameProgress.coins;
  }
}

// 渲染卡牌
export function renderCards() {
  const cardsEl = elements.cardsEl;
  cardsEl.innerHTML = '';
  
  // 每行显示2张卡
  for (let i = 0; i < CARDS.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'card-row';
    
    for (let j = i; j < Math.min(i + 2, CARDS.length); j++) {
      const card = CARDS[j];
      const cardEl = createCardElement(card);
      row.appendChild(cardEl);
    }
    
    cardsEl.appendChild(row);
  }
}

function createCardElement(card) {
  const cardEl = document.createElement('div');
  cardEl.className = 'card';
  cardEl.dataset.cardId = card.id;
  
  const canAfford = gameState.mana >= card.cost;
  if (!canAfford) {
    cardEl.classList.add('disabled');
  }
  
  if (gameState.selectedCardId === card.id) {
    cardEl.classList.add('selected');
  }
  
  cardEl.innerHTML = `
    <div class="topline">
      <div class="name">${card.name}</div>
      <div class="cost">${card.cost}</div>
    </div>
    <div class="tag ${card.type}">${card.type === 'role' ? '角色' : '法术'}</div>
    <div class="desc">${card.desc}</div>
  `;
  
  cardEl.addEventListener('click', () => selectCard(card.id));
  
  return cardEl;
}

// 选择卡牌
export function selectCard(cardId) {
  const card = CARDS.find(c => c.id === cardId);
  if (!card || gameState.mana < card.cost) return;
  
  if (gameState.selectedCardId === cardId) {
    gameState.selectedCardId = null;
    elements.hudHint.textContent = "选择一张角色卡 → 在弹弓上拖拽并松手发射";
  } else {
    gameState.selectedCardId = cardId;
    elements.hudHint.textContent = card.type === 'role' 
      ? "在弹弓上拖拽并松手发射角色"
      : card.target === 'arena' 
        ? "点击场地位置释放法术"
        : "法术已自动释放";
    
    if (card.type === 'spell' && card.target === 'instant') {
      // 立即释放法术
      handleSpellCard(card);
      gameState.selectedCardId = null;
    }
  }
  
  renderCards();
}

// 处理法术卡
function handleSpellCard(card) {
  // 这里需要调用gameLogic中的函数
  // 由于模块依赖关系，可能需要重新组织
  console.log('释放法术:', card.name);
}

// 显示抽卡结果
export function showGachaResults(results) {
  let html = '<div class="gacha-title">抽卡结果</div>';
  html += '<div class="gacha-grid">';
  
  const rarityNames = {
    common: "普通",
    uncommon: "稀有", 
    rare: "史诗",
    epic: "传说"
  };
  
  for (const card of results) {
    html += `
      <div class="gacha-card ${card.rarity}">
        <div>${card.name}</div>
        <div style="font-size: 10px; margin-top: 2px;">${rarityNames[card.rarity]}</div>
      </div>
    `;
  }
  
  html += '</div>';
  elements.gachaResultsEl.innerHTML = html;
  elements.gachaResultsEl.classList.remove('hidden');
  
  // 统计稀有度
  const epicCount = results.filter(c => c.rarity === 'epic').length;
  const rareCount = results.filter(c => c.rarity === 'rare').length;
  
  if (epicCount > 0) {
    setTimeout(() => {
      showOverlay("欧皇降临！", `获得了${epicCount}张传说卡牌！`, "太棒了");
    }, 1000);
  } else if (rareCount >= 3) {
    setTimeout(() => {
      showOverlay("运气不错！", `获得了${rareCount}张史诗卡牌！`, "继续");
    }, 1000);
  }
}

// 更新建设界面
export function updateBuildUI() {
  elements.buildCoinsEl.textContent = gameState.gameProgress.coins;
  elements.buildBestDayEl.textContent = gameState.gameProgress.bestDay;
  elements.currentSaveNameEl.textContent = gameState.gameProgress.saveName;
  renderSaveSlots();
}

function renderSaveSlots() {
  let html = '';
  for (let i = 1; i <= 3; i++) {
    const slot = gameState.saveSlots[i];
    const isActive = gameState.gameProgress.saveSlot === i;
    
    if (slot) {
      const date = new Date(slot.saveTime);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      html += `
        <div class="save-slot ${isActive ? 'active' : ''}" data-slot="${i}">
          <div class="save-name">${slot.saveName}</div>
          <div class="save-info">
            最高天数: ${slot.bestDay}<br>
            金币: ${slot.coins}<br>
            ${dateStr}
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="save-slot empty ${isActive ? 'active' : ''}" data-slot="${i}">
          <div class="save-name">空槽位 ${i}</div>
          <div class="save-info">点击新建存档</div>
        </div>
      `;
    }
  }
  elements.saveSlotsEl.innerHTML = html;
  
  // 添加点击事件
  document.querySelectorAll('.save-slot').forEach(slotEl => {
    slotEl.addEventListener('click', (e) => {
      const slotNum = parseInt(e.currentTarget.dataset.slot);
      if (gameState.saveSlots[slotNum] || slotNum === gameState.gameProgress.saveSlot) {
        // 切换到已有存档
        if (slotNum !== gameState.gameProgress.saveSlot) {
          // 这里需要调用saveProgress和loadProgress
          console.log('切换存档:', slotNum);
          updateBuildUI();
        }
      } else {
        // 空槽位，提示新建
        const name = prompt(`请输入存档 ${slotNum} 的名称：`, `存档${slotNum}`);
        if (name) {
          // 这里需要调用createNewSave
          console.log('新建存档:', slotNum, name);
          updateBuildUI();
        }
      }
    });
  });
}

// 显示建设界面
export function showBuildOverlay() {
  updateBuildUI();
  elements.buildOverlayEl.classList.remove('hidden');
  elements.gachaResultsEl.classList.add('hidden');
}

// 隐藏建设界面
export function hideBuildOverlay() {
  elements.buildOverlayEl.classList.add('hidden');
}

// 初始化UI事件
export function initializeUI() {
  // 覆盖层按钮
  elements.overlayBtn.addEventListener('click', () => {
    hideOverlay();
    // 这里需要处理进入下一天或重新开始的逻辑
  });
  
  // 建设界面按钮
  elements.backToGameBtn.addEventListener('click', hideBuildOverlay);
  
  elements.gachaBtn.addEventListener('click', () => {
    const results = performGacha();
    if (results) {
      showGachaResults(results);
    }
  });
  
  // 游戏界面十连抽按钮
  if (elements.gameGachaBtn) {
    elements.gameGachaBtn.addEventListener('click', () => {
      const results = performGacha();
      if (results) {
        showGachaResults(results);
      }
    });
  }
  
  elements.createNewSaveBtn.addEventListener('click', () => {
    const name = elements.newSaveNameEl.value.trim();
    if (name) {
      // 这里需要调用createNewSave
      console.log('新建存档:', name);
      elements.newSaveNameEl.value = '';
      updateBuildUI();
    }
  });
  
  // 初始化渲染
  renderCards();
  updateHUD();
}

// 更新伤害数字位置
export function updateDamageNumbers(dt) {
  for (const dn of gameState.damageNumbers) {
    dn.y += dn.vy * dt;
    dn.vy += 100 * dt; // 重力
  }
}
