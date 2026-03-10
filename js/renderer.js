import { WORLD, PORTAL, SLING, ARENA, WALL_H } from './config.js';
import { withAlpha, shade, clamp, worldToScreen } from './utils.js';
import { gameState } from './gameState.js';

export class Renderer {
  constructor(ctx, view) {
    this.ctx = ctx;
    this.view = view;
  }

  // 清空画布 - 深色主题
  clear() {
    this.ctx.fillStyle = '#0d1117';
    this.ctx.fillRect(0, 0, this.view.w, this.view.h);
  }

  // 绘制游戏世界背景 - 透明战斗场地
  drawWorldBackground() {
    // 战斗场地完全透明，显示深色背景
    // 只绘制边框
    this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(ARENA.l, ARENA.t, ARENA.r - ARENA.l, ARENA.b - ARENA.t);
    this.ctx.setLineDash([]);
  }

  // 绘制传送门 - 扁平椭圆
  drawPortal() {
    const { x, y, r } = PORTAL;
    const portal = gameState.portal;
    
    // 传送门光晕 - 椭圆形状
    const glowGradient = this.ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.8);
    glowGradient.addColorStop(0, 'rgba(157, 78, 221, 0.4)');
    glowGradient.addColorStop(1, 'rgba(157, 78, 221, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r * 1.8, r * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 传送门主体 - 扁平椭圆
    const portalGradient = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    portalGradient.addColorStop(0, '#c77dff');
    portalGradient.addColorStop(0.5, '#9d4edd');
    portalGradient.addColorStop(1, '#7209b7');
    this.ctx.fillStyle = portalGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 传送门边框
    this.ctx.strokeStyle = 'rgba(199, 125, 255, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    this.ctx.stroke();

    // 传送门旋转效果
    const time = Date.now() * 0.001;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(time);
    this.ctx.strokeStyle = 'rgba(157, 78, 221, 0.6)';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 * i) / 3;
      const x1 = Math.cos(angle) * r * 0.8;
      const y1 = Math.sin(angle) * r * 0.3;
      const x2 = Math.cos(angle + Math.PI) * r * 0.8;
      const y2 = Math.sin(angle + Math.PI) * r * 0.3;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    this.ctx.restore();

    // 绘制传送门生命值
    if (portal.hp < portal.maxHp) {
      const barW = r * 2.5;
      const barH = 8;
      const barY = y - r - 20;
      const hpP = portal.hp / portal.maxHp;
      
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(x - barW/2, barY, barW, barH);
      
      const portalBarColor = hpP > 0.6 ? '#58a6ff' : hpP > 0.3 ? '#f0b429' : '#ff4b4b';
      this.ctx.fillStyle = portalBarColor;
      this.ctx.fillRect(x - barW/2, barY, barW * hpP, barH);
      
      this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x - barW/2, barY, barW, barH);
    }
  }

  // 绘制城墙
  drawWall() {
    const wallY = WORLD.h - WALL_H;
    const wall = gameState.wall;
    
    // 城墙主体 - 深色主题
    const wallGradient = this.ctx.createLinearGradient(0, wallY, 0, WORLD.h);
    wallGradient.addColorStop(0, '#4a5568');
    wallGradient.addColorStop(0.5, '#2d3748');
    wallGradient.addColorStop(1, '#1a202c');
    this.ctx.fillStyle = wallGradient;
    this.ctx.fillRect(ARENA.l, wallY, ARENA.r - ARENA.l, WALL_H);

    // 城墙纹理
    this.ctx.strokeStyle = '#1a202c';
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

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(ARENA.l, barY, barWidth, barHeight);

    const hpGradient = this.ctx.createLinearGradient(ARENA.l, barY, ARENA.r, barY);
    hpGradient.addColorStop(0, '#56d364');
    hpGradient.addColorStop(1, '#3fb950');
    this.ctx.fillStyle = hpGradient;
    this.ctx.fillRect(ARENA.l, barY, barWidth * hpPercent, barHeight);

    this.ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(ARENA.l, barY, barWidth, barHeight);
  }

  // 绘制弹弓
  drawSlingshot() {
    const { x, y, r } = SLING;
    
    // 弹弓支架 - 深色主题
    this.ctx.strokeStyle = '#8b7355';
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

    this.ctx.strokeStyle = '#8b7355';
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
    if (role.card.effect === "trail" && role.trail && role.trail.length > 0) {
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
    
    this.ctx.restore();
  }

  // 绘制怪物
  drawMonster(monster) {
    this.ctx.save();
    this.ctx.translate(monster.x, monster.y);
    monster.draw(this.ctx);
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
  }
}
