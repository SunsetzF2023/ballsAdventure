import { GAME_BALANCE } from './config.js';

// 游戏状态
export let gameState = {
  now: 0,
  lastTs: 0,
  pausedOverlay: false,
  
  day: 1,
  selectedCardId: null,
  mana: GAME_BALANCE.initialMana,
  maxMana: GAME_BALANCE.maxMana,
  manaRegen: GAME_BALANCE.manaRegen,
  
  wall: { hp: GAME_BALANCE.wallHp, maxHp: GAME_BALANCE.wallMaxHp },
  portal: { hp: GAME_BALANCE.portalHp, maxHp: GAME_BALANCE.portalMaxHp },
  
  roles: [],
  monsters: [],
  shots: [],
  effects: [],
  particles: [],
  damageNumbers: [],
  
  spawn: {
    time: 0,
    nextAt: 0,
    remaining: 0,
    eliteRemaining: 0,
    bossRemaining: 0,
    megabossRemaining: 0,
    done: false,
  },
  
  rewardSystem: {
    showReward: false,
    rewardCards: [],
    selectedReward: null
  },
  
  gameProgress: {
    coins: 0,
    bestDay: 1,
    totalKills: 0,
    cardCollection: {},
    cardLevels: {},
    currentDay: 1,
    saveName: "默认存档",
    saveTime: null,
    saveSlot: 1
  },
  
  saveSlots: {
    1: null,
    2: null,
    3: null
  },
  
  modifiers: {
    monsterSpeedMul: 1,
    roleCollisionMul: 1,
    portalMaxHpMul: 1,
    manaRegenMul: 1,
    wallMaxHpBonus: 0,
    maxManaBonus: 0,
  },
  pendingModifier: null,
};

// 存档管理
export function getSaveKey(slot) {
  return `slingshotProgress_slot${slot}`;
}

export function loadProgress(slot = null) {
  const loadSlot = slot || gameState.gameProgress.saveSlot;
  const saveKey = getSaveKey(loadSlot);
  const saved = localStorage.getItem(saveKey);
  
  if (saved) {
    try {
      const data = JSON.parse(saved);
      gameState.gameProgress = { ...gameState.gameProgress, ...data };
      gameState.gameProgress.saveSlot = loadSlot;
      console.log(`Loaded save from slot ${loadSlot}: ${gameState.gameProgress.saveName}`);
    } catch (e) {
      console.log('Failed to load progress, using default');
    }
  }
  
  updateSaveSlots();
}

export function saveProgress() {
  const saveKey = getSaveKey(gameState.gameProgress.saveSlot);
  gameState.gameProgress.saveTime = new Date().toISOString();
  
  const saveData = {
    coins: gameState.gameProgress.coins,
    bestDay: gameState.gameProgress.bestDay,
    totalKills: gameState.gameProgress.totalKills,
    cardCollection: gameState.gameProgress.cardCollection,
    cardLevels: gameState.gameProgress.cardLevels,
    currentDay: gameState.day,
    saveName: gameState.gameProgress.saveName,
    saveTime: gameState.gameProgress.saveTime
  };
  
  localStorage.setItem(saveKey, JSON.stringify(saveData));
  updateSaveSlots();
  console.log(`Saved to slot ${gameState.gameProgress.saveSlot}: ${gameState.gameProgress.saveName}`);
}

export function updateSaveSlots() {
  for (let i = 1; i <= 3; i++) {
    const saveKey = getSaveKey(i);
    const saved = localStorage.getItem(saveKey);
    if (saved) {
      try {
        gameState.saveSlots[i] = JSON.parse(saved);
      } catch (e) {
        gameState.saveSlots[i] = null;
      }
    } else {
      gameState.saveSlots[i] = null;
    }
  }
}

export function createNewSave(slot, name) {
  gameState.gameProgress = {
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
  gameState.day = 1;
}

export function calculateGameRewards() {
  const baseCoins = 10;
  const dayBonus = gameState.day * 2;
  const killBonus = Math.floor(gameState.gameProgress.totalKills * 0.1);
  const speedBonus = gameState.day > 5 ? Math.floor((gameState.day - 5) * 3) : 0;
  
  return {
    coins: baseCoins + dayBonus + killBonus + speedBonus,
    kills: gameState.gameProgress.totalKills
  };
}

// 重置游戏状态（新游戏时）
export function resetGameState() {
  gameState.day = 1;
  gameState.selectedCardId = null;
  gameState.mana = GAME_BALANCE.initialMana;
  gameState.maxMana = GAME_BALANCE.maxMana;
  gameState.manaRegen = GAME_BALANCE.manaRegen;
  gameState.wall = { hp: GAME_BALANCE.wallHp, maxHp: GAME_BALANCE.wallMaxHp };
  gameState.portal = { hp: GAME_BALANCE.portalHp, maxHp: GAME_BALANCE.portalMaxHp };
  gameState.roles = [];
  gameState.monsters = [];
  gameState.shots = [];
  gameState.effects = [];
  gameState.particles = [];
  gameState.damageNumbers = [];
  gameState.spawn = {
    time: 0,
    nextAt: 0,
    remaining: 0,
    eliteRemaining: 0,
    bossRemaining: 0,
    megabossRemaining: 0,
    done: false,
  };
}
