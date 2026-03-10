// 游戏核心配置 - 彻底重新设计布局
export const WORLD = { w: 400, h: 600 }; // 大幅缩小场地
export const WALL_H = 60; // 更小的墙壁
export const SLING = { x: WORLD.w / 2, y: WORLD.h - WALL_H - 20, r: 25 }; // 更小的弹弓
export const ARENA = {
  l: 50,  // 场地左边界
  r: WORLD.w - 50,  // 场地右边界
  t: 80,  // 场地上边界
  b: WORLD.h - WALL_H - 80,  // 场地下边界
};
export const PORTAL = { x: WORLD.w / 2, y: ARENA.t - 40, r: 35 }; // 更小的传送门

// 游戏平衡参数
export const GAME_BALANCE = {
  initialMana: 0,
  maxMana: 10,
  manaRegen: 1.35, // per second
  wallHp: 52,
  wallMaxHp: 52,
  portalHp: 120,
  portalMaxHp: 120,
};

// 卡牌配置
export const CARDS = [
  {
    id: "knight",
    type: "role",
    name: "棉花骑士",
    cost: 2,
    weight: 1.05,
    radius: 26,
    color: "#ff78b8",
    drag: 1.85,
    launchSpeedMul: 1.15,
    effect: "trail",
    life: 12,
    desc: "停下后：冲击波，震开附近怪物。",
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
    drag: 2.8,
    launchSpeedMul: 1.35,
    effect: "sparkles",
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
    drag: 2.2,
    launchSpeedMul: 0.95,
    effect: "glow",
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
    drag: 1.5,
    launchSpeedMul: 0.75,
    effect: "spin",
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
  { id: "knight", type: "role", name: "棉花骑士", rarity: "common" },
  { id: "archer", type: "role", name: "糖霜弓手", rarity: "common" },
  { id: "mage", type: "role", name: "果冻法师", rarity: "common" },
  { id: "shield", type: "role", name: "软糖大盾", rarity: "uncommon" },
  { id: "ice", type: "spell", name: "冰霜结界", rarity: "common" },
  { id: "fire", type: "spell", name: "甜辣火球", rarity: "common" },
  { id: "heal", type: "spell", name: "城墙修补", rarity: "common" },
  { id: "charge", type: "spell", name: "小充能", rarity: "common" },
  { id: "potion_health", type: "item", name: "生命药水", rarity: "common", effect: "立即回复20点城墙生命" },
  { id: "potion_mana", type: "item", name: "法力药水", rarity: "common", effect: "立即获得5点法力" },
  { id: "bomb", type: "item", name: "炸弹", rarity: "uncommon", effect: "对范围内所有怪物造成30点伤害" },
  { id: "time_freeze", type: "item", name: "时间冻结", rarity: "rare", effect: "冻结所有怪物5秒" },
  { id: "dragon", type: "role", name: "火龙", rarity: "rare", cost: 6, desc: "强力范围伤害，飞行单位" },
  { id: "angel", type: "role", name: "天使", rarity: "rare", cost: 5, desc: "治疗城墙，净化怪物" },
  { id: "demon", type: "role", name: "恶魔", rarity: "epic", cost: 7, desc: "极高伤害，但会伤害城墙" }
];
