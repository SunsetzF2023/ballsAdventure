(() => {
  /** @type {HTMLCanvasElement} */
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });

  const hudDay = document.getElementById("hudDay");
  const hudMana = document.getElementById("hudMana");
  const hudPortal = document.getElementById("hudPortal");
  const hudWall = document.getElementById("hudWall");
  const hudHint = document.getElementById("hudHint");
  const cardsEl = document.getElementById("cards");
  const overlayEl = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayDesc = document.getElementById("overlayDesc");
  const overlayBtn = document.getElementById("overlayBtn");

  // 建设界面元素
  const buildOverlayEl = document.getElementById("buildOverlay");
  const buildCoinsEl = document.getElementById("buildCoins");
  const buildBestDayEl = document.getElementById("buildBestDay");
  const currentSaveNameEl = document.getElementById("currentSaveName");
  const saveSlotsEl = document.getElementById("saveSlots");
  const newSaveNameEl = document.getElementById("newSaveName");
  const createNewSaveBtn = document.getElementById("createNewSaveBtn");
  const gachaBtn = document.getElementById("gachaBtn");
  const backToGameBtn = document.getElementById("backToGameBtn");
  const gachaResultsEl = document.getElementById("gachaResults");
  
  // 游戏界面元素
  const gameGachaBtn = document.getElementById("gameGachaBtn");
  const gameCoinsEl = document.getElementById("gameCoins");

  // --------- World / Camera ----------
  const WORLD = { w: 720, h: 1280 };
  let view = { scale: 1, ox: 0, oy: 0, w: 0, h: 0 };

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
  }

  function screenToWorld(px, py) {
    return {
      x: (px - view.ox) / view.scale,
      y: (py - view.oy) / view.scale,
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function len(x, y) {
    return Math.hypot(x, y);
  }
  function norm(x, y) {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l, l };
  }
  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  // --------- Game Config ----------
  const WALL_H = 150;
  const SLING = { x: WORLD.w / 2, y: WORLD.h - WALL_H - 20, r: 44 };
  const ARENA = {
    l: 46,
    r: WORLD.w - 46,
    t: 230,
    b: WORLD.h - WALL_H - 130,
  };
  const PORTAL = { x: WORLD.w / 2, y: ARENA.t - 68, r: 70 };

  // --------- Cards ----------
  /** @type {Array<any>} */
  const CARDS = [
    {
      id: "knight",
      type: "role",
      name: "棉花骑士",
      cost: 2,
      weight: 1.05,
      radius: 26,
      color: "#ff78b8",
      drag: 1.85, // 较慢减速，保持冲劲
      launchSpeedMul: 1.15, // 发射速度较快
      effect: "trail", // 粒子尾迹
      life: 12, // 存在时间（秒），会随时间慢慢消失
      desc: "停下后：冲击波，震开附近怪物。",
      // 只触发一次的驻场冲击波
      onStop: { kind: "shockwave", cd: 0.75, dmg: 10, radius: 130, knock: 210, maxTriggers: 1 },
    },
    {
      id: "archer",
      type: "role",
      name: "糖霜弓手",
      cost: 3,
      weight: 0.85,
      radius: 23,
      color: "#67d6ff",
      drag: 2.8, // 快速减速，灵活
      launchSpeedMul: 1.35, // 发射速度最快
      effect: "sparkles", // 闪烁光点
      life: 14,
      desc: "停下后：自动射箭，优先打精英/Boss。",
      onStop: { kind: "arrows", cd: 0.5, dmg: 9, range: 420 },
    },
    {
      id: "mage",
      type: "role",
      name: "果冻法师",
      cost: 4,
      weight: 0.72,
      radius: 21,
      color: "#a67bff",
      drag: 2.2, // 中等减速
      launchSpeedMul: 0.95, // 发射速度较慢
      effect: "glow", // 光晕效果
      life: 13,
      desc: "停下后：法术射线，同时灼烧传送门。",
      onStop: { kind: "beam", cd: 0.8, dmg: 12, range: 520, portalDmg: 7 },
    },
    {
      id: "shield",
      type: "role",
      name: "软糖大盾",
      cost: 3,
      weight: 1.45,
      radius: 30,
      color: "#ffcc57",
      drag: 1.5, // 很慢减速，惯性大
      launchSpeedMul: 0.75, // 发射速度最慢
      effect: "spin", // 旋转效果
      life: 16,
      desc: "更重更大：碰撞伤害更高，停下后小范围嘲讽减速。",
      onStop: { kind: "auraSlow", cd: 0.55, dmg: 6, radius: 120, slow: 0.55 },
    },
    {
      id: "ice",
      type: "spell",
      name: "冰霜结界",
      cost: 4,
      color: "#79f2e1",
      desc: "放置在场地：减速范围内怪物一段时间。",
      spell: { kind: "fieldSlow", duration: 6.5, radius: 170, slow: 0.55 },
      target: "arena",
    },
    {
      id: "fire",
      type: "spell",
      name: "甜辣火球",
      cost: 3,
      color: "#ff8a5b",
      desc: "点选场地位置：爆炸伤害并击退。",
      spell: { kind: "burst", radius: 150, dmg: 18, knock: 240 },
      target: "arena",
    },
    {
      id: "heal",
      type: "spell",
      name: "城墙修补",
      cost: 2,
      color: "#7dff9a",
      desc: "立即回复城墙生命值。",
      spell: { kind: "healWall", heal: 14 },
      target: "instant",
    },
    {
      id: "charge",
      type: "spell",
      name: "小充能",
      cost: 1,
      color: "#4aa3ff",
      desc: "立即获得法术，并稍微提高当日回复速度。",
      spell: { kind: "chargeMana", gain: 2.5, regenBonus: 0.45, duration: 10 },
      target: "instant",
    },
    {
      id: "hellfire",
      type: "role",
      name: "烈焰法师",
      cost: 5,
      weight: 0.88,
      radius: 22,
      color: "#ff6b35",
      drag: 2.0,
      launchSpeedMul: 1.0,
      effect: "burn",
      life: 15,
      desc: "灼烧攻击：对同一目标伤害逐渐增加，最高3倍。",
      onStop: { kind: "hellfireBeam", cd: 0.6, baseDmg: 8, maxDmgMul: 3.0, rampTime: 4.0 },
    },
  ];

  // --------- 奖励卡牌池 ----------
  const REWARD_CARDS = [
    // 角色卡奖励
    { id: "knight", type: "role", name: "棉花骑士", rarity: "common" },
    { id: "archer", type: "role", name: "糖霜弓手", rarity: "common" },
    { id: "mage", type: "role", name: "果冻法师", rarity: "common" },
    { id: "shield", type: "role", name: "软糖大盾", rarity: "uncommon" },
    // 法术卡奖励
    { id: "ice", type: "spell", name: "冰霜结界", rarity: "common" },
    { id: "fire", type: "spell", name: "甜辣火球", rarity: "common" },
    { id: "heal", type: "spell", name: "城墙修补", rarity: "common" },
    { id: "charge", type: "spell", name: "小充能", rarity: "common" },
    // 道具奖励
    { id: "potion_health", type: "item", name: "生命药水", rarity: "common", effect: "立即回复20点城墙生命" },
    { id: "potion_mana", type: "item", name: "法力药水", rarity: "common", effect: "立即获得5点法力" },
    { id: "bomb", type: "item", name: "炸弹", rarity: "uncommon", effect: "对范围内所有怪物造成30点伤害" },
    { id: "time_freeze", type: "item", name: "时间冻结", rarity: "rare", effect: "冻结所有怪物5秒" },
    // 稀有角色卡
    { id: "dragon", type: "role", name: "火龙", rarity: "rare", cost: 6, desc: "强力范围伤害，飞行单位" },
    { id: "angel", type: "role", name: "天使", rarity: "rare", cost: 5, desc: "治疗城墙，净化怪物" },
    { id: "demon", type: "role", name: "恶魔", rarity: "epic", cost: 7, desc: "极高伤害，但会伤害城墙" }
  ];

  function generateRewardCards() {
    const cards = [];
    const rarities = { common: 0.6, uncommon: 0.25, rare: 0.12, epic: 0.03 };
    
    for (let i = 0; i < 4; i++) {
      const rand = Math.random();
      let selectedRarity = "common";
      let cumulative = 0;
      
      for (const [rarity, chance] of Object.entries(rarities)) {
        cumulative += chance;
        if (rand <= cumulative) {
          selectedRarity = rarity;
          break;
        }
      }
      
      const availableCards = REWARD_CARDS.filter(card => card.rarity === selectedRarity);
      const selectedCard = pick(availableCards);
      cards.push({ ...selectedCard, rewardId: i });
    }
    
    return cards;
  }

  // 十连抽系统
  function performGacha() {
    if (gameProgress.coins < 100) {
      showOverlay("金币不足", "需要100金币进行十连抽", "确定");
      return;
    }

    gameProgress.coins -= 100;
    
    const results = [];
    const rarities = { common: 0.7, uncommon: 0.2, rare: 0.08, epic: 0.02 };
    
    for (let i = 0; i < 10; i++) {
      const rand = Math.random();
      let selectedRarity = "common";
      let cumulative = 0;
      
      for (const [rarity, chance] of Object.entries(rarities)) {
        cumulative += chance;
        if (rand <= cumulative) {
          selectedRarity = rarity;
          break;
        }
      }
      
      const availableCards = REWARD_CARDS.filter(card => card.rarity === selectedRarity);
      const selectedCard = pick(availableCards);
      results.push(selectedCard);
      
      // 添加到收藏
      if (!gameProgress.cardCollection[selectedCard.id]) {
        gameProgress.cardCollection[selectedCard.id] = 0;
      }
      gameProgress.cardCollection[selectedCard.id]++;
      
      // 检查进阶
      if (gameProgress.cardCollection[selectedCard.id] >= 10 && !gameProgress.cardLevels[selectedCard.id]) {
        gameProgress.cardLevels[selectedCard.id] = 1;
      }
    }
    
    saveProgress();
    updateBuildUI();
    showGachaResults(results);
  }

  function showGachaResults(results) {
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
    gachaResultsEl.innerHTML = html;
    gachaResultsEl.classList.remove('hidden');
    
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

  function updateBuildUI() {
    buildCoinsEl.textContent = gameProgress.coins;
    buildBestDayEl.textContent = gameProgress.bestDay;
    currentSaveNameEl.textContent = gameProgress.saveName;
    
    // 更新游戏界面的金币显示
    if (gameCoinsEl) {
      gameCoinsEl.textContent = gameProgress.coins;
    }
    renderSaveSlots();
  }

  function renderSaveSlots() {
    let html = '';
    for (let i = 1; i <= 3; i++) {
      const slot = saveSlots[i];
      const isActive = gameProgress.saveSlot === i;
      
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
    saveSlotsEl.innerHTML = html;
    
    // 添加点击事件
    document.querySelectorAll('.save-slot').forEach(slotEl => {
      slotEl.addEventListener('click', (e) => {
        const slotNum = parseInt(e.currentTarget.dataset.slot);
        if (saveSlots[slotNum] || slotNum === gameProgress.saveSlot) {
          // 切换到已有存档
          if (slotNum !== gameProgress.saveSlot) {
            saveProgress(); // 保存当前存档
            loadProgress(slotNum); // 加载选中的存档
            updateBuildUI();
          }
        } else {
          // 空槽位，提示新建
          const name = prompt(`请输入存档 ${slotNum} 的名称：`, `存档${slotNum}`);
          if (name) {
            createNewSave(slotNum, name);
            updateBuildUI();
          }
        }
      });
    });
  }

  function showBuildOverlay() {
    updateBuildUI();
    buildOverlayEl.classList.remove('hidden');
    gachaResultsEl.classList.add('hidden');
  }

  function hideBuildOverlay() {
    buildOverlayEl.classList.add('hidden');
  }

  // --------- Runtime State ----------
  let now = 0;
  let lastTs = 0;
  let pausedOverlay = false;

  let day = 1;
  let selectedCardId = null;
  let mana = 0;
  let maxMana = 10;
  let manaRegen = 1.35; // per second

  let wall = { hp: 52, maxHp: 52 };
  let portal = { hp: 120, maxHp: 120 };

  // 奖励系统
  let rewardSystem = {
    showReward: false,
    rewardCards: [],
    selectedReward: null
  };

  // 货币和收藏系统
  let gameProgress = {
    coins: 0,
    bestDay: 1,
    totalKills: 0,
    cardCollection: {}, // 卡牌ID -> 数量
    cardLevels: {}, // 卡牌ID -> 进阶等级
    currentDay: 1,
    saveName: "默认存档",
    saveTime: null,
    saveSlot: 1 // 1-3 存档槽位
  };

  // 存档管理
  let saveSlots = {
    1: null,
    2: null, 
    3: null
  };

  function getSaveKey(slot) {
    return `slingshotProgress_slot${slot}`;
  }

  // 从本地存储加载进度
  function loadProgress(slot = null) {
    const loadSlot = slot || gameProgress.saveSlot;
    const saveKey = getSaveKey(loadSlot);
    const saved = localStorage.getItem(saveKey);
    
    if (saved) {
      try {
        const data = JSON.parse(saved);
        gameProgress = { ...gameProgress, ...data };
        gameProgress.saveSlot = loadSlot;
        console.log(`Loaded save from slot ${loadSlot}: ${gameProgress.saveName}`);
      } catch (e) {
        console.log('Failed to load progress, using default');
      }
    }
    
    // 更新存档槽位信息
    updateSaveSlots();
  }

  // 保存进度到本地存储
  function saveProgress() {
    const saveKey = getSaveKey(gameProgress.saveSlot);
    gameProgress.saveTime = new Date().toISOString();
    
    const saveData = {
      coins: gameProgress.coins,
      bestDay: gameProgress.bestDay,
      totalKills: gameProgress.totalKills,
      cardCollection: gameProgress.cardCollection,
      cardLevels: gameProgress.cardLevels,
      currentDay: day, // 保存当前游戏天数
      saveName: gameProgress.saveName,
      saveTime: gameProgress.saveTime
    };
    
    localStorage.setItem(saveKey, JSON.stringify(saveData));
    updateSaveSlots();
    console.log(`Saved to slot ${gameProgress.saveSlot}: ${gameProgress.saveName}`);
  }

  function updateSaveSlots() {
    for (let i = 1; i <= 3; i++) {
      const saveKey = getSaveKey(i);
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        try {
          saveSlots[i] = JSON.parse(saved);
        } catch (e) {
          saveSlots[i] = null;
        }
      } else {
        saveSlots[i] = null;
      }
    }
  }

  function createNewSave(slot, name) {
    gameProgress = {
      coins: 0,
      bestDay: 1,
      totalKills: 0,
      cardCollection: {},
      cardLevels: {},
      currentDay: 1,
      saveName: name || `存档${slot}`,
      saveTime: new Date().toISOString(),
      saveSlot: slot
    };
    saveProgress();
    day = 1;
    setupDay(1);
  }

  // 计算游戏奖励
  function calculateGameRewards() {
    const baseCoins = 10;
    const dayBonus = day * 2;
    const killBonus = Math.floor(gameProgress.totalKills * 0.1);
    const speedBonus = day > 5 ? Math.floor((day - 5) * 3) : 0;
    
    return {
      coins: baseCoins + dayBonus + killBonus + speedBonus,
      kills: gameProgress.totalKills
    };
  }

  let modifiers = {
    monsterSpeedMul: 1,
    roleCollisionMul: 1,
    portalMaxHpMul: 1,
    manaRegenMul: 1,
    wallMaxHpBonus: 0,
    maxManaBonus: 0,
  };
  let pendingModifier = null;

  /** @type {Array<Role>} */
  let roles = [];
  /** @type {Array<Monster>} */
  let monsters = [];
  /** @type {Array<any>} */
  let shots = [];
  /** @type {Array<any>} */
  let effects = [];
  /** @type {Array<any>} */
  let particles = [];

  // 伤害数字显示系统
  let damageNumbers = [];

  function showDamageNumber(x, y, damage, type = "normal") {
    const colors = {
      normal: "#ff4444",
      crit: "#ff8800",
      heal: "#44ff44",
      burn: "#ff6b35"
    };
    
    damageNumbers.push({
      x: x,
      y: y,
      damage: Math.round(damage),
      color: colors[type] || colors.normal,
      t: 0,
      dur: 1.5,
      vy: -60 // 向上飘的速度
    });
  }

  let spawn = {
    time: 0,
    nextAt: 0,
    remaining: 0,
    eliteRemaining: 0,
    bossRemaining: 0,
    megabossRemaining: 0,
    done: false,
  };

  // --------- Entities ----------
  class Role {
    constructor(card, x, y, vx, vy) {
      this.card = card;
      this.x = x;
      this.y = y;
      this.vx = vx;
      this.vy = vy;
      this.r = card.radius;
      this.m = Math.max(0.55, card.weight);
      this.drag = card.drag ?? 2.35; // 使用卡牌的拖拽系数
      this.bounce = 0.84;
      this.hp = 999;
      this.stopped = false;
      this.stopTimer = 0;
      this.effectCd = 0;
      this.lastColl = -999;
      this.rotation = 0; // 用于旋转效果
      this.trail = []; // 尾迹点数组
      this.lastTrailTime = 0;
      // 生命/存在时间：缓慢消失
      this.maxLife = card.life ?? 14;
      this.life = this.maxLife;
      this.dead = false;
      this.stopTriggers = 0;
      // 灼烧机制：追踪当前目标和伤害累加
      this.burnTarget = null;
      this.burnDamage = 0;
      this.burnStartTime = 0;
      this.lastBurnTarget = null;
    }

    speed() {
      return Math.hypot(this.vx, this.vy);
    }

    update(dt) {
      if (!this.stopped) {
        const drag = Math.exp(-this.drag * dt);
        this.vx *= drag;
        this.vy *= drag;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // 旋转效果（大盾）
        if (this.card.effect === "spin") {
          const sp = this.speed();
          this.rotation += sp * 0.08 * dt;
        }
        
        // 尾迹效果（骑士）
        if (this.card.effect === "trail") {
          this.lastTrailTime += dt;
          if (this.lastTrailTime >= 0.03) {
            this.trail.push({ x: this.x, y: this.y, t: 0, dur: 0.35 });
            this.lastTrailTime = 0;
            if (this.trail.length > 12) this.trail.shift();
          }
        }
        
        // 闪烁光点效果（弓手）
        if (this.card.effect === "sparkles" && Math.random() < 0.25) {
          particles.push({
            x: this.x + rand(-this.r * 0.6, this.r * 0.6),
            y: this.y + rand(-this.r * 0.6, this.r * 0.6),
            vx: rand(-40, 40),
            vy: rand(-40, 40),
            r: rand(2, 4),
            t: 0,
            dur: rand(0.2, 0.4),
            color: this.card.color,
          });
        }
        
        // 燃烧效果（烈焰法师）
        if (this.card.effect === "burn" && Math.random() < 0.3) {
          particles.push({
            x: this.x + rand(-this.r * 0.8, this.r * 0.8),
            y: this.y + rand(-this.r * 0.8, this.r * 0.8),
            vx: rand(-30, 30),
            vy: rand(-50, -10),
            r: rand(3, 5),
            t: 0,
            dur: rand(0.4, 0.7),
            color: "#ff6b35",
          });
        }
        
        this._collideArena();
        this._collidePortal();

        const sp = this.speed();
        if (sp < 22 && now - this.lastColl > 0.12) {
          this.stopped = true;
          this.vx = 0;
          this.vy = 0;
          this.stopTimer = 0;
          this.effectCd = rand(0.05, 0.18);
          puff(this.x, this.y, this.card.color, 10);
        }
      } else {
        this.stopTimer += dt;
        this.effectCd -= dt;
        if (this.effectCd <= 0) {
          const cfg = this.card.onStop;
          if (cfg) {
            // 有些驻场效果只发动一次
            if (cfg.maxTriggers && this.stopTriggers >= cfg.maxTriggers) {
              this.effectCd = 9999; // 基本不再触发
            } else {
              this._emitStoppedEffect();
              this.stopTriggers++;
              this.effectCd = cfg.cd ?? 999;
            }
          } else {
            this.effectCd = 999;
          }
        }
      }
      
      // 更新尾迹
      if (this.card.effect === "trail") {
        for (const p of this.trail) p.t += dt;
        this.trail = this.trail.filter((p) => p.t < p.dur);
      }

      // 随时间逐渐消失
      this.life -= dt;
      if (this.life <= 0) {
        this.dead = true;
      }
    }

    _collideArena() {
      if (this.x - this.r < ARENA.l) {
        this.x = ARENA.l + this.r;
        this.vx = Math.abs(this.vx) * this.bounce;
        this._bump();
      } else if (this.x + this.r > ARENA.r) {
        this.x = ARENA.r - this.r;
        this.vx = -Math.abs(this.vx) * this.bounce;
        this._bump();
      }
      if (this.y - this.r < ARENA.t) {
        this.y = ARENA.t + this.r;
        this.vy = Math.abs(this.vy) * this.bounce;
        this._bump();
      } else if (this.y + this.r > ARENA.b) {
        this.y = ARENA.b - this.r;
        this.vy = -Math.abs(this.vy) * this.bounce;
        this._bump();
      }
    }

    _collidePortal() {
      const dx = this.x - PORTAL.x;
      const dy = this.y - PORTAL.y;
      const d = Math.hypot(dx, dy);
      const minD = this.r + PORTAL.r;
      if (d < minD) {
        const n = norm(dx, dy);
        const overlap = minD - d;
        this.x += n.x * overlap;
        this.y += n.y * overlap;
        // bounce out
        const vn = this.vx * n.x + this.vy * n.y;
        this.vx -= (1.8 * vn) * n.x;
        this.vy -= (1.8 * vn) * n.y;
        this.vx *= this.bounce;
        this.vy *= this.bounce;
        this._bump();

        // damage portal
        const hitDmg = (this.m * 9 + Math.min(70, this.speed()) * 0.18) * modifiers.roleCollisionMul;
        dealPortal(hitDmg);
        sparkle(PORTAL.x, PORTAL.y + PORTAL.r * 0.15, "#ffd1ef", 14);
      }
    }

    _bump() {
      this.lastColl = now;
      puff(this.x, this.y, "rgba(0,0,0,0.18)", 6);
    }

    _emitStoppedEffect() {
      const eff = this.card.onStop;
      if (!eff) return;
      if (eff.kind === "shockwave") {
        effects.push({
          kind: "ring",
          x: this.x,
          y: this.y,
          t: 0,
          dur: 0.25,
          color: this.card.color,
          r0: 10,
          r1: eff.radius,
        });
        hitMonstersInRadius(this.x, this.y, eff.radius, eff.dmg, eff.knock);
      } else if (eff.kind === "arrows") {
        const target = findBestMonsterTarget(this.x, this.y, eff.range);
        if (target) {
          effects.push({
            kind: "line",
            x0: this.x,
            y0: this.y,
            x1: target.x,
            y1: target.y,
            t: 0,
            dur: 0.12,
            color: "rgba(80,180,255,0.95)",
          });
          target.takeDamage(eff.dmg);
          showDamageNumber(target.x, target.y, eff.dmg, "normal");
          sparkle(target.x, target.y, "#b8f2ff", 8);
        }
      } else if (eff.kind === "beam") {
        const target = findBestMonsterTarget(this.x, this.y, eff.range);
        const tx = target ? target.x : PORTAL.x;
        const ty = target ? target.y : PORTAL.y + PORTAL.r * 0.15;
        effects.push({
          kind: "line",
          x0: this.x,
          y0: this.y,
          x1: tx,
          y1: ty,
          t: 0,
          dur: 0.14,
          color: "rgba(165,120,255,0.95)",
        });
        if (target) {
          target.takeDamage(eff.dmg);
          showDamageNumber(tx, ty, eff.dmg, "normal");
          sparkle(tx, ty, "#ead7ff", 10);
        } else {
          dealPortal(eff.portalDmg);
        }
      } else if (eff.kind === "hellfireBeam") {
        const target = findBestMonsterTarget(this.x, this.y, 520);
        
        if (target) {
          // 检查目标是否变化
          if (this.lastBurnTarget !== target) {
            // 目标变化，重置灼烧计数
            this.burnTarget = target;
            this.burnStartTime = now;
            this.burnDamage = 0;
            this.lastBurnTarget = target;
          }
          
          // 计算灼烧伤害倍数
          const burnTime = now - this.burnStartTime;
          const rampProgress = Math.min(burnTime / eff.rampTime, 1.0);
          const damageMul = 1.0 + (eff.maxDmgMul - 1.0) * rampProgress;
          const finalDamage = eff.baseDmg * damageMul;
          
          // 造成伤害
          target.takeDamage(finalDamage);
          showDamageNumber(target.x, target.y, finalDamage, "burn");
          
          // 特效：火焰射线
          effects.push({
            kind: "line",
            x0: this.x,
            y0: this.y,
            x1: target.x,
            y1: target.y,
            t: 0,
            dur: 0.16,
            color: `rgba(255, 107, 53, ${0.6 + rampProgress * 0.4})`,
          });
          
          // 火花粒子
          sparkle(target.x, target.y, "#ff6b35", 12);
          
          // 高倍数时的额外特效
          if (damageMul > 2.0) {
            for (let i = 0; i < 3; i++) {
              particles.push({
                x: target.x + rand(-20, 20),
                y: target.y + rand(-20, 20),
                vx: rand(-60, 60),
                vy: rand(-80, -20),
                r: rand(2, 4),
                t: 0,
                dur: rand(0.3, 0.6),
                color: "#ff6b35",
              });
            }
          }
        } else {
          // 没有目标时重置
          this.lastBurnTarget = null;
          this.burnDamage = 0;
        }
      } else if (eff.kind === "auraSlow") {
        effects.push({
          kind: "pulse",
          x: this.x,
          y: this.y,
          t: 0,
          dur: 0.20,
          color: "rgba(255,210,90,0.95)",
          r: eff.radius,
        });
        for (const m of monsters) {
          const d = Math.hypot(m.x - this.x, m.y - this.y);
          if (d <= eff.radius + m.r) {
            m.takeDamage(eff.dmg);
            showDamageNumber(m.x, m.y, eff.dmg, "normal");
            m.slowTimer = Math.max(m.slowTimer, 0.55);
            m.slowMul = Math.min(m.slowMul, eff.slow);
          }
        }
      }
    }

    draw(g) {
      const c = this.card.color;
      g.save();
      g.translate(this.x, this.y);

      // 寿命可视化：越接近消失越暗淡
      const lifeP = clamp(this.life / Math.max(0.001, this.maxLife), 0, 1);
      const fade = lifeP < 0.25 ? (0.25 + lifeP * 3.0) : 1;
      g.globalAlpha = fade;
      
      // 旋转效果（大盾）
      if (this.card.effect === "spin" && !this.stopped) {
        g.rotate(this.rotation);
      }
      
      // 光晕效果（法师）
      if (this.card.effect === "glow") {
        const glowGrd = g.createRadialGradient(0, 0, 0, 0, 0, this.r * 1.8);
        glowGrd.addColorStop(0, withAlpha(c, 0.25));
        glowGrd.addColorStop(0.4, withAlpha(c, 0.12));
        glowGrd.addColorStop(1, withAlpha(c, 0));
        g.fillStyle = glowGrd;
        g.beginPath();
        g.arc(0, 0, this.r * 1.8, 0, Math.PI * 2);
        g.fill();
      }
      
      // 尾迹效果（骑士）- 在角色后面绘制
      if (this.card.effect === "trail" && this.trail.length > 0) {
        for (let i = 0; i < this.trail.length; i++) {
          const p = this.trail[i];
          const alpha = (1 - p.t / p.dur) * 0.4;
          const r = this.r * (0.3 + 0.7 * (1 - p.t / p.dur));
          g.fillStyle = withAlpha(c, alpha);
          g.beginPath();
          g.arc(p.x - this.x, p.y - this.y, r, 0, Math.PI * 2);
          g.fill();
        }
      }
      
      // cute shadow
      g.fillStyle = "rgba(0,0,0,0.12)";
      g.beginPath();
      g.ellipse(6, this.r * 0.62, this.r * 0.92, this.r * 0.42, 0, 0, Math.PI * 2);
      g.fill();
      
      // body
      const grd = g.createRadialGradient(-this.r * 0.35, -this.r * 0.35, 6, 0, 0, this.r);
      grd.addColorStop(0, "#fff");
      grd.addColorStop(0.2, c);
      grd.addColorStop(1, shade(c, -18));
      g.fillStyle = grd;
      g.strokeStyle = "rgba(0,0,0,0.12)";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(0, 0, this.r, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      
      // 特殊装饰（根据卡牌类型）
      if (this.card.id === "knight") {
        // 骑士：小星星装饰
        g.fillStyle = "rgba(255,255,255,0.85)";
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI * 2) / 4 + now * 0.8;
          const dist = this.r * 0.75;
          g.beginPath();
          g.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 2.5, 0, Math.PI * 2);
          g.fill();
        }
      } else if (this.card.id === "archer") {
        // 弓手：小箭头装饰
        g.strokeStyle = "rgba(255,255,255,0.9)";
        g.lineWidth = 2.5;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(-this.r * 0.5, 0);
        g.lineTo(this.r * 0.5, 0);
        g.moveTo(this.r * 0.35, -this.r * 0.15);
        g.lineTo(this.r * 0.5, 0);
        g.lineTo(this.r * 0.35, this.r * 0.15);
        g.stroke();
      } else if (this.card.id === "mage") {
        // 法师：魔法阵装饰
        g.strokeStyle = withAlpha(c, 0.5);
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, this.r * 0.6, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.moveTo(-this.r * 0.42, -this.r * 0.42);
        g.lineTo(this.r * 0.42, this.r * 0.42);
        g.moveTo(this.r * 0.42, -this.r * 0.42);
        g.lineTo(-this.r * 0.42, this.r * 0.42);
        g.stroke();
      } else if (this.card.id === "shield") {
        // 大盾：盾牌装饰
        g.fillStyle = "rgba(255,255,255,0.7)";
        g.beginPath();
        g.roundRect(-this.r * 0.4, -this.r * 0.6, this.r * 0.8, this.r * 1.2, 8);
        g.fill();
        g.strokeStyle = "rgba(0,0,0,0.2)";
        g.lineWidth = 2;
        g.stroke();
      }
      
      // face
      g.fillStyle = "rgba(0,0,0,0.55)";
      g.beginPath();
      g.arc(-this.r * 0.24, -this.r * 0.10, 3.3, 0, Math.PI * 2);
      g.arc(this.r * 0.16, -this.r * 0.08, 3.3, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "rgba(255,70,140,0.55)";
      g.beginPath();
      g.arc(-this.r * 0.33, this.r * 0.10, 4, 0, Math.PI * 2);
      g.arc(this.r * 0.30, this.r * 0.12, 4, 0, Math.PI * 2);
      g.fill();

      // 寿命环：一圈进度条（快没时变红+闪烁）
      const ringR = this.r + 8;
      const blink = lifeP < 0.20 ? (0.55 + 0.45 * Math.sin(now * 18)) : 1;
      g.globalAlpha = Math.min(1, fade + 0.15) * blink;
      g.strokeStyle = "rgba(0,0,0,0.14)";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, ringR, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = lifeP > 0.5 ? "rgba(70,210,130,0.95)" : lifeP > 0.2 ? "rgba(255,196,80,0.95)" : "rgba(255,90,90,0.95)";
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * lifeP);
      g.stroke();

      g.restore();
    }
  }

  class Monster {
    constructor(kind, x, y, dayMul) {
      this.kind = kind; // minion / elite / boss / ghost / hunter / shooter

      // 不同怪物类型的基础属性
      let baseHp = 22;
      let hpMul = 1;
      let radius = 16;
      let baseSpeed = 86;
      let color = "#7be27a";

      if (kind === "boss") {
        baseHp = 180;
        hpMul = 1.8;
        radius = 34;
        baseSpeed = 72;
        color = "#ff4b4b";
      } else if (kind === "elite") {
        baseHp = 55;
        hpMul = 1.15;
        radius = 22;
        baseSpeed = 78;
        color = "#ff9a3c";
      } else if (kind === "ghost") {
        // 穿透怪：血量不高，但移动快，不受减速影响
        baseHp = 26;
        hpMul = 1.0;
        radius = 18;
        baseSpeed = 110;
        color = "#c6a4ff";
      } else if (kind === "hunter") {
        // 斩杀怪：优先追击我方角色
        baseHp = 40;
        hpMul = 1.1;
        radius = 20;
        baseSpeed = 95;
        color = "#ffb447";
      } else if (kind === "shooter") {
        // 远程怪：走到中线附近后停下射击
        baseHp = 35;
        hpMul = 1.0;
        radius = 18;
        baseSpeed = 70;
        color = "#7fd5ff";
      } else if (kind === "megaboss") {
        // 超大Boss：第5天和第10天出现
        baseHp = 800 + day * 100;
        hpMul = 2.5;
        radius = 60;
        baseSpeed = 40;
        color = "#8b0000"; // 深红色
      }

      this.maxHp = Math.round(baseHp * (1 + dayMul * 0.10) * hpMul);
      this.hp = this.maxHp;
      this.r = radius;
      this.x = x;
      this.y = y;
      this.vx = rand(-22, 22);
      this.vy = 0;
      this.baseSpeed = baseSpeed * (1 + dayMul * 0.03);
      this.color = color;
      this.slowTimer = 0;
      this.slowMul = 1;
      this.frozen = false;
      this.frozenTimer = 0;
      // 所有怪物都可以远程攻击（除了ghost和hunter）
      this.stopped = false; // 是否已停在场地内
      this.shootCd = (kind === "ghost" || kind === "hunter") ? 0 : rand(1.5, 2.5);
      this.stoppedY = 0; // 停下的目标Y位置（场地中下部）
    }

    update(dt) {
      // 冻结状态检查
      if (this.frozen) {
        this.frozenTimer -= dt;
        if (this.frozenTimer <= 0) {
          this.frozen = false;
        } else {
          // 冻结时不移动，但显示冰冻效果
          return;
        }
      }
      
      // 穿透怪不受减速场影响
      const fieldMul = this.kind === "ghost" ? 1 : getSlowFieldMul(this.x, this.y);
      if (this.slowTimer > 0) {
        this.slowTimer -= dt;
        if (this.slowTimer <= 0) this.slowMul = 1;
      }
      const mul = Math.min(this.slowMul, fieldMul);

      if (this.kind === "ghost") {
        // 幽灵：直接冲向城墙，不受任何阻拦
        const targetVy = this.baseSpeed * modifiers.monsterSpeedMul * mul;
        this.vy = targetVy;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        // 轻微左右飘动
        this.vx += rand(-12, 12) * dt;
        this.vx = clamp(this.vx, -50, 50);
      } else if (this.kind === "hunter" && roles.length > 0) {
        // 斩杀怪：朝最近的角色冲过去
        let target = roles[0];
        let bestD = Infinity;
        for (const r of roles) {
          const d = Math.hypot(r.x - this.x, r.y - this.y);
          if (d < bestD) {
            bestD = d;
            target = r;
          }
        }
        const dir = norm(target.x - this.x, target.y - this.y);
        const sp = this.baseSpeed * modifiers.monsterSpeedMul * mul;
        this.vx = dir.x * sp;
        this.vy = dir.y * sp;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      } else {
        // 其他怪物（minion/elite/boss/shooter）：走到场地中下部后停下，远程攻击城墙
        // 超大Boss特殊处理：直接冲向城墙
        if (this.kind === "megaboss") {
          // 超大Boss：直接冲向城墙，速度较慢但无法阻挡
          const targetVy = this.baseSpeed * modifiers.monsterSpeedMul * mul * 0.8; // 稍微慢一点
          this.vy = targetVy;
          this.y += this.vy * dt;
          
          // 轻微左右摆动
          this.vx += rand(-8, 8) * dt;
          this.vx = clamp(this.vx, -20, 20);
          this.x += this.vx * dt;
          
          // Boss攻击：周期性发射大范围攻击
          this.shootCd -= dt;
          if (this.shootCd <= 0) {
            // 发射3个方向的攻击
            const wallY = WORLD.h - WALL_H;
            const dmg = 8; // Boss伤害更高
            
            // 中央攻击
            spawnShot(this.x, this.y, this.x, wallY, "spike", "wall", dmg);
            // 左右两侧攻击
            spawnShot(this.x - 30, this.y, this.x - 30, wallY, "spike", "wall", dmg);
            spawnShot(this.x + 30, this.y, this.x + 30, wallY, "spike", "wall", dmg);
            
            this.shootCd = rand(2.0, 3.5);
            
            // 偶尔也打一下角色（如果很近）
            if (Math.random() < 0.25 && roles.length > 0) {
              let targetRole = null;
              let bestD = Infinity;
              for (const r of roles) {
                const d = Math.hypot(r.x - this.x, r.y - this.y);
                if (d < bestD && d < 300) {
                  bestD = d;
                  targetRole = r;
                }
              }
              if (targetRole) {
                spawnShot(this.x, this.y, targetRole.x, targetRole.y, "spike", "role", dmg * 1.5);
              }
            }
          }
        } else if (!this.stopped) {
          // 确定停下的目标位置（场地中下部，靠近城墙）
          if (this.stoppedY === 0) {
            this.stoppedY = ARENA.b - rand(60, 120);
          }
          
          // 朝目标位置移动
          const dy = this.stoppedY - this.y;
          if (Math.abs(dy) > 8) {
            const sp = this.baseSpeed * modifiers.monsterSpeedMul * mul;
            this.vy = Math.sign(dy) * Math.min(sp, Math.abs(dy) * 3);
            this.y += this.vy * dt;
          } else {
            // 到达目标位置，停下
            this.stopped = true;
            this.vy = 0;
            this.vx = rand(-20, 20);
          }
          
          // 移动时轻微左右飘动
          this.vx += rand(-12, 12) * dt;
          this.vx = clamp(this.vx, -40, 40);
          this.x += this.vx * dt;
        } else {
          // 已停下：远程攻击城墙
          this.vx *= 0.95; // 水平速度衰减
          this.x += this.vx * dt;
          
          this.shootCd -= dt;
          if (this.shootCd <= 0) {
            // 攻击城墙
            const wallY = WORLD.h - WALL_H;
            const dmg = this.kind === "boss" ? 4 : this.kind === "elite" ? 2 : 1;
            spawnShot(this.x, this.y, this.x, wallY, this.kind === "boss" ? "spike" : "bubble", "wall", dmg);
            this.shootCd = rand(1.2, 2.5);
            
            // 偶尔也打一下角色（如果很近）
            if (Math.random() < 0.15 && roles.length > 0) {
              let targetRole = null;
              let bestD = Infinity;
              for (const r of roles) {
                const d = Math.hypot(r.x - this.x, r.y - this.y);
                if (d < bestD && d < 200) {
                  bestD = d;
                  targetRole = r;
                }
              }
              if (targetRole) {
                spawnShot(this.x, this.y, targetRole.x, targetRole.y, "bubble", "role");
              }
            }
          }
        }
      }

      // soft bounds（限制在场地内）
      if (this.x - this.r < ARENA.l) {
        this.x = ARENA.l + this.r;
        this.vx = Math.abs(this.vx) * 0.8;
      } else if (this.x + this.r > ARENA.r) {
        this.x = ARENA.r - this.r;
        this.vx = -Math.abs(this.vx) * 0.8;
      }
    }

    takeDamage(dmg) {
      this.hp -= dmg;
      if (this.hp <= 0) {
        this.hp = 0;
        sparkle(this.x, this.y, this.color, this.kind === "boss" ? 24 : 12);
        
        // 增加击杀计数
        gameProgress.totalKills++;
      }
    }

    draw(g) {
      const c = this.color;
      g.save();
      g.translate(this.x, this.y);
      
      // 特殊处理超大Boss
      const isMegaboss = this.kind === "megaboss";
      
      if (isMegaboss) {
        // Boss阴影
        g.fillStyle = "rgba(0,0,0,0.3)";
        g.beginPath();
        g.ellipse(8, this.r * 0.7, this.r * 1.1, this.r * 0.5, 0, 0, Math.PI * 2);
        g.fill();
        
        // Boss主体 - 铠甲外观
        const armorGrd = g.createRadialGradient(-this.r * 0.3, -this.r * 0.4, 10, 0, 0, this.r);
        armorGrd.addColorStop(0, "#ff4444");
        armorGrd.addColorStop(0.3, "#8b0000");
        armorGrd.addColorStop(0.7, "#4b0000");
        armorGrd.addColorStop(1, "#2b0000");
        
        g.fillStyle = armorGrd;
        g.strokeStyle = "#000000";
        g.lineWidth = 4;
        g.beginPath();
        g.arc(0, 0, this.r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        
        // 铠甲装饰 - 尖刺
        g.fillStyle = "#666666";
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const spikeX = Math.cos(angle) * (this.r - 10);
          const spikeY = Math.sin(angle) * (this.r - 10);
          
          g.beginPath();
          g.moveTo(spikeX, spikeY);
          g.lineTo(Math.cos(angle) * this.r, Math.sin(angle) * this.r);
          g.lineTo(Math.cos(angle + 0.2) * (this.r - 8), Math.sin(angle + 0.2) * (this.r - 8));
          g.closePath();
          g.fill();
        }
        
        // Boss眼睛 - 发光效果
        const eyeGlow = g.createRadialGradient(-this.r * 0.3, -this.r * 0.2, 2, -this.r * 0.3, -this.r * 0.2, 8);
        eyeGlow.addColorStop(0, "#ffff00");
        eyeGlow.addColorStop(0.5, "#ff8800");
        eyeGlow.addColorStop(1, "rgba(255, 136, 0, 0)");
        
        g.fillStyle = eyeGlow;
        g.beginPath();
        g.arc(-this.r * 0.3, -this.r * 0.2, 12, 0, Math.PI * 2);
        g.fill();
        
        g.beginPath();
        g.arc(this.r * 0.3, -this.r * 0.2, 12, 0, Math.PI * 2);
        g.fill();
        
        // 怪物嘴巴
        g.fillStyle = "#000000";
        g.beginPath();
        g.arc(0, this.r * 0.1, this.r * 0.3, 0, Math.PI);
        g.fill();
        
        // Boss血条 - 更大更醒目
        const barW = this.r * 2.5;
        const barH = 12;
        const barY = -this.r - 25;
        const hpP = this.hp / this.maxHp;
        
        g.fillStyle = "rgba(0,0,0,0.5)";
        g.fillRect(-barW/2, barY, barW, barH);
        
        const bossBarColor = hpP > 0.6 ? "#ff3333" : hpP > 0.3 ? "#ff8800" : "#ff0000";
        g.fillStyle = bossBarColor;
        g.fillRect(-barW/2, barY, barW * hpP, barH);
        
        g.strokeStyle = "#ffffff";
        g.lineWidth = 2;
        g.strokeRect(-barW/2, barY, barW, barH);
        
        // Boss名称
        g.fillStyle = "#ffffff";
        g.font = "bold 14px sans-serif";
        g.textAlign = "center";
        g.fillText("MEGA BOSS", 0, barY - 5);
        
      } else {
        // 普通怪物绘制逻辑
        const isGhost = this.kind === "ghost";
        const isHunter = this.kind === "hunter";
        const isShooter = this.kind === "shooter";

        // shadow (ghost lighter)
        g.fillStyle = isGhost ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.11)";
        g.beginPath();
        g.ellipse(4, this.r * 0.62, this.r * 0.95, this.r * 0.45, 0, 0, Math.PI * 2);
        g.fill();

        // ghost aura
        if (isGhost) {
          g.globalAlpha = 0.85;
          const aura = g.createRadialGradient(0, 0, this.r * 0.25, 0, 0, this.r * 1.8);
          aura.addColorStop(0, withAlpha(c, 0.22));
          aura.addColorStop(1, withAlpha(c, 0));
          g.fillStyle = aura;
          g.beginPath();
          g.arc(0, 0, this.r * 1.8, 0, Math.PI * 2);
          g.fill();
          g.globalAlpha = 0.75;
        } else {
          g.globalAlpha = 1;
        }

        // body
        const grd = g.createRadialGradient(-this.r * 0.25, -this.r * 0.35, 6, 0, 0, this.r);
        grd.addColorStop(0, "#ffffff");
        grd.addColorStop(0.18, c);
        grd.addColorStop(1, shade(c, -22));
        g.fillStyle = grd;
        g.strokeStyle = "rgba(0,0,0,0.12)";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(0, 0, this.r, 0, Math.PI * 2);
        g.fill();
        g.stroke();

        // 冻结效果
        if (this.frozen) {
          g.fillStyle = "rgba(135, 206, 250, 0.6)";
          g.strokeStyle = "rgba(100, 149, 237, 0.8)";
          g.lineWidth = 2;
          g.beginPath();
          g.arc(0, 0, this.r + 3, 0, Math.PI * 2);
          g.fill();
          g.stroke();
          
          // 冰晶效果
          g.strokeStyle = "rgba(255, 255, 255, 0.8)";
          g.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const x1 = Math.cos(angle) * (this.r - 5);
            const y1 = Math.sin(angle) * (this.r - 5);
            const x2 = Math.cos(angle) * (this.r + 8);
            const y2 = Math.sin(angle) * (this.r + 8);
            g.beginPath();
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            g.stroke();
          }
        }

        // ghost tail (wavy bottom)
        if (isGhost) {
          g.fillStyle = withAlpha("#ffffff", 0.55);
          g.beginPath();
          const yy = this.r * 0.55;
          g.moveTo(-this.r * 0.7, yy);
          for (let i = 0; i <= 5; i++) {
            const x = -this.r * 0.7 + (this.r * 1.4 * i) / 5;
            const wave = Math.sin(now * 6 + i * 1.7) * 4;
            g.quadraticCurveTo(x, yy + 14 + wave, x + (this.r * 1.4) / 10, yy);
          }
          g.closePath();
          g.fill();
        }

        // horns / ears / turret
        if (!isGhost && !isShooter) {
          // default horns
          g.fillStyle = "rgba(255,255,255,0.9)";
          g.beginPath();
          g.roundRect(-this.r * 0.65, -this.r * 0.95, this.r * 0.35, this.r * 0.35, 6);
          g.fill();
          g.beginPath();
          g.roundRect(this.r * 0.30, -this.r * 0.95, this.r * 0.35, this.r * 0.35, 6);
          g.fill();
        }
        if (isHunter) {
          // hunter spikes/ears
          g.fillStyle = "rgba(255,255,255,0.9)";
          g.beginPath();
          g.moveTo(-this.r * 0.55, -this.r * 0.55);
          g.lineTo(-this.r * 0.85, -this.r * 0.95);
          g.lineTo(-this.r * 0.30, -this.r * 0.78);
          g.closePath();
          g.fill();
          g.beginPath();
          g.moveTo(this.r * 0.55, -this.r * 0.55);
          g.lineTo(this.r * 0.85, -this.r * 0.95);
          g.lineTo(this.r * 0.30, -this.r * 0.78);
          g.closePath();
          g.fill();
        }
        if (isShooter) {
          // turret top + barrel
          g.fillStyle = "rgba(255,255,255,0.88)";
          g.beginPath();
          g.roundRect(-this.r * 0.45, -this.r * 1.05, this.r * 0.9, this.r * 0.55, 8);
          g.fill();
          g.strokeStyle = "rgba(0,0,0,0.10)";
          g.lineWidth = 2;
          g.stroke();
          g.strokeStyle = "rgba(255,255,255,0.95)";
          g.lineWidth = 5;
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(0, -this.r * 0.82);
          g.lineTo(0, -this.r * 1.35);
          g.stroke();
        }

        // face (ghost uses softer face)
        g.fillStyle = isGhost ? "rgba(0,0,0,0.40)" : "rgba(0,0,0,0.55)";
        g.beginPath();
        g.arc(-this.r * 0.22, -this.r * 0.08, 3, 0, Math.PI * 2);
        g.arc(this.r * 0.18, -this.r * 0.06, 3, 0, Math.PI * 2);
        g.fill();
        if (isHunter) {
          // fangs
          g.fillStyle = "rgba(255,255,255,0.85)";
          g.beginPath();
          g.moveTo(-this.r * 0.12, this.r * 0.12);
          g.lineTo(-this.r * 0.04, this.r * 0.34);
          g.lineTo(this.r * 0.04, this.r * 0.12);
          g.closePath();
          g.fill();
          g.beginPath();
          g.moveTo(this.r * 0.12, this.r * 0.12);
          g.lineTo(this.r * 0.04, this.r * 0.34);
          g.lineTo(-this.r * 0.04, this.r * 0.12);
          g.closePath();
          g.fill();
        }

        // hp bar
        const w = this.r * 1.4;
        const h = 6;
        const p = this.hp / this.maxHp;
        g.fillStyle = "rgba(0,0,0,0.16)";
        g.fillRect(-w / 2, -this.r - 14, w, h);
        g.fillStyle = p > 0.5 ? "rgba(60,210,120,0.95)" : p > 0.2 ? "rgba(255,196,80,0.95)" : "rgba(255,90,90,0.95)";
        g.fillRect(-w / 2, -this.r - 14, w * p, h);
      }
      
      g.restore();
    }
  }

  // --------- Effects / Particles ----------
  function puff(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: rand(-120, 120),
        vy: rand(-160, 40),
        r: rand(2, 6),
        t: 0,
        dur: rand(0.25, 0.55),
        color,
      });
    }
  }
  function sparkle(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: rand(-180, 180),
        vy: rand(-180, 180),
        r: rand(2, 7),
        t: 0,
        dur: rand(0.35, 0.75),
        color,
      });
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
    }
    particles = particles.filter((p) => p.t < p.dur);
  }

  function updateDamageNumbers(dt) {
    for (const dn of damageNumbers) {
      dn.t += dt;
      dn.y += dn.vy * dt;
      dn.vy += 150 * dt; // 重力效果，让数字下落
    }
    damageNumbers = damageNumbers.filter((dn) => dn.t < dn.dur);
  }

  function drawParticles(g) {
    for (const p of particles) {
      const a = 1 - p.t / p.dur;
      g.fillStyle = withAlpha(p.color, a);
      g.beginPath();
      g.arc(p.x, p.y, p.r * (0.8 + 0.3 * a), 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawDamageNumbers(g) {
    for (const dn of damageNumbers) {
      const a = 1 - dn.t / dn.dur;
      const scale = 1.0 + (1 - a) * 0.5; // 开始时稍大，逐渐缩小
      
      g.save();
      g.translate(dn.x, dn.y);
      g.scale(scale, scale);
      
      // 描边
      g.strokeStyle = "rgba(0, 0, 0, 0.8)";
      g.lineWidth = 3;
      g.font = "bold 16px sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.strokeText(dn.damage.toString(), 0, 0);
      
      // 填充
      g.fillStyle = withAlpha(dn.color, a);
      g.fillText(dn.damage.toString(), 0, 0);
      
      g.restore();
    }
  }

  // --------- Helpers ----------
  function withAlpha(color, alpha) {
    if (color.startsWith("rgba")) return color.replace(/rgba\((.+?),\s*([0-9.]+)\)/, `rgba($1, ${alpha})`);
    if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
    // hex to rgba
    if (color.startsWith("#")) {
      const h = color.replace("#", "");
      if (h.length === 6) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    return color;
  }

  function shade(hex, amt) {
    // quick hex shade, expects #rrggbb
    const h = hex.replace("#", "");
    if (h.length !== 6) return hex;
    const r = clamp(parseInt(h.slice(0, 2), 16) + amt, 0, 255);
    const g = clamp(parseInt(h.slice(2, 4), 16) + amt, 0, 255);
    const b = clamp(parseInt(h.slice(4, 6), 16) + amt, 0, 255);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  function pointInCircle(px, py, cx, cy, r) {
    return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
  }

  function inArena(x, y) {
    return x >= ARENA.l && x <= ARENA.r && y >= ARENA.t && y <= ARENA.b;
  }

  function findBestMonsterTarget(x, y, range) {
    /** @type {Monster|null} */
    let best = null;
    let bestScore = -Infinity;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d > range) continue;
      const kindScore = m.kind === "boss" ? 50 : m.kind === "elite" ? 15 : 0;
      const score = kindScore - d * 0.04 + (1 - m.hp / m.maxHp) * 2.0;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    return best;
  }

  function hitMonstersInRadius(x, y, radius, dmg, knock) {
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      const dx = m.x - x;
      const dy = m.y - y;
      const d = Math.hypot(dx, dy);
      if (d <= radius + m.r) {
        const falloff = 0.55 + 0.45 * (1 - clamp(d / (radius + m.r), 0, 1));
        m.takeDamage(dmg * falloff);
        const n = norm(dx, dy);
        m.x += n.x * knock * 0.03;
        m.y += n.y * knock * 0.03;
        m.vx += n.x * knock * 0.22;
        // little stagger
        m.slowTimer = Math.max(m.slowTimer, 0.25);
        m.slowMul = Math.min(m.slowMul, 0.85);
      }
    }
  }

  function getSlowFieldMul(x, y) {
    let mul = 1;
    for (const e of effects) {
      if (e.kind === "fieldSlow") {
        const d = Math.hypot(x - e.x, y - e.y);
        if (d <= e.radius) mul = Math.min(mul, e.slow);
      }
    }
    return mul;
  }

  // 传送门防御机制
  let portalDefense = {
    lastHitTime: 0,
    hitCount: 0,
    defenseCooldown: 0,
    spawnQueue: []
  };

  function dealPortal(dmg) {
    portal.hp = Math.max(0, portal.hp - dmg);
    
    // 记录受到攻击的时间
    const currentTime = now;
    if (currentTime - portalDefense.lastHitTime < 2.0) {
      portalDefense.hitCount++;
    } else {
      portalDefense.hitCount = 1;
    }
    portalDefense.lastHitTime = currentTime;
    
    // 当连续受到攻击或累计伤害达到阈值时，生成防御小怪
    if (portalDefense.hitCount >= 3 && portalDefense.defenseCooldown <= 0) {
      spawnPortalDefenders();
      portalDefense.defenseCooldown = 8.0; // 8秒冷却
      portalDefense.hitCount = 0;
    }
    
    if (portal.hp <= 0) {
      portal.hp = 0;
      onDayClear();
    }
  }

  function spawnPortalDefenders() {
    const defenderCount = Math.floor(2 + Math.random() * 3); // 2-4只防御小怪
    for (let i = 0; i < defenderCount; i++) {
      setTimeout(() => {
        const angle = (Math.PI * 2 * i) / defenderCount;
        const spawnRadius = PORTAL.r + 30;
        const x = PORTAL.x + Math.cos(angle) * spawnRadius;
        const y = PORTAL.y + Math.sin(angle) * spawnRadius;
        
        // 生成防御型小怪（优先选择近战类型）
        const defenderType = Math.random() < 0.7 ? "hunter" : "minion";
        monsters.push(new Monster(defenderType, x, y, day));
        puff(x, y, "rgba(255,100,100,0.8)", 8);
      }, i * 200); // 依次生成，间隔200ms
    }
    
    // 视觉效果：传送门发出红光
    sparkle(PORTAL.x, PORTAL.y, "#ff6b6b", 20);
  }

  function spawnShot(x0, y0, x1, y1, kind, target, dmgOverride = null) {
    const dir = norm(x1 - x0, y1 - y0);
    const sp = kind === "bubble" ? 520 : 460;
    // 根据目标类型设置伤害
    let dmgPortal = 1;
    if (target === "portal" && dmgOverride !== null) {
      dmgPortal = dmgOverride;
    } else if (target === "portal") {
      dmgPortal = kind === "spike" ? 2 : 1;
    }
    shots.push({
      kind, // bubble / spike
      target, // role / wall / portal
      x: x0,
      y: y0,
      vx: dir.x * sp,
      vy: dir.y * sp,
      r: kind === "bubble" ? 8 : 7,
      t: 0,
      dmgLife: kind === "bubble" ? 4 : 6,
      dmgWall: kind === "bubble" ? 1 : 2,
      dmgPortal, // 攻击传送门的伤害
      dead: false,
    });
    // muzzle flash
    sparkle(x0, y0, kind === "bubble" ? "#d9f2ff" : "#ffe2da", 6);
  }

  // --------- Spawning / Day Loop ----------
  function setupDay(d) {
    day = d;
    // apply pending modifier into modifiers for this day only
    if (pendingModifier) {
      applyModifier(pendingModifier);
      pendingModifier = null;
    } else {
      resetModifiers();
    }

    maxMana = 10 + modifiers.maxManaBonus;
    manaRegen = 1.35 * modifiers.manaRegenMul;
    mana = Math.min(mana, maxMana);

    wall.maxHp = 52 + modifiers.wallMaxHpBonus;
    wall.hp = clamp(wall.hp, 1, wall.maxHp);

    portal.maxHp = Math.round((120 + day * 18) * modifiers.portalMaxHpMul);
    portal.hp = portal.maxHp;

    // clear objects
    roles = [];
    monsters = [];
    effects = [];
    particles = [];
    spawn.time = 0;
    spawn.done = false;

    const total = 6 + Math.floor(day * 1.3);
    const elite = Math.floor(day / 3);
    const boss = day % 5 === 0 ? 1 : 0;
    const megaboss = (day === 5 || day === 10) ? 1 : 0; // 第5天和第10天出现超大Boss
    
    spawn.remaining = total;
    spawn.eliteRemaining = elite;
    spawn.bossRemaining = boss;
    spawn.megabossRemaining = megaboss;
    spawn.nextAt = 0.5;

    setHint();
    renderCards();
    updateBuildUI(); // 初始化时更新金币显示
    hideOverlay();
  }

  function resetModifiers() {
    modifiers = {
      monsterSpeedMul: 1,
      roleCollisionMul: 1,
      portalMaxHpMul: 1,
      manaRegenMul: 1,
      wallMaxHpBonus: 0,
      maxManaBonus: 0,
    };
  }

  function applyModifier(mod) {
    resetModifiers();
    switch (mod.kind) {
      case "manaRegenUp":
        modifiers.manaRegenMul = 1.25;
        break;
      case "monsterSpeedUp":
        modifiers.monsterSpeedMul = 1.2;
        break;
      case "wallUp":
        modifiers.wallMaxHpBonus = 12;
        break;
      case "portalArmor":
        modifiers.portalMaxHpMul = 1.15;
        break;
      case "roleCollisionUp":
        modifiers.roleCollisionMul = 1.15;
        break;
      case "maxManaUp":
        modifiers.maxManaBonus = 2;
        break;
      default:
        break;
    }
  }

  function rollNextDayModifier() {
    const pool = [
      { kind: "manaRegenUp", text: "Buff：法术回复 +25%" },
      { kind: "wallUp", text: "Buff：城墙最大生命 +12" },
      { kind: "roleCollisionUp", text: "Buff：角色碰撞伤害 +15%" },
      { kind: "maxManaUp", text: "Buff：法术上限 +2" },
      { kind: "portalArmor", text: "Debuff：传送门生命 +15%" },
      { kind: "monsterSpeedUp", text: "Debuff：怪物速度 +20%" },
    ];
    return pick(pool);
  }

  function spawnOne(kind) {
    // kind 是“minion / elite / boss”这类层级，再细分出具体行为型怪物
    let actualKind = kind;
    if (kind === "minion") {
      const r = Math.random();
      if (r < 0.15) actualKind = "ghost";      // 穿透怪
      else if (r < 0.30) actualKind = "hunter"; // 追击怪
      else if (r < 0.45) actualKind = "shooter"; // 远程怪
    } else if (kind === "elite") {
      const r = Math.random();
      if (r < 0.25) actualKind = "hunter";
      else if (r < 0.5) actualKind = "shooter";
    }

    const x = PORTAL.x + rand(-PORTAL.r * 0.55, PORTAL.r * 0.55);
    const y = PORTAL.y + PORTAL.r * 0.35 + rand(-6, 10);
    monsters.push(new Monster(actualKind, x, y, day));
    puff(x, y, "rgba(255,255,255,0.65)", 6);
  }

  function updateSpawns(dt) {
    if (spawn.done) return;
    spawn.time += dt;
    if (spawn.time < spawn.nextAt) return;

    // 控制刷怪节奏：一次只刷1只，间隔更长，避免一次性全出来
    let spawned = false;
    if (spawn.megabossRemaining > 0) {
      spawnOne("megaboss");
      spawn.megabossRemaining--;
      spawned = true;
    } else if (spawn.bossRemaining > 0) {
      spawnOne("boss");
      spawn.bossRemaining--;
      spawned = true;
    } else if (spawn.eliteRemaining > 0 && Math.random() < 0.45) {
      spawnOne("elite");
      spawn.eliteRemaining--;
      spawned = true;
    } else if (spawn.remaining > 0) {
      spawnOne("minion");
      spawn.remaining--;
      spawned = true;
    }

    if (spawn.remaining <= 0 && spawn.eliteRemaining <= 0 && spawn.bossRemaining <= 0 && spawn.megabossRemaining <= 0) {
      spawn.done = true;
      return;
    }
    
    // 根据剩余数量调整间隔：剩余越多，间隔越长（避免一次性涌出）
    const totalRemaining = spawn.remaining + spawn.eliteRemaining + spawn.bossRemaining + spawn.megabossRemaining;
    const baseInterval = 1.2; // 基础间隔
    const maxInterval = 2.5; // 最大间隔
    const interval = baseInterval + (maxInterval - baseInterval) * Math.min(1, totalRemaining / 15);
    spawn.nextAt = spawn.time + rand(interval * 0.8, interval * 1.2);
  }

  // --------- Collisions ----------
  function resolveRoleRole(r1, r2) {
    const dx = r2.x - r1.x;
    const dy = r2.y - r1.y;
    const d = Math.hypot(dx, dy);
    const minD = r1.r + r2.r;
    if (d >= minD || d <= 0.0001) return;
    
    const n = { x: dx / d, y: dy / d };
    const overlap = minD - d;
    
    // separate: 按质量比例分离
    const totalM = r1.m + r2.m;
    r1.x -= n.x * overlap * (r2.m / totalM);
    r1.y -= n.y * overlap * (r2.m / totalM);
    r2.x += n.x * overlap * (r1.m / totalM);
    r2.y += n.y * overlap * (r1.m / totalM);

    // relative velocity along normal
    const rvx = r2.vx - r1.vx;
    const rvy = r2.vy - r1.vy;
    const vn = rvx * n.x + rvy * n.y;
    if (vn > 0) return; // 分离中，不需要处理

    // 弹性碰撞：交换动量
    const e = 0.75; // 稍微弹性一点，更有弹跳感
    const j = (-(1 + e) * vn) / (1 / r1.m + 1 / r2.m);
    
    r1.vx -= (j / r1.m) * n.x;
    r1.vy -= (j / r1.m) * n.y;
    r2.vx += (j / r2.m) * n.x;
    r2.vy += (j / r2.m) * n.y;

    // 轻微阻尼
    r1.vx *= 0.97;
    r1.vy *= 0.97;
    r2.vx *= 0.97;
    r2.vy *= 0.97;

    r1.lastColl = now;
    r2.lastColl = now;

    // 视觉效果：碰撞粒子
    const sp1 = r1.speed();
    const sp2 = r2.speed();
    const avgSp = (sp1 + sp2) * 0.5;
    const midX = (r1.x + r2.x) * 0.5;
    const midY = (r1.y + r2.y) * 0.5;
    
    // 混合两种角色的颜色（简单混合）
    puff(midX, midY, r1.card.color, Math.min(8, Math.floor(avgSp * 0.06)));
    puff(midX, midY, r2.card.color, Math.min(8, Math.floor(avgSp * 0.06)));
    sparkle(midX, midY, "#ffffff", Math.min(6, Math.floor(avgSp * 0.04)));

    // 高速碰撞时，会互相加速消耗寿命（模拟"碰撞磨损"）
    if (avgSp > 180) {
      const wear = Math.min(avgSp * 0.012, 3.5);
      r1.life -= wear;
      r2.life -= wear;
      if (r1.life <= 0) r1.dead = true;
      if (r2.life <= 0) r2.dead = true;
    }
  }

  function resolveRoleMonster(role, m) {
    // 穿透怪：直接无视角色碰撞
    if (m.kind === "ghost") return;
    const dx = m.x - role.x;
    const dy = m.y - role.y;
    const d = Math.hypot(dx, dy);
    const minD = role.r + m.r;
    if (d >= minD || d <= 0.0001) return;
    const n = { x: dx / d, y: dy / d };
    const overlap = minD - d;
    // separate
    const totalM = role.m + 1.0;
    role.x -= n.x * overlap * (1.0 / totalM);
    role.y -= n.y * overlap * (1.0 / totalM);
    m.x += n.x * overlap * (role.m / totalM);
    m.y += n.y * overlap * (role.m / totalM);

    // relative velocity along normal
    const rvx = m.vx - role.vx;
    const rvy = m.vy - role.vy;
    const vn = rvx * n.x + rvy * n.y;
    if (vn > 0) return;

    const e = 0.72; // restitution
    const j = (-(1 + e) * vn) / (1 / role.m + 1 / 1.0);
    role.vx -= (j / role.m) * n.x;
    role.vy -= (j / role.m) * n.y;
    m.vx += (j / 1.0) * n.x;
    // m.vy is driven by AI; only a tiny push is ok

    role.vx *= 0.96;
    role.vy *= 0.96;

    role.lastColl = now;

    // collision damage (always some)
    const sp = Math.min(260, role.speed());
    const base = 7 + role.m * 5;
    const dmg = (base + sp * 0.05) * modifiers.roleCollisionMul;
    m.takeDamage(dmg);
    showDamageNumber((role.x + m.x) / 2, (role.y + m.y) / 2, dmg, "normal");
    puff((role.x + m.x) / 2, (role.y + m.y) / 2, "rgba(255,255,255,0.55)", 8);

    // 斩杀怪：顺便大量削减角色生命，优先清理角色
    if (m.kind === "hunter") {
      role.life -= 6;
      if (role.life <= 0) {
        role.dead = true;
        sparkle(role.x, role.y, role.card.color, 10);
      }
    }
  }

  // --------- Spells ----------
  function castSpell(card, at) {
    const spell = card.spell;
    if (!spell) return;
    if (spell.kind === "fieldSlow") {
      effects.push({
        kind: "fieldSlow",
        x: at.x,
        y: at.y,
        t: 0,
        dur: spell.duration,
        radius: spell.radius,
        slow: spell.slow,
        color: "rgba(110,240,225,0.45)",
      });
      sparkle(at.x, at.y, "#c8fff8", 18);
    } else if (spell.kind === "burst") {
      effects.push({
        kind: "burst",
        x: at.x,
        y: at.y,
        t: 0,
        dur: 0.22,
        radius: spell.radius,
        color: "rgba(255,140,100,0.55)",
      });
      hitMonstersInRadius(at.x, at.y, spell.radius, spell.dmg, spell.knock);
      sparkle(at.x, at.y, "#ffd8c8", 22);
    } else if (spell.kind === "healWall") {
      wall.hp = clamp(wall.hp + spell.heal, 0, wall.maxHp);
      showDamageNumber(SLING.x, SLING.y, spell.heal, "heal");
      sparkle(SLING.x, SLING.y + 18, "#c9ffd9", 18);
      effects.push({ kind: "text", x: SLING.x, y: SLING.y - 20, t: 0, dur: 0.8, text: `+${spell.heal}`, color: "#25b45b" });
    } else if (spell.kind === "chargeMana") {
      mana = clamp(mana + spell.gain, 0, maxMana);
      effects.push({ kind: "buff", t: 0, dur: spell.duration, regenBonus: spell.regenBonus });
      sparkle(SLING.x, SLING.y - 20, "#cfe6ff", 18);
    }
  }

  function bonusManaRegen() {
    let bonus = 0;
    for (const e of effects) {
      if (e.kind === "buff") bonus += e.regenBonus;
    }
    return bonus;
  }

  function updateEffects(dt) {
    for (const e of effects) e.t += dt;
    effects = effects.filter((e) => e.t < (e.dur ?? 0.2));
  }

  function renderCards() {
    cardsEl.innerHTML = "";
    
    // 获取当前可用的8张卡牌
    const availableCards = getAvailableCards();
    
    // 按每行2张卡牌排列
    const cardsPerRow = 2;
    const rows = [];
    
    for (let i = 0; i < availableCards.length; i += cardsPerRow) {
      rows.push(availableCards.slice(i, i + cardsPerRow));
    }
    
    rows.forEach((row) => {
      const rowEl = document.createElement("div");
      rowEl.className = "card-row";
      
      row.forEach((card) => {
        const el = document.createElement("div");
        el.className = "card";
        el.dataset.cardId = card.id;
        el.classList.toggle("selected", card.id === selectedCardId);
        el.classList.toggle("disabled", card.cost > mana);
        
        const isSpell = card.type === "spell";
        const color = isSpell ? card.color : card.color;
        
        el.innerHTML = `
          <div class="topline">
            <div class="type">${isSpell ? "法术" : "角色"}</div>
            <div class="cost">${card.cost}</div>
          </div>
          <div class="name">${card.name}</div>
          <div class="desc">${card.desc}</div>
        `;
        
        el.style.borderColor = withAlpha(color, 0.6);
        el.addEventListener("click", () => {
          if (pausedOverlay) return;
          if (card.cost > mana) {
            flashHint("法术不够噢～先等等回复。");
            return;
          }
          selectedCardId = selectedCardId === card.id ? null : card.id;
          setHint();
          syncCardStyles();
        });
        rowEl.appendChild(el);
      });
      
      cardsEl.appendChild(rowEl);
    });
  }

  function getAvailableCards() {
    // 固定8张卡牌池，根据天数轮换
    const baseCards = [
      CARDS[0], // knight
      CARDS[1], // archer  
      CARDS[2], // mage
      CARDS[3], // shield
      CARDS[4], // ice
      CARDS[5], // fire
      CARDS[6], // heal
      CARDS[7]  // charge
    ];
    
    // 根据天数添加新卡牌
    if (day >= 2) {
      baseCards.push(CARDS[8]); // hellfire
    }
    
    // 如果超过8张，移除最早的
    if (baseCards.length > 8) {
      baseCards.splice(0, baseCards.length - 8);
    }
    
    return baseCards;
  }

  function syncCardStyles() {
    for (const el of cardsEl.querySelectorAll(".card")) {
      const id = el.dataset.cardId;
      const card = CARDS.find((c) => c.id === id);
      el.classList.toggle("selected", id === selectedCardId);
      el.classList.toggle("disabled", !!card && card.cost > mana);
    }
  }

  let hintFlash = 0;
  function flashHint(text) {
    hudHint.textContent = text;
    hintFlash = 1.2;
  }

  function setHint() {
    const card = CARDS.find((c) => c.id === selectedCardId);
    if (!card) {
      hudHint.textContent = "选择卡牌：角色卡在弹弓发射；法术卡点击场地施放。";
      return;
    }
    if (card.type === "role") {
      hudHint.textContent = `已选择【${card.name}】— 在弹弓上拖拽并松手发射（耗 ${card.cost}）。`;
    } else if (card.target === "arena") {
      hudHint.textContent = `已选择【${card.name}】— 点击场地任意位置施放（耗 ${card.cost}）。`;
    } else {
      hudHint.textContent = `已选择【${card.name}】— 点击卡牌立刻释放（耗 ${card.cost}）。`;
    }
  }

  // --------- Overlay ----------
  function showOverlay(title, desc, btnText) {
    pausedOverlay = true;
    overlayTitle.textContent = title;
    overlayDesc.textContent = desc;
    overlayBtn.textContent = btnText;
    overlayEl.classList.remove("hidden");
  }
  function hideOverlay() {
    pausedOverlay = false;
    overlayEl.classList.add("hidden");
  }

  function onDayClear() {
    if (pausedOverlay) return;
    
    // 保存当前进度
    saveProgress();
    
    // 更新最高天数
    if (day > gameProgress.bestDay) {
      gameProgress.bestDay = day;
    }
    
    // 每3天显示奖励选择
    if (day % 3 === 0) {
      rewardSystem.rewardCards = generateRewardCards();
      rewardSystem.showReward = true;
      showRewardSelection();
      return;
    }
    
    pendingModifier = rollNextDayModifier();
    showOverlay(
      `第 ${day} 天胜利！`,
      `传送门已清空。\n\n下一天随机效果：\n- ${pendingModifier.text}\n\n提示：怪物碰到城墙会扣血，城墙清零则失败。`,
      "进入下一天"
    );
  }

  function showRewardSelection() {
    overlayTitle.textContent = `第 ${day} 天完成！选择一张奖励卡牌`;
    
    let rewardHTML = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">';
    
    for (const card of rewardSystem.rewardCards) {
      const rarityColors = {
        common: "#888888",
        uncommon: "#0066cc", 
        rare: "#9966cc",
        epic: "#ff6600"
      };
      
      const rarityNames = {
        common: "普通",
        uncommon: "稀有",
        rare: "史诗",
        epic: "传说"
      };
      
      rewardHTML += `
        <div class="reward-card" data-reward-id="${card.rewardId}" style="
          border: 2px solid ${rarityColors[card.rarity]};
          border-radius: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.9);
          cursor: pointer;
          transition: transform 0.2s;
        ">
          <div style="font-weight: bold; color: ${rarityColors[card.rarity]}; margin-bottom: 4px;">
            ${rarityNames[card.rarity]} - ${card.name}
          </div>
          <div style="font-size: 12px; color: #666;">
            ${card.desc || card.effect || '获得此卡牌'}
          </div>
        </div>
      `;
    }
    
    rewardHTML += '</div>';
    overlayDesc.innerHTML = rewardHTML;
    overlayBtn.textContent = "暂不选择";
    overlayBtn.style.display = "none";
    
    // 添加点击事件
    document.querySelectorAll('.reward-card').forEach(cardEl => {
      cardEl.addEventListener('click', (e) => {
        const rewardId = parseInt(e.currentTarget.dataset.rewardId);
        const selectedCard = rewardSystem.rewardCards.find(c => c.rewardId === rewardId);
        applyReward(selectedCard);
      });
    });
    
    overlayEl.classList.remove("hidden");
  }

  function applyReward(card) {
    if (card.type === "item") {
      // 立即使用道具效果
      if (card.id === "potion_health") {
        wall.hp = Math.min(wall.maxHp, wall.hp + 20);
        showDamageNumber(WORLD.w / 2, WORLD.h - WALL_H / 2, 20, "heal");
        sparkle(WORLD.w / 2, WORLD.h - WALL_H / 2, "#7dff9a", 15);
      } else if (card.id === "potion_mana") {
        mana = Math.min(maxMana, mana + 5);
      } else if (card.id === "bomb") {
        // 对所有怪物造成伤害
        for (const monster of monsters) {
          monster.takeDamage(30);
          showDamageNumber(monster.x, monster.y, 30, "crit");
        }
        sparkle(WORLD.w / 2, WORLD.h / 2, "#ff8a5b", 25);
      } else if (card.id === "time_freeze") {
        // 冻结所有怪物
        for (const monster of monsters) {
          monster.frozen = true;
          monster.frozenTimer = 5;
        }
      }
    }
    
    // 显示获得奖励的提示，然后继续游戏
    rewardSystem.showReward = false;
    pendingModifier = rollNextDayModifier();
    
    // 直接进入下一天，不显示额外的overlay
    setupDay(day + 1);
  }

  function onGameOver() {
    if (pausedOverlay) return;
    
    // 保存当前进度
    saveProgress();
    
    // 计算游戏奖励
    const rewards = calculateGameRewards();
    gameProgress.coins += rewards.coins;
    
    // 更新最高天数
    if (day > gameProgress.bestDay) {
      gameProgress.bestDay = day;
    }
    
    saveProgress();
    
    showOverlay(
      "城墙被突破了…",
      `你坚持到了第 ${day} 天。\n\n获得奖励：${rewards.coins} 金币\n总击杀：${rewards.kills}\n\n点按钮重新开始（从第 1 天）。`,
      "重新开始"
    );
  }

  overlayBtn.addEventListener("click", () => {
    if (overlayTitle.textContent.includes("重新开始") || overlayTitle.textContent.includes("突破")) {
      // 重新开始：新建一个存档
      const name = prompt("请输入新存档的名称：", `${gameProgress.saveName}_重试`);
      if (name) {
        // 找空槽位或覆盖当前槽位
        let targetSlot = gameProgress.saveSlot;
        for (let i = 1; i <= 3; i++) {
          if (!saveSlots[i]) {
            targetSlot = i;
            break;
          }
        }
        createNewSave(targetSlot, name);
      }
      return;
    }
    
    if (rewardSystem.showReward) {
      // 如果正在显示奖励，跳过奖励选择
      rewardSystem.showReward = false;
      pendingModifier = rollNextDayModifier();
      showOverlay(
        `第 ${day} 天胜利！`,
        `传送门已清空。\n\n下一天随机效果：\n- ${pendingModifier.text}\n\n提示：怪物碰到城墙会扣血，城墙清零则失败。`,
        "进入下一天"
      );
      return;
    }
    
    setupDay(day + 1);
  });

  // 建设界面事件监听器
  gachaBtn.addEventListener("click", performGacha);
  backToGameBtn.addEventListener("click", hideBuildOverlay);
  
  // 游戏界面事件监听器
  gameGachaBtn.addEventListener("click", () => {
    performGacha();
  });
  createNewSaveBtn.addEventListener("click", () => {
    const name = newSaveNameEl.value.trim();
    if (name) {
      // 找一个空槽位
      for (let i = 1; i <= 3; i++) {
        if (!saveSlots[i]) {
          createNewSave(i, name);
          updateBuildUI();
          newSaveNameEl.value = '';
          return;
        }
      }
      alert('没有空槽位了！请先删除一个存档。');
    } else {
      alert('请输入存档名称！');
    }
  });

  // 添加键盘快捷键支持
  document.addEventListener("keydown", (e) => {
    if (e.key === "b" || e.key === "B") {
      if (!overlayEl.classList.contains("hidden")) return;
      if (buildOverlayEl.classList.contains("hidden")) {
        showBuildOverlay();
      } else {
        hideBuildOverlay();
      }
    }
  });

  // 初始化游戏
  updateSaveSlots();
  loadProgress();

  // --------- Input ----------
  let aiming = {
    active: false,
    start: { x: 0, y: 0 },
    pos: { x: 0, y: 0 },
  };

  function tryConsumeMana(cost) {
    if (mana + 1e-6 < cost) return false;
    mana -= cost;
    return true;
  }

  canvas.addEventListener("pointerdown", (ev) => {
    if (pausedOverlay) return;
    canvas.setPointerCapture(ev.pointerId);
    const p = screenToWorld(ev.clientX, ev.clientY);
    const card = CARDS.find((c) => c.id === selectedCardId);
    if (!card) return;

    if (card.type === "role") {
      if (pointInCircle(p.x, p.y, SLING.x, SLING.y, SLING.r + 26)) {
        aiming.active = true;
        aiming.start = { x: SLING.x, y: SLING.y };
        aiming.pos = { x: p.x, y: p.y };
      } else {
        flashHint("要在弹弓附近开始拖拽发射噢。");
      }
    } else if (card.type === "spell") {
      if (card.target === "instant") {
        if (!tryConsumeMana(card.cost)) return;
        castSpell(card, { x: WORLD.w / 2, y: WORLD.h / 2 });
        selectedCardId = null;
        setHint();
        syncCardStyles();
      } else if (card.target === "arena") {
        if (!inArena(p.x, p.y)) {
          flashHint("这个法术需要点在场地矩形里。");
          return;
        }
        if (!tryConsumeMana(card.cost)) return;
        castSpell(card, p);
        selectedCardId = null;
        setHint();
        syncCardStyles();
      }
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    if (!aiming.active) return;
    const p = screenToWorld(ev.clientX, ev.clientY);
    aiming.pos = { x: p.x, y: p.y };
  });

  canvas.addEventListener("pointerup", (ev) => {
    if (!aiming.active) return;
    aiming.active = false;
    const card = CARDS.find((c) => c.id === selectedCardId);
    if (!card) return;
    if (!tryConsumeMana(card.cost)) {
      flashHint("法术不够噢～");
      return;
    }
    const pull = { x: aiming.start.x - aiming.pos.x, y: aiming.start.y - aiming.pos.y };
    const n = norm(pull.x, pull.y);
    const power = clamp(n.l, 0, 140);
    const baseSpeed = 6.4 * power + 220;
    const speed = baseSpeed * (card.launchSpeedMul ?? 1.0); // 使用卡牌的发射速度系数
    const vx = n.x * speed;
    const vy = n.y * speed;
    const x = clamp(SLING.x + n.x * 12, ARENA.l + card.radius, ARENA.r - card.radius);
    const y = clamp(SLING.y + n.y * 12, ARENA.t + card.radius, ARENA.b - card.radius);
    roles.push(new Role(card, x, y, vx, vy));
    sparkle(SLING.x, SLING.y, "#ffffff", 10);
    selectedCardId = null;
    setHint();
    syncCardStyles();
  });

  // --------- Update / Draw ----------
  function update(dt) {
    // mana
    mana = clamp(mana + (manaRegen + bonusManaRegen()) * dt, 0, maxMana);

    // 更新传送门防御冷却
    if (portalDefense.defenseCooldown > 0) {
      portalDefense.defenseCooldown -= dt;
    }

    // spawns
    updateSpawns(dt);

    // roles
    for (const r of roles) r.update(dt);
    roles = roles.filter((r) => !r.dead);

    // monsters
    for (const m of monsters) m.update(dt);

    // shots (projectiles)
    for (const s of shots) {
      s.t += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      // small trail
      if (Math.random() < 0.35) {
        particles.push({
          x: s.x,
          y: s.y,
          vx: rand(-30, 30),
          vy: rand(-30, 30),
          r: rand(1.5, 3.2),
          t: 0,
          dur: rand(0.18, 0.35),
          color: s.kind === "bubble" ? "rgba(140,220,255,0.85)" : "rgba(255,160,130,0.85)",
        });
      }

      // hit roles
      if (s.target === "role") {
        for (const r of roles) {
          const d = Math.hypot(r.x - s.x, r.y - s.y);
          if (d <= r.r + s.r) {
            r.life -= s.dmgLife;
            if (r.life <= 0) r.dead = true;
            sparkle(r.x, r.y, "#e1f5ff", 8);
            s.dead = true;
            break;
          }
        }
      } else if (s.target === "wall") {
        const wallY = WORLD.h - WALL_H + 10;
        if (s.y >= wallY) {
          wall.hp = Math.max(0, wall.hp - s.dmgWall);
          sparkle(s.x, wallY - 8, "#ffe3e3", 8);
          s.dead = true;
        }
      } else if (s.target === "portal") {
        // 攻击传送门
        const dx = s.x - PORTAL.x;
        const dy = s.y - PORTAL.y;
        const d = Math.hypot(dx, dy);
        if (d <= PORTAL.r + s.r) {
          dealPortal(s.dmgPortal);
          sparkle(PORTAL.x, PORTAL.y + PORTAL.r * 0.15, "#ffd1ef", 10);
          s.dead = true;
        }
      }

      // timeout / out of bounds
      if (s.t > 3.0 || s.x < ARENA.l - 80 || s.x > ARENA.r + 80 || s.y < ARENA.t - 160 || s.y > WORLD.h + 80) {
        s.dead = true;
      }
    }
    shots = shots.filter((s) => !s.dead);

    // collisions role<->role (角色之间碰撞)
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        resolveRoleRole(roles[i], roles[j]);
      }
    }

    // collisions role<->monster
    for (const r of roles) {
      if (r.stopped && r.stopTimer > 18) continue; // very old role, ignore
      for (const m of monsters) {
        if (m.hp <= 0) continue;
        resolveRoleMonster(r, m);
      }
    }

    // monsters reaching wall (只有ghost会直接撞城墙)
    const wallY = WORLD.h - WALL_H + 18;
    for (const m of monsters) {
      if (m.hp <= 0) continue;
      if (m.kind === "ghost" && m.y + m.r >= wallY) {
        // 幽灵撞城墙
        const dmg = 3;
        wall.hp = Math.max(0, wall.hp - dmg);
        sparkle(m.x, wallY - 10, "#ffe3e3", 12);
        m.hp = 0;
      }
    }
    monsters = monsters.filter((m) => m.hp > 0);

    // fail
    if (wall.hp <= 0) onGameOver();

    updateEffects(dt);
    updateParticles(dt);
    updateDamageNumbers(dt);

    // hint flash decay
    if (hintFlash > 0) {
      hintFlash -= dt;
      if (hintFlash <= 0) setHint();
    }
  }

  function draw() {
    // clear full screen
    ctx.fillStyle = "#f8fbff";
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.scale, view.scale);

    drawBackground(ctx);
    drawArena(ctx);
    drawPortal(ctx);
    drawWallAndSlingshot(ctx);

    // effects under entities
    drawEffects(ctx);

    drawShots(ctx);

    for (const m of monsters) m.draw(ctx);
    for (const r of roles) r.draw(ctx);

    drawParticles(ctx);
    drawDamageNumbers(ctx);
    drawAim(ctx);
    drawTopFog(ctx);

    ctx.restore();
  }

  function drawShots(g) {
    for (const s of shots) {
      g.save();
      g.translate(s.x, s.y);
      const a = 1 - clamp(s.t / 1.6, 0, 1) * 0.15;
      g.globalAlpha = a;

      if (s.kind === "bubble") {
        // 蓝色泡泡弹：圆 + 高光
        const grd = g.createRadialGradient(-s.r * 0.35, -s.r * 0.35, 1, 0, 0, s.r);
        grd.addColorStop(0, "rgba(255,255,255,0.95)");
        grd.addColorStop(0.25, "rgba(140,220,255,0.95)");
        grd.addColorStop(1, "rgba(70,160,255,0.85)");
        g.fillStyle = grd;
        g.strokeStyle = "rgba(0,0,0,0.10)";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, s.r, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.fillStyle = "rgba(255,255,255,0.85)";
        g.beginPath();
        g.arc(-s.r * 0.25, -s.r * 0.25, s.r * 0.32, 0, Math.PI * 2);
        g.fill();
      } else {
        // 红色刺弹：小胶囊 + 两个尖角
        g.fillStyle = "rgba(255,150,130,0.95)";
        g.strokeStyle = "rgba(0,0,0,0.12)";
        g.lineWidth = 2;
        g.beginPath();
        g.roundRect(-s.r * 1.1, -s.r * 0.7, s.r * 2.2, s.r * 1.4, 6);
        g.fill();
        g.stroke();
        g.fillStyle = "rgba(255,90,90,0.85)";
        g.beginPath();
        g.moveTo(-s.r * 1.05, 0);
        g.lineTo(-s.r * 1.55, -s.r * 0.25);
        g.lineTo(-s.r * 1.55, s.r * 0.25);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(s.r * 1.05, 0);
        g.lineTo(s.r * 1.55, -s.r * 0.25);
        g.lineTo(s.r * 1.55, s.r * 0.25);
        g.closePath();
        g.fill();
      }

      g.restore();
    }
  }

  function drawBackground(g) {
    // candy clouds
    for (let i = 0; i < 8; i++) {
      const x = (i * 97 + (day * 33) % 50) % (WORLD.w + 140) - 70;
      const y = 52 + (i % 3) * 38 + Math.sin((now * 0.35 + i) * 0.7) * 6;
      const w = 150 + (i % 3) * 40;
      g.fillStyle = "rgba(255,255,255,0.65)";
      g.beginPath();
      g.ellipse(x, y, w * 0.45, 22, 0, 0, Math.PI * 2);
      g.ellipse(x + 38, y - 10, w * 0.34, 18, 0, 0, Math.PI * 2);
      g.ellipse(x - 32, y - 6, w * 0.26, 16, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawArena(g) {
    // outer glow
    g.fillStyle = "rgba(255,120,184,0.08)";
    g.fillRect(ARENA.l - 10, ARENA.t - 10, (ARENA.r - ARENA.l) + 20, (ARENA.b - ARENA.t) + 20);

    // arena base
    const grd = g.createLinearGradient(0, ARENA.t, 0, ARENA.b);
    grd.addColorStop(0, "rgba(255,255,255,0.82)");
    grd.addColorStop(1, "rgba(255,255,255,0.62)");
    g.fillStyle = grd;
    g.strokeStyle = "rgba(0,0,0,0.10)";
    g.lineWidth = 4;
    g.beginPath();
    g.roundRect(ARENA.l, ARENA.t, ARENA.r - ARENA.l, ARENA.b - ARENA.t, 22);
    g.fill();
    g.stroke();
  }

  function drawPortal(g) {
    // portal body
    const glow = g.createRadialGradient(PORTAL.x, PORTAL.y, 10, PORTAL.x, PORTAL.y, PORTAL.r * 1.4);
    glow.addColorStop(0, "rgba(255,90,165,0.22)");
    glow.addColorStop(1, "rgba(255,90,165,0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(PORTAL.x, PORTAL.y, PORTAL.r * 1.4, 0, Math.PI * 2);
    g.fill();

    const ring = g.createRadialGradient(PORTAL.x - 18, PORTAL.y - 18, 6, PORTAL.x, PORTAL.y, PORTAL.r);
    ring.addColorStop(0, "#fff");
    ring.addColorStop(0.2, "#ff76b6");
    ring.addColorStop(1, "#b347ff");
    g.fillStyle = ring;
    g.strokeStyle = "rgba(0,0,0,0.12)";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(PORTAL.x, PORTAL.y, PORTAL.r, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    // portal mouth
    g.fillStyle = "rgba(20,10,35,0.75)";
    g.beginPath();
    g.ellipse(PORTAL.x, PORTAL.y + 10, PORTAL.r * 0.55, PORTAL.r * 0.40, 0, 0, Math.PI * 2);
    g.fill();

    // hp bar
    const w = 220;
    const h = 10;
    const p = portal.hp / portal.maxHp;
    g.fillStyle = "rgba(0,0,0,0.14)";
    g.fillRect(PORTAL.x - w / 2, ARENA.t - 24, w, h);
    g.fillStyle = "rgba(255,90,165,0.90)";
    g.fillRect(PORTAL.x - w / 2, ARENA.t - 24, w * p, h);
  }

  function drawWallAndSlingshot(g) {
    const y = WORLD.h - WALL_H;
    // wall
    const grd = g.createLinearGradient(0, y, 0, y + WALL_H);
    grd.addColorStop(0, "rgba(255,220,245,0.92)");
    grd.addColorStop(1, "rgba(255,255,255,0.92)");
    g.fillStyle = grd;
    g.strokeStyle = "rgba(0,0,0,0.10)";
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(20, y, WORLD.w - 40, WALL_H + 18, 26);
    g.fill();
    g.stroke();

    // wall hp bar
    const w = 250;
    const h = 10;
    const p = wall.hp / wall.maxHp;
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(WORLD.w / 2 - w / 2, y + 18, w, h);
    g.fillStyle = "rgba(70,210,130,0.90)";
    g.fillRect(WORLD.w / 2 - w / 2, y + 18, w * p, h);

    // slingshot
    const baseY = SLING.y + 18;
    g.fillStyle = "rgba(0,0,0,0.10)";
    g.beginPath();
    g.ellipse(SLING.x + 5, baseY + 10, 48, 18, 0, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = "rgba(0,0,0,0.14)";
    g.lineWidth = 6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(SLING.x - 26, baseY);
    g.quadraticCurveTo(SLING.x - 34, SLING.y - 20, SLING.x - 12, SLING.y - 46);
    g.moveTo(SLING.x + 26, baseY);
    g.quadraticCurveTo(SLING.x + 34, SLING.y - 20, SLING.x + 12, SLING.y - 46);
    g.stroke();

    // sling band
    g.strokeStyle = "rgba(255,90,165,0.45)";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(SLING.x - 12, SLING.y - 46);
    g.lineTo(SLING.x + 12, SLING.y - 46);
    g.stroke();

    // interactive ring
    g.strokeStyle = "rgba(255,90,165,0.22)";
    g.lineWidth = 6;
    g.beginPath();
    g.arc(SLING.x, SLING.y, SLING.r, 0, Math.PI * 2);
    g.stroke();
  }

  function drawAim(g) {
    if (!aiming.active) return;
    const card = CARDS.find((c) => c.id === selectedCardId);
    const dx = aiming.pos.x - aiming.start.x;
    const dy = aiming.pos.y - aiming.start.y;
    const pull = clamp(Math.hypot(dx, dy), 0, 140);
    const t = pull / 140;
    const end = { x: aiming.pos.x, y: aiming.pos.y };
    const bandA = { x: SLING.x - 12, y: SLING.y - 46 };
    const bandB = { x: SLING.x + 12, y: SLING.y - 46 };

    g.strokeStyle = `rgba(255,90,165,${0.25 + 0.55 * t})`;
    g.lineWidth = 6;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(bandA.x, bandA.y);
    g.lineTo(end.x, end.y);
    g.lineTo(bandB.x, bandB.y);
    g.stroke();

    // predicted tiny dots - 使用卡牌的物理参数
    const n = norm(aiming.start.x - aiming.pos.x, aiming.start.y - aiming.pos.y);
    const baseSpeed = 6.4 * pull + 220;
    const speed = baseSpeed * (card?.launchSpeedMul ?? 1.0);
    const drag = card?.drag ?? 2.35;
    let x = SLING.x + n.x * 12;
    let y = SLING.y + n.y * 12;
    let vx = n.x * speed;
    let vy = n.y * speed;
    g.fillStyle = "rgba(80,80,90,0.20)";
    for (let i = 0; i < 14; i++) {
      const dt = 0.06;
      const dragFactor = Math.exp(-drag * dt);
      vx *= dragFactor;
      vy *= dragFactor;
      x += vx * dt;
      y += vy * dt;
      // bounce preview
      if (x < ARENA.l + 10 || x > ARENA.r - 10) vx *= -0.84;
      if (y < ARENA.t + 10 || y > ARENA.b - 10) vy *= -0.84;
      g.beginPath();
      g.arc(x, y, 4 - i * 0.12, 0, Math.PI * 2);
      g.fill();
    }
  }

  function drawEffects(g) {
    for (const e of effects) {
      if (e.kind === "ring") {
        const p = clamp(e.t / e.dur, 0, 1);
        const r = e.r0 + (e.r1 - e.r0) * p;
        g.strokeStyle = withAlpha(e.color, 0.55 * (1 - p));
        g.lineWidth = 10 * (1 - p);
        g.beginPath();
        g.arc(e.x, e.y, r, 0, Math.PI * 2);
        g.stroke();
      } else if (e.kind === "pulse") {
        const p = clamp(e.t / e.dur, 0, 1);
        g.strokeStyle = withAlpha(e.color, 0.55 * (1 - p));
        g.lineWidth = 8 * (1 - p);
        g.beginPath();
        g.arc(e.x, e.y, e.r * (0.55 + 0.45 * p), 0, Math.PI * 2);
        g.stroke();
      } else if (e.kind === "line") {
        const p = clamp(e.t / e.dur, 0, 1);
        g.strokeStyle = withAlpha(e.color, 0.85 * (1 - p));
        g.lineWidth = 6;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(e.x0, e.y0);
        g.lineTo(e.x1, e.y1);
        g.stroke();
      } else if (e.kind === "fieldSlow") {
        const p = clamp(e.t / e.dur, 0, 1);
        const a = 0.38 * (1 - p * 0.25);
        g.fillStyle = withAlpha(e.color, a);
        g.beginPath();
        g.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = withAlpha("#49f2df", 0.35);
        g.lineWidth = 4;
        g.beginPath();
        g.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        g.stroke();
      } else if (e.kind === "burst") {
        const p = clamp(e.t / e.dur, 0, 1);
        g.fillStyle = withAlpha(e.color, 0.55 * (1 - p));
        g.beginPath();
        g.arc(e.x, e.y, e.radius * p, 0, Math.PI * 2);
        g.fill();
      } else if (e.kind === "text") {
        const p = clamp(e.t / e.dur, 0, 1);
        g.fillStyle = withAlpha(e.color, 1 - p);
        g.font = "900 18px ui-sans-serif, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText(e.text, e.x, e.y - p * 26);
      }
    }
  }

  function drawTopFog(g) {
    // slight vignette
    const grd = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, 200, WORLD.w / 2, WORLD.h / 2, 900);
    grd.addColorStop(0, "rgba(255,255,255,0)");
    grd.addColorStop(1, "rgba(255,90,165,0.08)");
    g.fillStyle = grd;
    g.fillRect(0, 0, WORLD.w, WORLD.h);
  }

  function updateHud() {
    hudDay.textContent = `Day ${day}`;
    hudMana.textContent = `Mana ${Math.floor(mana * 10) / 10}/${maxMana}`;
    hudPortal.textContent = `Portal ${Math.ceil(portal.hp)}/${portal.maxHp}`;
    hudWall.textContent = `Wall ${Math.ceil(wall.hp)}/${wall.maxHp}`;
    syncCardStyles();
  }

  function loop(ts) {
    requestAnimationFrame(loop);
    const t = ts / 1000;
    const dt = clamp(t - lastTs, 0, 1 / 20);
    lastTs = t;
    now = t;
    if (!pausedOverlay) update(dt);
    draw();
    updateHud();
  }

  // ---- Startup ----
  window.addEventListener("resize", resize);
  resize();

  // polyfill for roundRect in older browsers
  if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
      const rr = Array.isArray(r) ? r : [r, r, r, r];
      const [r1, r2, r3, r4] = rr.map((v) => Math.min(v, Math.min(w, h) / 2));
      this.moveTo(x + r1, y);
      this.arcTo(x + w, y, x + w, y + h, r2);
      this.arcTo(x + w, y + h, x, y + h, r3);
      this.arcTo(x, y + h, x, y, r4);
      this.arcTo(x, y, x + w, y, r1);
      this.closePath();
      return this;
    };
  }

  setupDay(1);
  requestAnimationFrame(loop);
})();

