import { ARENA, PORTAL, WORLD, WALL_H } from './config.js';
import { rand, clamp, norm } from './utils.js';
import { gameState } from './gameState.js';

// 角色类
export class Role {
  constructor(card, x, y, vx, vy) {
    this.card = card;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = card.radius;
    this.m = Math.max(0.55, card.weight);
    this.drag = card.drag ?? 2.35;
    this.bounce = 0.84;
    this.hp = 999;
    this.stopped = false;
    this.stopTimer = 0;
    this.effectCd = 0;
    this.lastColl = -999;
    this.rotation = 0;
    this.trail = [];
    this.lastTrailTime = 0;
    this.maxLife = card.life ?? 14;
    this.life = this.maxLife;
    this.dead = false;
  }

  update(dt) {
    if (!this.stopped) {
      const drag = Math.exp(-this.drag * dt);
      this.vx *= drag;
      this.vy *= drag;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      
      // 处理尾迹效果
      if (this.card.effect === "trail") {
        this.lastTrailTime += dt;
        if (this.lastTrailTime >= 0.03) {
          this.trail.push({ x: this.x, y: this.y, t: 0, dur: 0.35 });
          this.lastTrailTime = 0;
          if (this.trail.length > 12) this.trail.shift();
        }
      }
      
      // 处理旋转效果
      if (this.card.effect === "spin") {
        const sp = Math.hypot(this.vx, this.vy);
        this.rotation += sp * 0.08 * dt;
      }
    }
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // 寿命可视化
    const lifeP = Math.max(0, Math.min(1, this.life / Math.max(0.001, this.maxLife)));
    const fade = lifeP < 0.25 ? (0.25 + lifeP * 3.0) : 1;
    ctx.globalAlpha = fade;

    // 光晕效果（法师）
    if (this.card.effect === "glow") {
      const glowGrd = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 1.8);
      glowGrd.addColorStop(0, this.card.color + "40");
      glowGrd.addColorStop(0.4, this.card.color + "20");
      glowGrd.addColorStop(1, this.card.color + "00");
      ctx.fillStyle = glowGrd;
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 尾迹效果（骑士）
    if (this.card.effect === "trail" && this.trail.length > 0) {
      for (let i = 0; i < this.trail.length; i++) {
        const p = this.trail[i];
        const alpha = (1 - p.t / p.dur) * 0.4;
        const r = this.r * (0.3 + 0.7 * (1 - p.t / p.dur));
        ctx.fillStyle = this.card.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(p.x - this.x, p.y - this.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // 阴影
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.ellipse(6, this.r * 0.62, this.r * 0.92, this.r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 主体 - 恢复原始3D效果
    const grd = ctx.createRadialGradient(-this.r * 0.35, -this.r * 0.35, 6, 0, 0, this.r);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.2, this.card.color);
    grd.addColorStop(1, this.card.color + "cc");
    ctx.fillStyle = grd;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// 怪物类
export class Monster {
  constructor(kind, x, y, dayMul) {
    this.kind = kind;
    
    // 不同怪物类型的基础属性
    let baseHp = 22, hpMul = 1, radius = 16, baseSpeed = 86, color = "#7be27a";
    
    if (kind === "boss") {
      baseHp = 180; hpMul = 1.8; radius = 34; baseSpeed = 72; color = "#ff4b4b";
    } else if (kind === "elite") {
      baseHp = 55; hpMul = 1.15; radius = 22; baseSpeed = 78; color = "#ff9a3c";
    } else if (kind === "ghost") {
      baseHp = 26; hpMul = 1.0; radius = 18; baseSpeed = 110; color = "#c6a4ff";
    } else if (kind === "hunter") {
      baseHp = 40; hpMul = 1.1; radius = 20; baseSpeed = 95; color = "#ffb447";
    } else if (kind === "shooter") {
      baseHp = 35; hpMul = 1.0; radius = 18; baseSpeed = 70; color = "#7fd5ff";
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
    this.stopped = false;
    this.shootCd = (kind === "ghost" || kind === "hunter") ? 0 : rand(1.5, 2.5);
  }

  update(dt) {
    if (this.kind === "ghost") {
      // 幽灵：直接冲向城墙
      this.vy = this.baseSpeed;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
    } else if (!this.stopped) {
      // 移动到场地中下部
      const targetY = ARENA.b - rand(60, 120);
      const dy = targetY - this.y;
      if (Math.abs(dy) > 8) {
        this.vy = Math.sign(dy) * Math.min(this.baseSpeed, Math.abs(dy) * 3);
        this.y += this.vy * dt;
      } else {
        this.stopped = true;
      }
      this.vx += rand(-12, 12) * dt;
      this.vx = clamp(this.vx, -40, 40);
      this.x += this.vx * dt;
    } else {
      // 已停下：攻击
      this.vx *= 0.95;
      this.x += this.vx * dt;
      this.shootCd -= dt;
      if (this.shootCd <= 0) {
        // 攻击城墙
        this.shootCd = rand(1.2, 2.5);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 绘制怪物阴影
    ctx.fillStyle = "rgba(0,0,0,0.11)";
    ctx.beginPath();
    ctx.ellipse(4, this.r * 0.62, this.r * 0.95, this.r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 绘制怪物主体
    const grd = ctx.createRadialGradient(-this.r * 0.25, -this.r * 0.35, 6, 0, 0, this.r);
    grd.addColorStop(0, "#ffffff");
    grd.addColorStop(0.18, this.color);
    grd.addColorStop(1, this.color + "cc");
    ctx.fillStyle = grd;
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 特殊装饰
    if (this.kind === "ghost") {
      // 幽灵光环
      ctx.globalAlpha = 0.3;
      const aura = ctx.createRadialGradient(0, 0, this.r * 0.25, 0, 0, this.r * 1.8);
      aura.addColorStop(0, this.color + "44");
      aura.addColorStop(1, this.color + "00");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, this.r * 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.kind === "hunter") {
      // 猎人尖角
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.moveTo(-this.r * 0.55, -this.r * 0.55);
      ctx.lineTo(-this.r * 0.85, -this.r * 0.95);
      ctx.lineTo(-this.r * 0.30, -this.r * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.r * 0.55, -this.r * 0.55);
      ctx.lineTo(this.r * 0.85, -this.r * 0.95);
      ctx.lineTo(this.r * 0.30, -this.r * 0.78);
      ctx.closePath();
      ctx.fill();
    } else if (this.kind === "shooter") {
      // 射手炮塔
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.beginPath();
      ctx.roundRect(-this.r * 0.45, -this.r * 1.05, this.r * 0.9, this.r * 0.55, 8);
      ctx.fill();
    } else {
      // 默认角
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.roundRect(-this.r * 0.65, -this.r * 0.95, this.r * 0.35, this.r * 0.35, 6);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(this.r * 0.30, -this.r * 0.95, this.r * 0.35, this.r * 0.35, 6);
      ctx.fill();
    }

    // 绘制血条
    if (this.hp < this.maxHp) {
      const barW = this.r * 2;
      const barH = 6;
      const barY = -this.r - 15;
      const hpP = this.hp / this.maxHp;
      
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(-barW/2, barY, barW, barH);
      
      const barColor = hpP > 0.6 ? "#56d364" : hpP > 0.3 ? "#f0b429" : "#ff4b4b";
      ctx.fillStyle = barColor;
      ctx.fillRect(-barW/2, barY, barW * hpP, barH);
    }

    ctx.restore();
  }
}
