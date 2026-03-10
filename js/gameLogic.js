import { REWARD_CARDS, WORLD, SLING, ARENA, GAME_BALANCE } from './config.js';
import { CARDS } from './cards.js';
import { pick, rand, screenToWorld } from './utils.js';
import { gameState, saveProgress, resetGameState } from './gameState.js';
import { Role, Monster } from './entities.js';

// 卡牌相关函数
export function generateRewardCards() {
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
export function performGacha() {
  if (gameState.gameProgress.coins < 100) {
    showOverlay("金币不足", "需要100金币进行十连抽", "确定");
    return;
  }

  gameState.gameProgress.coins -= 100;
  
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
    
    if (!gameState.gameProgress.cardCollection[selectedCard.id]) {
      gameState.gameProgress.cardCollection[selectedCard.id] = 0;
    }
    gameState.gameProgress.cardCollection[selectedCard.id]++;
    
    if (gameState.gameProgress.cardCollection[selectedCard.id] >= 10 && !gameState.gameProgress.cardLevels[selectedCard.id]) {
      gameState.gameProgress.cardLevels[selectedCard.id] = 1;
    }
  }
  
  saveProgress();
  return results;
}

// 游戏循环更新
export function updateGame(dt) {
  // 更新法力值
  if (gameState.mana < gameState.maxMana) {
    gameState.mana = Math.min(gameState.maxMana, gameState.mana + gameState.manaRegen * gameState.modifiers.manaRegenMul * dt);
  }

  // 更新角色
  for (const role of gameState.roles) {
    role.update(dt);
  }
  gameState.roles = gameState.roles.filter(role => !role.dead);

  // 更新怪物
  for (const monster of gameState.monsters) {
    monster.update(dt);
  }
  gameState.monsters = gameState.monsters.filter(monster => !monster.dead);

  // 更新特效
  for (const effect of gameState.effects) {
    effect.t += dt;
  }
  gameState.effects = gameState.effects.filter(effect => effect.t < effect.dur);

  // 更新粒子
  for (const particle of gameState.particles) {
    particle.t += dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 200 * dt; // 重力
  }
  gameState.particles = gameState.particles.filter(particle => particle.t < particle.dur);

  // 更新伤害数字
  for (const damageNumber of gameState.damageNumbers) {
    damageNumber.t += dt;
  }
  gameState.damageNumbers = gameState.damageNumbers.filter(dn => dn.t < dn.dur);

  // 怪物生成
  updateSpawning(dt);

  // 检查游戏结束条件
  checkGameEnd();
}

function updateSpawning(dt) {
  gameState.spawn.time += dt;
  
  if (gameState.spawn.time >= gameState.spawn.nextAt && !gameState.spawn.done) {
    // 生成怪物
    if (gameState.spawn.megabossRemaining > 0) {
      gameState.monsters.push(new Monster('megaboss'));
      gameState.spawn.megabossRemaining--;
    } else if (gameState.spawn.bossRemaining > 0) {
      gameState.monsters.push(new Monster('boss'));
      gameState.spawn.bossRemaining--;
    } else if (gameState.spawn.eliteRemaining > 0) {
      gameState.monsters.push(new Monster('elite'));
      gameState.spawn.eliteRemaining--;
    } else if (gameState.spawn.remaining > 0) {
      gameState.monsters.push(new Monster('normal'));
      gameState.spawn.remaining--;
    } else {
      gameState.spawn.done = true;
    }
    
    gameState.spawn.time = 0;
    gameState.spawn.nextAt = rand(0.8, 2.0);
  }
}

function checkGameEnd() {
  // 检查传送门是否被摧毁
  if (gameState.portal.hp <= 0) {
    // 过关
    dayComplete();
  }
  
  // 检查城墙是否被摧毁
  if (gameState.wall.hp <= 0) {
    // 游戏失败
    gameOver();
  }
  
  // 检查是否所有怪物都被消灭
  if (gameState.spawn.done && gameState.monsters.length === 0) {
    // 过关
    dayComplete();
  }
}

export function dayComplete() {
  gameState.day++;
  const rewards = calculateGameRewards();
  gameState.gameProgress.coins += rewards.coins;
  gameState.gameProgress.bestDay = Math.max(gameState.gameProgress.bestDay, gameState.day);
  
  saveProgress();
  
  // 显示奖励界面
  gameState.rewardSystem.showReward = true;
  gameState.rewardSystem.rewardCards = generateRewardCards();
  
  // 更新UI
  showOverlay("Day Clear", `获得 ${rewards.coins} 金币！`, "进入下一天");
}

export function gameOver() {
  gameState.gameProgress.bestDay = Math.max(gameState.gameProgress.bestDay, gameState.day);
  saveProgress();
  
  showOverlay("游戏结束", `你坚持到了第 ${gameState.day} 天`, "重新开始");
}

