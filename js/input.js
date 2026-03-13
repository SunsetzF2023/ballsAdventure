import { WORLD, SLING, ARENA } from './config.js';
import { gameState } from './gameState.js';
import { Role } from './entities.js';
import { CARDS } from './cards.js';

export class InputHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.aiming = {
      active: false,
      start: { x: 0, y: 0 },
      pos: { x: 0, y: 0 }
    };
    this.selectedCardId = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 鼠标/触摸按下
    this.canvas.addEventListener("pointerdown", (ev) => this.handlePointerDown(ev));
    this.canvas.addEventListener("pointermove", (ev) => this.handlePointerMove(ev));
    this.canvas.addEventListener("pointerup", (ev) => this.handlePointerUp(ev));
  }

  screenToWorld(px, py) {
    const view = gameState.view;
    return {
      x: (px - view.ox) / view.scale,
      y: (py - view.oy) / view.scale
    };
  }

  inArena(x, y) {
    return x >= ARENA.l && x <= ARENA.r && y >= ARENA.t && y <= ARENA.b;
  }

  createRoleAtSling(card) {
    if (gameState.mana < card.cost) {
      this.flashHint("法力不足！");
      return false;
    }
    
    // 在弹弓处创建静止的角色
    const role = new Role(card, SLING.x, SLING.y, 0, 0);
    role.stopped = true; // 角色静止在弹弓处
    gameState.roles.push(role);
    this.lastCreatedRoleId = role;
    
    // 消耗法力
    gameState.mana -= card.cost;
    
    return true;
  }

  handlePointerDown(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const worldPos = this.screenToWorld(px, py);
    
    if (this.selectedCardId) {
      const card = CARDS.find((c) => c.id === this.selectedCardId);
      if (!card) return;
      
      if (card.type === "role") {
        // 检查是否点击了弹弓区域 - 使用原来的逻辑
        const distToSling = Math.hypot(worldPos.x - SLING.x, worldPos.y - SLING.y);
        if (distToSling <= SLING.r + 26) { // 原来的检测范围
          // 开始瞄准，不创建角色
          this.aiming = {
            active: true,
            start: { x: SLING.x, y: SLING.y },
            pos: { x: worldPos.x, y: worldPos.y },
            roleId: null
          };
          console.log('开始瞄准，位置:', worldPos.x, worldPos.y);
        } else {
          this.flashHint("要在弹弓附近开始拖拽发射噢。");
        }
      } else if (card.type === "spell") {
        // 法术卡直接施放
        this.handleSpellCast(card, worldPos);
      }
    }
  }

  handlePointerMove(ev) {
    if (!this.aiming.active) return;
    
    const worldPos = this.screenToWorld(ev.clientX, ev.clientY);
    this.aiming.pos = { x: worldPos.x, y: worldPos.y };
  }

  handlePointerUp(ev) {
    if (!this.aiming.active) return;
    
    this.aiming.active = false;
    const card = CARDS.find((c) => c.id === this.selectedCardId);
    if (!card) return;
    
    // 检查法力
    if (gameState.mana < card.cost) {
      this.flashHint("法术不够噢～");
      return;
    }
    
    // 使用原来的发射逻辑
    const pull = {
      x: this.aiming.start.x - this.aiming.pos.x,
      y: this.aiming.start.y - this.aiming.pos.y
    };
    
    // 计算标准化方向
    const pullLength = Math.hypot(pull.x, pull.y);
    if (pullLength === 0) return;
    
    const normalized = {
      x: pull.x / pullLength,
      y: pull.y / pullLength
    };
    
    // 计算发射参数 - 完全按照原来的逻辑
    const power = Math.min(pullLength, 140); // 限制最大拖拽距离
    const baseSpeed = 6.4 * power + 220; // 原来的速度公式
    const speed = baseSpeed * (card.launchSpeedMul ?? 1.0);
    const vx = normalized.x * speed;
    const vy = normalized.y * speed;
    
    // 计算发射位置 - 在弹弓附近
    const x = Math.max(ARENA.l + card.radius, 
               Math.min(ARENA.r - card.radius, 
               SLING.x + normalized.x * 12));
    const y = Math.max(ARENA.t + card.radius, 
               Math.min(ARENA.b - card.radius, 
               SLING.y + normalized.y * 12));
    
    // 创建并发射角色
    const role = new Role(card, x, y, vx, vy);
    gameState.roles.push(role);
    
    // 消耗法力
    gameState.mana -= card.cost;
    
    // 清除选择
    this.selectedCardId = null;
    
    console.log('发射成功！速度:', speed, '位置:', x, y);
    
    // 添加发射特效（如果需要）
    // sparkle(SLING.x, SLING.y, "#ffffff", 10);
  }

  handleSpellCast(card, p) {
    if (card.target === "instant") {
      // 立即生效的法术
      this.castInstantSpell(card);
    } else if (card.target === "arena") {
      // 需要点击场地的法术
      if (this.inArena(p.x, p.y)) {
        this.castArenaSpell(card, p);
      } else {
        this.flashHint("这个法术需要点在场地矩形里。");
      }
    }
    
    this.selectedCardId = null;
  }

  castInstantSpell(card) {
    // 处理立即生效的法术
    if (card.spell.kind === "healWall") {
      gameState.wall.hp = Math.min(gameState.wall.maxHp, gameState.wall.hp + card.spell.heal);
    } else if (card.spell.kind === "chargeMana") {
      gameState.mana = Math.min(gameState.maxMana, gameState.mana + card.spell.gain);
    }
  }

  castArenaSpell(card, pos) {
    // 处理场地法术
    if (card.spell.kind === "burst") {
      // 爆炸法术
      gameState.effects.push({
        kind: "burst",
        x: pos.x,
        y: pos.y,
        radius: card.spell.radius,
        dmg: card.spell.dmg,
        knock: card.spell.knock,
        t: 0,
        dur: 0.3
      });
    } else if (card.spell.kind === "fieldSlow") {
      // 减速场法术
      gameState.effects.push({
        kind: "fieldSlow",
        x: pos.x,
        y: pos.y,
        radius: card.spell.radius,
        slow: card.spell.slow,
        t: 0,
        dur: card.spell.duration
      });
    }
  }

  flashHint(message) {
    // 显示提示信息
    const hintEl = document.getElementById("hudHint");
    if (hintEl) {
      hintEl.textContent = message;
      setTimeout(() => {
        hintEl.textContent = "选择卡牌：角色卡在弹弓发射；法术卡点击场地施放。";
      }, 2000);
    }
  }

  selectCard(cardId) {
    console.log('选择卡牌:', cardId);
    this.selectedCardId = cardId;
    
    // 更新gameState中的selectedCardId
    gameState.selectedCardId = cardId;
    
    // 更新UI提示
    const card = CARDS.find(c => c.id === cardId);
    if (card) {
      const hintEl = document.getElementById("hudHint");
      if (hintEl) {
        hintEl.textContent = card.type === 'role' 
          ? `在弹弓上拖拽发射 ${card.name}`
          : `点击场地施放 ${card.name}`;
      }
    }
  }

  // 绘制瞄准辅助线 - 使用原来的逻辑，添加球体
  drawAim(ctx) {
    if (!this.aiming.active) return;
    
    const card = CARDS.find((c) => c.id === this.selectedCardId);
    if (!card) return;
    
    ctx.save();
    
    // 计算拖拽参数
    const dx = this.aiming.pos.x - this.aiming.start.x;
    const dy = this.aiming.pos.y - this.aiming.start.y;
    const pull = Math.min(Math.hypot(dx, dy), 140);
    const t = pull / 140; // 拖拽程度 0-1
    
    // 绘制弹弓线 - 使用原来的逻辑
    const bandA = { x: SLING.x - 12, y: SLING.y - 46 };
    const bandB = { x: SLING.x + 12, y: SLING.y - 46 };
    
    // 弹弓线颜色根据拉伸程度变化
    ctx.strokeStyle = `rgba(255,90,165,${0.25 + 0.55 * t})`;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // 左边弹弓线
    ctx.beginPath();
    ctx.moveTo(bandA.x, bandA.y);
    ctx.lineTo(this.aiming.pos.x, this.aiming.pos.y);
    ctx.lineTo(bandB.x, bandB.y);
    ctx.stroke();
    
    // 绘制球体 - 在拖拽位置
    ctx.save();
    ctx.translate(this.aiming.pos.x, this.aiming.pos.y);
    
    // 球体阴影
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(6, card.radius * 0.62, card.radius * 0.92, card.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 球体主体 - 3D效果
    const grd = ctx.createRadialGradient(-card.radius * 0.35, -card.radius * 0.35, 6, 0, 0, card.radius);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.2, card.color);
    grd.addColorStop(1, card.color + "cc");
    ctx.fillStyle = grd;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, card.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
    
    // 绘制轨迹预览
    if (pull > 10) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      
      // 计算发射方向
      const angle = Math.atan2(-dy, -dx);
      const speed = 6.4 * pull + 220;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 模拟轨迹 - 使用原始逻辑
      let x = SLING.x + Math.cos(angle) * 12;
      let y = SLING.y + Math.sin(angle) * 12;
      let pvx = Math.cos(angle) * speed;
      let pvy = Math.sin(angle) * speed;
      
      ctx.fillStyle = "rgba(80,80,90,0.20)";
      for (let i = 0; i < 14; i++) {
        const dt = 0.06;
        const dragFactor = Math.exp(-card.drag * dt);
        pvx *= dragFactor;
        pvy *= dragFactor;
        x += pvx * dt;
        y += pvy * dt;
        
        // 反弹预览
        if (x < ARENA.l + 10 || x > ARENA.r - 10) pvx *= -0.84;
        if (y < ARENA.t + 10 || y > ARENA.b - 10) pvy *= -0.84;
        
        ctx.beginPath();
        ctx.arc(x, y, 4 - i * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }
}
