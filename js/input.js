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
      y: (py - view.oy) / view.scale,
    };
  }

  inArena(x, y) {
    return x >= ARENA.l && x <= ARENA.r && y >= ARENA.t && y <= ARENA.b;
  }

  handlePointerDown(ev) {
    const p = this.screenToWorld(ev.clientX, ev.clientY);
    const card = CARDS.find((c) => c.id === this.selectedCardId);
    
    if (!card) return;

    if (card.type === "role") {
      // 检查是否在弹弓区域附近
      const dx = p.x - SLING.x;
      const dy = p.y - SLING.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist <= SLING.r * 2) {
        // 开始瞄准
        this.aiming.active = true;
        this.aiming.start = { x: SLING.x, y: SLING.y };
        this.aiming.pos = p;
        this.canvas.setPointerCapture(ev.pointerId);
      }
    } else if (card.type === "spell") {
      // 法术卡处理
      this.handleSpellCast(card, p);
    }
  }

  handlePointerMove(ev) {
    if (!this.aiming.active) return;
    
    const p = this.screenToWorld(ev.clientX, ev.clientY);
    this.aiming.pos = p;
  }

  handlePointerUp(ev) {
    if (!this.aiming.active) return;
    
    this.aiming.active = false;
    const card = CARDS.find((c) => c.id === this.selectedCardId);
    if (!card) return;
    
    // 计算发射速度
    const dx = this.aiming.start.x - this.aiming.pos.x;
    const dy = this.aiming.start.y - this.aiming.pos.y;
    const pull = Math.min(Math.hypot(dx, dy), 140);
    
    if (pull > 10) { // 最小拖拽距离
      const angle = Math.atan2(dy, dx);
      const speed = pull * 4 * (card.launchSpeedMul || 1);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 创建角色
      const role = new Role(card, SLING.x, SLING.y, vx, vy);
      gameState.roles.push(role);
      
      // 消耗法力
      gameState.mana = Math.max(0, gameState.mana - card.cost);
      
      // 清除选择
      this.selectedCardId = null;
    }
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
    this.selectedCardId = cardId;
  }

  // 绘制瞄准辅助线
  drawAim(ctx) {
    if (!this.aiming.active) return;
    
    const card = CARDS.find((c) => c.id === this.selectedCardId);
    if (!card) return;

    const dx = this.aiming.pos.x - this.aiming.start.x;
    const dy = this.aiming.pos.y - this.aiming.start.y;
    const pull = Math.min(Math.hypot(dx, dy), 140);
    
    if (pull > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      
      // 绘制轨迹预判线
      ctx.beginPath();
      ctx.moveTo(this.aiming.start.x, this.aiming.start.y);
      
      // 模抛物线轨迹
      const angle = Math.atan2(-dy, -dx);
      const speed = pull * 4 * (card.launchSpeedMul || 1);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      let px = this.aiming.start.x;
      let py = this.aiming.start.y;
      let pvx = vx;
      let pvy = vy;
      
      for (let i = 0; i < 20; i++) {
        pvy += 300 * 0.016; // 重力
        px += pvx * 0.016;
        py += pvy * 0.016;
        ctx.lineTo(px, py);
        
        if (py > WORLD.h - 100) break; // 超出屏幕底部
      }
      
      ctx.stroke();
      ctx.restore();
    }
  }
}
