import { WORLD, PORTAL, SLING, ARENA, WALL_H } from './config.js';
import { gameState } from './gameState.js';

export class Renderer {
  constructor(ctx, view) {
    this.ctx = ctx;
    this.view = view;
  }

  clear() {
    this.ctx.fillStyle = '#0d1117';
    this.ctx.fillRect(0, 0, this.view.w, this.view.h);
  }

  drawWorldBackground() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    this.ctx.strokeStyle = 'rgba(88, 166, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(ARENA.l, ARENA.t, ARENA.r - ARENA.l, ARENA.b - ARENA.t);
    this.ctx.setLineDash([]);
    
    this.ctx.restore();
  }

  drawPortal() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    const { x, y, r } = PORTAL;
    const portal = gameState.portal;
    
    const glowGradient = this.ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.8);
    glowGradient.addColorStop(0, 'rgba(157, 78, 221, 0.4)');
    glowGradient.addColorStop(1, 'rgba(157, 78, 221, 0)');
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r * 1.8, r * 0.6, 0, 0, Math.PI * 2);
    this.ctx.fill();

    const portalGradient = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    portalGradient.addColorStop(0, '#c77dff');
    portalGradient.addColorStop(0.5, '#9d4edd');
    portalGradient.addColorStop(1, '#7209b7');
    this.ctx.fillStyle = portalGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    const hpPercent = portal.hp / portal.maxHp;
    const hpColor = hpPercent > 0.5 ? '#56d364' : hpPercent > 0.25 ? '#f0b429' : '#ff8c42';
    const barWidth = r * 2;
    const barHeight = 6;
    const barY = y + r * 0.8;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - barWidth/2, barY, barWidth, barHeight);
    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(x - barWidth/2, barY, barWidth * hpPercent, barHeight);
    
    this.ctx.restore();
  }

  drawWall() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    const wall = gameState.wall;
    const wallY = WORLD.h - WALL_H;
    
    // 使用原始的粉白色渐变
    const wallGradient = this.ctx.createLinearGradient(0, wallY, 0, wallY + WALL_H);
    wallGradient.addColorStop(0, "rgba(255,220,245,0.92)");
    wallGradient.addColorStop(1, "rgba(255,255,255,0.92)");
    this.ctx.fillStyle = wallGradient;
    this.ctx.strokeStyle = "rgba(0,0,0,0.10)";
    this.ctx.lineWidth = 5;
    
    // 原始的圆角矩形
    this.ctx.beginPath();
    this.ctx.roundRect(20, wallY, WORLD.w - 40, WALL_H + 18, 26);
    this.ctx.fill();
    this.ctx.stroke();
    
    // 原始的HP条位置和样式
    const w = 250;
    const h = 10;
    const p = wall.hp / wall.maxHp;
    this.ctx.fillStyle = "rgba(0,0,0,0.12)";
    this.ctx.fillRect(WORLD.w / 2 - w / 2, wallY + 18, w, h);
    this.ctx.fillStyle = "rgba(70,210,130,0.90)";
    this.ctx.fillRect(WORLD.w / 2 - w / 2, wallY + 18, w * p, h);
    
    this.ctx.restore();
  }

  drawSlingshot() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    const { x, y, r } = SLING;
    
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - r, y);
    this.ctx.lineTo(x - r, y - r * 2);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + r, y - r * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  drawRoles() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    for (const role of gameState.roles) {
      role.draw(this.ctx);
    }
    
    this.ctx.restore();
  }

  drawMonsters() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    for (const monster of gameState.monsters) {
      monster.draw(this.ctx);
    }
    
    this.ctx.restore();
  }

  drawEffects() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    for (const effect of gameState.effects) {
      this.drawEffect(effect);
    }
    
    this.ctx.restore();
  }

  drawEffect(effect) {
    switch (effect.kind) {
      case 'burst':
        const alpha = 1 - (effect.t / effect.dur);
        this.ctx.fillStyle = `rgba(255, 138, 91, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, effect.radius * (effect.t / effect.dur), 0, Math.PI * 2);
        this.ctx.fill();
        break;
        
      case 'fieldSlow':
        const fieldAlpha = 0.3 + 0.2 * Math.sin(effect.t * 3);
        this.ctx.fillStyle = `rgba(121, 242, 225, ${fieldAlpha})`;
        this.ctx.beginPath();
        this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        this.ctx.fill();
        break;
    }
  }

  drawDamageNumbers() {
    this.ctx.save();
    this.ctx.translate(this.view.ox, this.view.oy);
    this.ctx.scale(this.view.scale, this.view.scale);
    
    for (const dn of gameState.damageNumbers) {
      const alpha = 1 - (dn.t / dn.dur);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = 'bold 16px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(dn.damage.toString(), dn.x, dn.y);
    }
    
    this.ctx.restore();
  }

  // 主渲染方法
  render() {
    this.clear();
    this.drawWorldBackground();
    this.drawPortal();
    this.drawWall();
    this.drawSlingshot();
    this.drawRoles();
    this.drawMonsters();
    this.drawEffects();
    this.drawDamageNumbers();
  }
}