// 设置新的一天
export function setupDay(dayNum) {
  resetGameState();
  gameState.day = dayNum;
  
  // 设置怪物生成 - 确保有怪物
  const baseMonsters = Math.max(3, 5 + dayNum * 2);
  gameState.spawn.remaining = baseMonsters;
  gameState.spawn.eliteRemaining = Math.max(0, Math.floor(dayNum / 3));
  gameState.spawn.bossRemaining = Math.max(0, Math.floor(dayNum / 5));
  gameState.spawn.megabossRemaining = Math.max(0, Math.floor(dayNum / 10));
  
  console.log(`Day ${dayNum}: ${baseMonsters} monsters, ${gameState.spawn.eliteRemaining} elites, ${gameState.spawn.bossRemaining} bosses`);
  
  // 应用修正器
  if (gameState.pendingModifier) {
    Object.assign(gameState.modifiers, gameState.pendingModifier);
    gameState.pendingModifier = null;
  }
  
  // 重置传送门生命值
  gameState.portal.hp = gameState.portal.maxHp * gameState.modifiers.portalMaxHpMul;
  gameState.portal.maxHp = gameState.portal.hp;
  
  // 重置城墙生命值
  gameState.wall.hp = gameState.wall.maxHp + gameState.modifiers.wallMaxHpBonus;
  gameState.wall.maxHp = gameState.wall.hp;
  
  // 重置最大法力值
  gameState.maxMana = GAME_BALANCE.maxMana + gameState.modifiers.maxManaBonus;
  
  // 立即开始生成怪物
  gameState.spawn.time = 0;
  gameState.spawn.nextAt = 0.5;
}

// 处理卡牌发射
export function handleCardLaunch(cardId, startX, startY, endX, endY) {
  const card = CARDS.find(c => c.id === cardId);
  if (!card || gameState.mana < card.cost) return false;
  
  // 转换到世界坐标
  const worldStart = screenToWorld(startX, startY, gameState.view);
  const worldEnd = screenToWorld(endX, endY, gameState.view);
  
  // 计算发射速度
  const dx = worldStart.x - worldEnd.x;
  const dy = worldStart.y - worldEnd.y;
  const power = Math.min(Math.hypot(dx, dy), 200);
  const vx = (dx / Math.hypot(dx, dy)) * power * (card.launchSpeedMul || 1);
  const vy = (dy / Math.hypot(dx, dy)) * power * (card.launchSpeedMul || 1);
  
  // 扣除法力
  gameState.mana -= card.cost;
  
  if (card.type === "role") {
    // 创建角色
    const role = new Role(card, worldStart.x, worldStart.y, vx, vy);
    gameState.roles.push(role);
  } else if (card.type === "spell") {
    // 处理法术
    handleSpell(card, worldEnd.x, worldEnd.y);
  }
  
  return true;
}

function handleSpell(card, targetX, targetY) {
  const spell = card.spell;
  
  switch (spell.kind) {
    case "burst":
      // 火球术
      gameState.effects.push({
        kind: "ring",
        x: targetX,
        y: targetY,
        t: 0,
        dur: 0.3,
        color: card.color,
        r0: 20,
        r1: spell.radius,
      });
      
      for (const monster of gameState.monsters) {
        const d = Math.hypot(monster.x - targetX, monster.y - targetY);
        if (d <= spell.radius + monster.r) {
          monster.takeDamage(spell.dmg);
          
          if (spell.knock > 0) {
            const angle = Math.atan2(monster.y - targetY, monster.x - targetX);
            monster.vx += Math.cos(angle) * spell.knock;
            monster.vy += Math.sin(angle) * spell.knock;
          }
        }
      }
      break;
      
    case "fieldSlow":
      // 冰霜结界
      gameState.effects.push({
        kind: "pulse",
        x: targetX,
        y: targetY,
        t: 0,
        dur: spell.duration,
        color: card.color,
        r: spell.radius,
      });
      
      // 创建持续减速区域
      const slowField = {
        kind: "slowField",
        x: targetX,
        y: targetY,
        radius: spell.radius,
        slow: spell.slow,
        endTime: gameState.now + spell.duration
      };
      gameState.effects.push(slowField);
      break;
      
    case "healWall":
      // 城墙修补
      gameState.wall.hp = Math.min(gameState.wall.maxHp, gameState.wall.hp + spell.heal);
      break;
      
    case "chargeMana":
      // 法力充能
      gameState.mana = Math.min(gameState.maxMana, gameState.mana + spell.gain);
      gameState.manaRegen += spell.regenBonus;
      setTimeout(() => {
        gameState.manaRegen -= spell.regenBonus;
      }, spell.duration * 1000);
      break;
  }
}

// UI相关函数（这些需要访问DOM，所以可能需要移动到main.js中）
export function showOverlay(title, desc, buttonText) {
  const overlayEl = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayDesc = document.getElementById("overlayDesc");
  const overlayBtn = document.getElementById("overlayBtn");
  
  overlayTitle.textContent = title;
  overlayDesc.textContent = desc;
  overlayBtn.textContent = buttonText;
  
  overlayEl.classList.remove("hidden");
  gameState.pausedOverlay = true;
}

export function hideOverlay() {
  const overlayEl = document.getElementById("overlay");
  overlayEl.classList.add("hidden");
  gameState.pausedOverlay = false;
}
