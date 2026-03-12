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
        // 检查是否点击了弹弓区域 - 增大检测范围
        const distToSling = Math.hypot(worldPos.x - SLING.x, worldPos.y - SLING.y);
        if (distToSling <= SLING.r * 3) { // 增大检测范围
          // 在弹弓处创建角色
          if (this.createRoleAtSling(card)) {
            this.aiming = {
              active: true,
              start: { x: SLING.x, y: SLING.y },
              pos: { x: worldPos.x, y: worldPos.y },
              roleId: this.lastCreatedRoleId
            };
            console.log('开始瞄准弹弓');
          }
        }
      } else if (card.type === "spell") {
        // 法术卡直接施放
        this.handleSpellCast(card, worldPos);
      }
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
    if (!card || !this.aiming.roleId) return;
    
    // 计算发射速度 - 改进手感
    const dx = this.aiming.start.x - this.aiming.pos.x;
    const dy = this.aiming.start.y - this.aiming.pos.y;
    const pull = Math.min(Math.hypot(dx, dy), 160); // 增加最大拖拽距离
    
    if (pull > 15) { // 降低最小拖拽距离，更容易发射
      const angle = Math.atan2(dy, dx);
      const speed = pull * 3.5 * (card.launchSpeedMul || 1); // 调整速度系数
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 发射已创建的角色
      const role = this.aiming.roleId;
      role.vx = vx;
      role.vy = vy;
      role.stopped = false; // 开始移动
      
      console.log('发射角色，速度:', speed);
      
      // 清除选择
      this.selectedCardId = null;
    } else {
      // 取消发射，移除角色
      const index = gameState.roles.indexOf(this.aiming.roleId);
      if (index > -1) {
        gameState.roles.splice(index, 1);
        // 退还法力
        gameState.mana += card.cost;
        console.log('取消发射，退还法力');
      }
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

  // 绘制瞄准辅助线 - 俯视视角直线轨迹
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
      
      // 计算发射方向和速度
      const angle = Math.atan2(-dy, -dx); // 反向，因为拖拽方向与发射方向相反
      const speed = pull * 4 * (card.launchSpeedMul || 1);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 绘制直线轨迹预判
      ctx.beginPath();
      ctx.moveTo(this.aiming.start.x, this.aiming.start.y);
      
      // 模拟弹道轨迹（考虑减速）
      let px = this.aiming.start.x;
      let py = this.aiming.start.y;
      let pvx = vx;
      let pvy = vy;
      const drag = Math.exp(-card.drag * 0.016); // 使用卡牌的减速系数
      
      for (let i = 0; i < 30; i++) {
        px += pvx * 0.016;
        py += pvy * 0.016;
        ctx.lineTo(px, py);
        
        // 应用减速
        pvx *= drag;
        pvy *= drag;
        
        // 绘制轨迹点
        if (i % 3 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // 检查是否超出场地或速度太小
        if (px < 0 || px > WORLD.w || py < 0 || py > WORLD.h || Math.hypot(pvx, pvy) < 10) {
          break;
        }
      }
      
      ctx.stroke();
      
      // 绘制拖拽线
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.8)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(this.aiming.start.x, this.aiming.start.y);
      ctx.lineTo(this.aiming.pos.x, this.aiming.pos.y);
      ctx.stroke();
      
      ctx.restore();
    }
  }
}
