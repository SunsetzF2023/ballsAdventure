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
      pos: { x: 0, y: 0 },
      roleId: null
    };
    this.selectedCardId = null;
    this.draggingRole = null; // 正在拖拽的角色
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
        // 检查是否点击了弹弓区域
        const distToSling = Math.hypot(worldPos.x - SLING.x, worldPos.y - SLING.y);
        if (distToSling <= SLING.r * 2.5) {
          // 在点击位置创建角色，而不是弹弓位置
          if (gameState.mana < card.cost) {
            this.flashHint("法力不足！");
            return;
          }
          
          // 在鼠标点击位置创建角色
          const role = new Role(card, worldPos.x, worldPos.y, 0, 0);
          role.stopped = true;
          gameState.roles.push(role);
          this.draggingRole = role;
          
          // 消耗法力
          gameState.mana -= card.cost;
          
          // 开始拖拽瞄准
          this.aiming = {
            active: true,
            start: { x: worldPos.x, y: worldPos.y },
            pos: { x: worldPos.x, y: worldPos.y },
            roleId: role
          };
          
          console.log('开始拖拽角色，位置:', worldPos.x, worldPos.y);
        }
      } else if (card.type === "spell") {
        // 法术卡直接施放
        this.handleSpellCast(card, worldPos);
      }
    }
  }

  handlePointerMove(ev) {
    if (!this.aiming.active || !this.draggingRole) return;
    
    const worldPos = this.screenToWorld(ev.clientX, ev.clientY);
    
    // 更新角色位置跟随鼠标
    this.draggingRole.x = worldPos.x;
    this.draggingRole.y = worldPos.y;
    
    // 更新瞄准位置
    this.aiming.pos = worldPos;
  }

  handlePointerUp(ev) {
    if (!this.aiming.active || !this.draggingRole) return;
    
    this.aiming.active = false;
    const card = CARDS.find((c) => c.id === this.selectedCardId);
    if (!card) return;
    
    // 计算弹弓发射 - 从弹弓位置到当前位置
    const dx = SLING.x - this.draggingRole.x;
    const dy = SLING.y - this.draggingRole.y;
    const pull = Math.hypot(dx, dy);
    
    if (pull > 20) { // 最小拖拽距离
      // 计算发射速度和方向
      const angle = Math.atan2(dy, dx);
      const speed = Math.min(pull * 4.5, 800) * (card.launchSpeedMul || 1); // 限制最大速度
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 发射角色
      this.draggingRole.vx = vx;
      this.draggingRole.vy = vy;
      this.draggingRole.stopped = false;
      
      console.log('弹弓发射！速度:', speed, '方向:', angle);
      
      // 清除状态
      this.selectedCardId = null;
      this.draggingRole = null;
    } else {
      // 取消发射，移除角色并退还法力
      const index = gameState.roles.indexOf(this.draggingRole);
      if (index > -1) {
        gameState.roles.splice(index, 1);
        gameState.mana += card.cost;
        console.log('取消发射，退还法力');
      }
      
      this.draggingRole = null;
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

  // 绘制瞄准辅助线 - 弹弓拖拽效果
  drawAim(ctx) {
    if (!this.aiming.active || !this.draggingRole) return;
    
    ctx.save();
    
    // 绘制弹弓线
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    // 左边弹弓线
    ctx.beginPath();
    ctx.moveTo(SLING.x - SLING.r, SLING.y);
    ctx.lineTo(this.draggingRole.x, this.draggingRole.y);
    ctx.stroke();
    
    // 右边弹弓线
    ctx.beginPath();
    ctx.moveTo(SLING.x + SLING.r, SLING.y);
    ctx.lineTo(this.draggingRole.x, this.draggingRole.y);
    ctx.stroke();
    
    // 绘制轨迹预览
    const dx = SLING.x - this.draggingRole.x;
    const dy = SLING.y - this.draggingRole.y;
    const pull = Math.hypot(dx, dy);
    
    if (pull > 20) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      
      const angle = Math.atan2(dy, dx);
      const speed = Math.min(pull * 4.5, 800);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // 模拟轨迹
      ctx.beginPath();
      ctx.moveTo(this.draggingRole.x, this.draggingRole.y);
      
      let px = this.draggingRole.x;
      let py = this.draggingRole.y;
      let pvx = vx;
      let pvy = vy;
      
      for (let i = 0; i < 30; i++) {
        const dt = 0.05;
        pvx *= Math.exp(-2.0 * dt);
        pvy *= Math.exp(-2.0 * dt);
        px += pvx * dt;
        py += pvy * dt;
        ctx.lineTo(px, py);
        
        if (i % 3 === 0) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(px, py);
        }
      }
      
      ctx.stroke();
    }
    
    ctx.restore();
  }
}
