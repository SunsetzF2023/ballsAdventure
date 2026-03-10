import { WORLD, PORTAL, SLING, ARENA, WALL_H } from './config.js';
import { withAlpha, shade, clamp, worldToScreen } from './utils.js';
import { gameState } from './gameState.js';

export class Renderer {
  constructor(ctx, view) {
    this.ctx = ctx;
    this.view = view;
  }

  // 清空画布
  clear() {
    this.ctx.fillStyle = '#fff7fb';
    this.ctx.fillRect(0, 0, this.view.w, this.view.h);
  }

  // 绘制游戏世界背景
  drawWorldBackground() {
    // 绘制竞技场背景
    const gradient = this.ctx.createLinearGradient(0, ARENA.t, 0, ARENA.b);
    gradient.addColorStop(0, '#f8f9ff');
    gradient.addColorStop(1, '#e8ecff');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(ARENA.l, ARENA.t, ARENA.r - ARENA.l, ARENA.b - ARENA.t);

    // 绘制竞技场边框
    this.ctx.strokeStyle = '#d0d8ff';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(ARENA.l, ARENA.t, ARENA.r - ARENA.l, ARENA.b - ARENA.t);
  }

  // 绘制传送门
  drawPortal() {
    const { x, y, r } = PORTAL;
    const portal = gameState.portal;
    
    // 传送门光晕
    const glowGradient = this.ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.5);
    glowGradient.addColorStop(0, withAlpha('#9d4edd', 0.3));
    glowGradient.addColorStop(1, withAlpha('#9d4edd', 0));
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 传送门主体
    const portalGradient = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    portalGradient.addColorStop(0, '#c77dff');
    portalGradient.addColorStop(0.7, '#9d4edd');
    portalGradient.addColorStop(1, '#7209b7');
    this.ctx.fillStyle = portalGradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    // 传送门边框
    this.ctx.strokeStyle = '#5a189a';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    // 生命值条
    const barWidth = r * 2;
    const barHeight = 8;
    const barY = y - r - 20;
    const hpPercent = portal.hp / portal.maxHp;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);

    const hpGradient = this.ctx.createLinearGradient(x - barWidth/2, barY, x + barWidth/2, barY);
    hpGradient.addColorStop(0, '#ff6b6b');
    hpGradient.addColorStop(1, '#ee5a52');
    this.ctx.fillStyle = hpGradient;
    this.ctx.fillRect(x - barWidth/2, barY, barWidth * hpPercent, barHeight);

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x - barWidth/2, barY, barWidth, barHeight);
  }

  // 绘制城墙
  drawWall() {
    const wallY = WORLD.h - WALL_H;
    const wall = gameState.wall;
    
    // 城墙主体
    const wallGradient = this.ctx.createLinearGradient(0, wallY, 0, WORLD.h);
    wallGradient.addColorStop(0, '#8b7355');
    wallGradient.addColorStop(0.5, '#6b5a45');
    wallGradient.addColorStop(1, '#4b3a25');
    this.ctx.fillStyle = wallGradient;
    this.ctx.fillRect(ARENA.l, wallY, ARENA.r - ARENA.l, WALL_H);

    // 城城纹理
    this.ctx.strokeStyle = '#3b2a15';
    this.ctx.lineWidth = 2;
    for (let x = ARENA.l; x < ARENA.r; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, wallY);
      this.ctx.lineTo(x, WORLD.h);
      this.ctx.stroke();
    }

    // 生命值条
    const barWidth = ARENA.r - ARENA.l;
    const barHeight = 10;
    const barY = wallY - 20;
    const hpPercent = wall.hp / wall.maxHp;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(ARENA.l, barY, barWidth, barHeight);

    const hpGradient = this.ctx.createLinearGradient(ARENA.l, barY, ARENA.r, barY);
    hpGradient.addColorStop(0, '#51cf66');
    hpGradient.addColorStop(1, '#37b24d');
    this.ctx.fillStyle = hpGradient;
    this.ctx.fillRect(ARENA.l, barY, barWidth * hpPercent, barHeight);

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(ARENA.l, barY, barWidth, barHeight);
  }

  // 绘制弹弓
  drawSlingshot() {
    const { x, y, r } = SLING;
    
    // 弹弓支架
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    
    // 左支架
    this.ctx.beginPath();
    this.ctx.moveTo(x - r, y + r);
    this.ctx.lineTo(x - r * 0.3, y - r * 0.5);
    this.ctx.stroke();
    
    // 右支架
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y + r);
    this.ctx.lineTo(x + r * 0.3, y - r * 0.5);
    this.ctx.stroke();

    // 弹弓中心圈
    this.ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();
  }

  // 绘制角色
  drawRole(role) {
    const c = role.card.color;
    this.ctx.save();
    this.ctx.translate(role.x, role.y);

    // 寿命可视化
    const lifeP = clamp(role.life / Math.max(0.001, role.maxLife), 0, 1);
    const fade = lifeP < 0.25 ? (0.25 + lifeP * 3.0) : 1;
    this.ctx.globalAlpha = fade;
    
    // 旋转效果（大盾）
    if (role.card.effect === "spin" && !role.stopped) {
      this.ctx.rotate(role.rotation);
    }
    
    // 光晕效果（法师）
    if (role.card.effect === "glow") {
      const glowGrd = this.ctx.createRadialGradient(0, 0, 0, 0, 0, role.r * 1.8);
      glowGrd.addColorStop(0, withAlpha(c, 0.25));
      glowGrd.addColorStop(0.4, withAlpha(c, 0.12));
      glowGrd.addColorStop(1, withAlpha(c, 0));
      this.ctx.fillStyle = glowGrd;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, role.r * 1.8, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // 尾迹效果（骑士）
    if (role.card.effect === "trail" && role.trail.length > 0) {
      for (let i = 0; i < role.trail.length; i++) {
        const p = role.trail[i];
        const alpha = (1 - p.t / p.dur) * 0.4;
        const r = role.r * (0.3 + 0.7 * (1 - p.t / p.dur));
        this.ctx.fillStyle = withAlpha(c, alpha);
        this.ctx.beginPath();
        this.ctx.arc(p.x - role.x, p.y - role.y, r, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // 阴影
    this.ctx.fillStyle = "rgba(0,0,0,0.12)";
    this.ctx.beginPath();
    this.ctx.ellipse(6, role.r * 0.62, role.r * 0.92, role.r * 0.42, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // 主体
    const grd = this.ctx.createRadialGradient(-role.r * 0.35, -role.r * 0.35, 6, 0, 0, role.r);
    grd.addColorStop(0, "#fff");
    grd.addColorStop(0.2, c);
    grd.addColorStop(1, shade(c, -18));
    this.ctx.fillStyle = grd;
    this.ctx.strokeStyle = "rgba(0,0,0,0.12)";
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, role.r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // 特殊装饰
    if (role.card.id === "knight") {
      this.ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI * 2) / 4 + gameState.now * 0.8;
        const dist = role.r * 0.75;
        this.ctx.beginPath();
        this.ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    } else if (role.card.id === "archer") {
      this.ctx.strokeStyle = "rgba(255,255,255,0.9)";
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.moveTo(-role.r * 0.3, 0);
      this.ctx.lineTo(role.r * 0.3, 0);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  // 绘制怪物
  drawMonster(monster) {
    this.ctx.save();
    this.ctx.translate(monster.x, monster.y);

    // 怪物主体
    const grd = this.ctx.createRadialGradient(-monster.r * 0.3, -monster.r * 0.3, 4, 0, 0, monster.r);
    if (monster.elite) {
      grd.addColorStop(0, "#ffeb3b");
      grd.addColorStop(0.3, "#ffc107");
      grd.addColorStop(1, "#ff6f00");
    } else if (monster.boss) {
      grd.addColorStop(0, "#f44336");
      grd.addColorStop(0.3, "#d32f2f");
      grd.addColorStop(1, "#b71c1c");
    } else {
      grd.addColorStop(0, "#9e9e9e");
      grd.addColorStop(0.3, "#757575");
      grd.addColorStop(1, "#424242");
    }
    
    this.ctx.fillStyle = grd;
    this.ctx.strokeStyle = "rgba(0,0,0,0.2)";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, monster.r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // 生命值条
    if (monster.hp < monster.maxHp) {
      const barWidth = monster.r * 2;
      const barHeight = 4;
      const barY = -monster.r - 10;
      const hpPercent = monster.hp / monster.maxHp;

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(-barWidth/2, barY, barWidth, barHeight);

      this.ctx.fillStyle = monster.elite ? '#ffc107' : monster.boss ? '#f44336' : '#666';
      this.ctx.fillRect(-barWidth/2, barY, barWidth * hpPercent, barHeight);
    }

    this.ctx.restore();
  }

  // 绘制特效
  drawEffect(effect) {
    this.ctx.save();
    
    if (effect.kind === "ring") {
      const progress = effect.t / effect.dur;
      const radius = effect.r0 + (effect.r1 - effect.r0) * progress;
      const alpha = 1 - progress;
      
      this.ctx.strokeStyle = withAlpha(effect.color, alpha);
      this.ctx.lineWidth = 6 * (1 - progress * 0.5);
      this.ctx.beginPath();
      this.ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    } else if (effect.kind === "line") {
      const progress = effect.t / effect.dur;
      const alpha = 1 - progress;
      
      this.ctx.strokeStyle = withAlpha(effect.color, alpha);
      this.ctx.lineWidth = 4 * (1 - progress * 0.3);
      this.ctx.beginPath();
      this.ctx.moveTo(effect.x0, effect.y0);
      this.ctx.lineTo(effect.x1, effect.y1);
      this.ctx.stroke();
    } else if (effect.kind === "pulse") {
      const progress = effect.t / effect.dur;
      const alpha = 0.6 * (1 - progress);
      const scale = 1 + progress * 0.3;
      
      this.ctx.fillStyle = withAlpha(effect.color, alpha);
      this.ctx.beginPath();
      this.ctx.arc(effect.x, effect.y, effect.r * scale, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  // 绘制粒子
  drawParticle(particle) {
    const progress = particle.t / particle.dur;
    const alpha = 1 - progress;
    const scale = 1 - progress * 0.5;
    
    this.ctx.fillStyle = withAlpha(particle.color, alpha);
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.r * scale, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // 绘制伤害数字
  drawDamageNumber(damageNumber) {
    const progress = damageNumber.t / damageNumber.dur;
    const alpha = 1 - progress;
    const y = damageNumber.y + damageNumber.vy * progress;
    
    this.ctx.save();
    this.ctx.fillStyle = withAlpha(damageNumber.color, alpha);
    this.ctx.font = 'bold 16px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(damageNumber.damage.toString(), damageNumber.x, y);
    this.ctx.restore();
  }

  // 主渲染函数
  render() {
    this.clear();
    this.drawWorldBackground();
    this.drawPortal();
    this.drawWall();
    this.drawSlingshot();

    // 绘制所有游戏对象
    for (const effect of gameState.effects) {
      this.drawEffect(effect);
    }

    for (const particle of gameState.particles) {
      this.drawParticle(particle);
    }

    for (const monster of gameState.monsters) {
      this.drawMonster(monster);
    }

    for (const role of gameState.roles) {
      this.drawRole(role);
    }

    for (const damageNumber of gameState.damageNumbers) {
      this.drawDamageNumber(damageNumber);
    }
  }
}
