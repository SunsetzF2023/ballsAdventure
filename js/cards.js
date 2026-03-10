// 完整的卡牌系统
export const CARDS = [
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

// 奖励卡牌池
export const REWARD_CARDS = [
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

// 生成奖励卡牌
export function generateRewardCards() {
  const cards = [];
  const rarities = { common: 0.6, uncommon: 0.25, rare: 0.12, epic: 0.03 };
  
  for (let i = 0; i < 4; i++) {
    const rand = Math.random();
    let selectedRarity = "common";
    let cumulative = 0;
    
    for (const [rarity, prob] of Object.entries(rarities)) {
      cumulative += prob;
      if (rand <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }
    
    const availableCards = REWARD_CARDS.filter(card => card.rarity === selectedRarity);
    const selectedCard = availableCards[Math.floor(Math.random() * availableCards.length)];
    cards.push({ ...selectedCard, rewardId: i });
  }
  
  return cards;
}

// 获取当前可用卡牌
export function getAvailableCards(day) {
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
