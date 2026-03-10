import { ARENA, PORTAL, WORLD, WALL_H } from './config.js';
import { rand, clamp } from './utils.js';
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
    this.stopTriggers = 0;
    this.burnTarget = null;
    this.burnDamage = 0;
    this.burnStartTime = 0;
    this.lastBurnTarget = null;
  }

  speed() {
    return Math.hypot(this.vx, this.vy);
  }

  update(dt) {
    if (!this.stopped) {
      const drag = Math.exp(-this.drag * dt);
      this.vx *= drag;
      this.vy *= drag;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      
      if (this.card.effect === "spin") {
        const sp = this.speed();
        this.rotation += sp * 0.08 * dt;
      }
      
      if (this.card.effect === "trail") {
        this.lastTrailTime += dt;
        if (this.lastTrailTime >= 0.03) {
          this.trail.push({ x: this.x, y: this.y, t: 0, dur: 0.35 });
          this.lastTrailTime = 0;
          if (this.trail.length > 12) this.trail.shift();
        }
      }
      
      if (this.card.effect === "sparkles" && Math.random() < 0.25) {
        gameState.particles.push({
          x: this.x + rand(-this.r * 0.6, this.r * 0.6),
          y: this.y + rand(-this.r * 0.6, this.r * 0.6),
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          r: rand(2, 4),
          t: 0,
          dur: rand(0.2, 0.4),
          color: this.card.color,
        });
      }
      
      if (this.card.effect === "burn" && Math.random() < 0.3) {
        gameState.particles.push({
          x: this.x + rand(-this.r * 0.8, this.r * 0.8),
          y: this.y + rand(-this.r * 0.8, this.r * 0.8),
          vx: rand(-30, 30),
          vy: rand(-50, -10),
          r: rand(3, 5),
          t: 0,
          dur: rand(0.4, 0.7),
          color: "#ff6b35",
        });
      }
      
      this._collideArena();
      this._collidePortal();

      const sp = this.speed();
      if (sp < 22 && gameState.now - this.lastColl > 0.12) {
        this.stopped = true;
        this.vx = 0;
        this.vy = 0;
        this.stopTimer = 0;
        this.effectCd = rand(0.05, 0.18);
        this._puff(this.x, this.y, this.card.color, 10);
      }
    } else {
      this.stopTimer += dt;
      this.effectCd -= dt;
      if (this.effectCd <= 0) {
        const cfg = this.card.onStop;
        if (cfg) {
          if (cfg.maxTriggers && this.stopTriggers >= cfg.maxTriggers) {
            this.effectCd = 9999;
          } else {
            this._emitStoppedEffect();
            this.stopTriggers++;
            this.effectCd = cfg.cd ?? 999;
          }
        } else {
          this.effectCd = 999;
        }
      }
    }
    
    if (this.card.effect === "trail") {
      for (const p of this.trail) p.t += dt;
      this.trail = this.trail.filter((p) => p.t < p.dur);
    }

    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
    }
  }

  _collideArena() {
    if (this.x - this.r < ARENA.l) {
      this.x = ARENA.l + this.r;
      this.vx = Math.abs(this.vx) * this.bounce;
      this._bump();
    } else if (this.x + this.r > ARENA.r) {
      this.x = ARENA.r - this.r;
      this.vx = -Math.abs(this.vx) * this.bounce;
      this._bump();
    }
    if (this.y - this.r < ARENA.t) {
      this.y = ARENA.t + this.r;
      this.vy = Math.abs(this.vy) * this.bounce;
      this._bump();
    } else if (this.y + this.r > ARENA.b) {
      this.y = ARENA.b - this.r;
      this.vy = -Math.abs(this.vy) * this.bounce;
      this._bump();
    }
  }

  _collidePortal() {
    const dx = this.x - PORTAL.x;
    const dy = this.y - PORTAL.y;
    const d = Math.hypot(dx, dy);
    const minD = this.r + PORTAL.r;
    if (d < minD) {
      const n = { x: dx / d, y: dy / d };
      const overlap = minD - d;
      this.x += n.x * overlap;
      this.y += n.y * overlap;
      
      const vn = this.vx * n.x + this.vy * n.y;
      this.vx -= (1.8 * vn) * n.x;
      this.vy -= (1.8 * vn) * n.y;
      this.vx *= this.bounce;
      this.vy *= this.bounce;
      this._bump();

      const hitDmg = (this.m * 9 + Math.min(70, this.speed()) * 0.18) * gameState.modifiers.roleCollisionMul;
      this._dealPortal(hitDmg);
      this._sparkle(PORTAL.x, PORTAL.y + PORTAL.r * 0.15, "#ffd1ef", 14);
    }
  }

  _bump() {
    this.lastColl = gameState.now;
    this._puff(this.x, this.y, "rgba(0,0,0,0.18)", 6);
  }

  _emitStoppedEffect() {
    const eff = this.card.onStop;
    if (!eff) return;
    
    if (eff.kind === "shockwave") {
      gameState.effects.push({
        kind: "ring",
        x: this.x,
        y: this.y,
        t: 0,
        dur: 0.25,
        color: this.card.color,
        r0: 10,
        r1: eff.radius,
      });
      this._hitMonstersInRadius(this.x, this.y, eff.radius, eff.dmg, eff.knock);
    } else if (eff.kind === "arrows") {
      const target = this._findBestMonsterTarget(this.x, this.y, eff.range);
      if (target) {
        gameState.effects.push({
          kind: "line",
          x0: this.x,
          y0: this.y,
          x1: target.x,
          y1: target.y,
          t: 0,
          dur: 0.12,
          color: "rgba(80,180,255,0.95)",
        });
        target.takeDamage(eff.dmg);
        this._showDamageNumber(target.x, target.y, eff.dmg, "normal");
        this._sparkle(target.x, target.y, "#b8f2ff", 8);
      }
    } else if (eff.kind === "beam") {
      const target = this._findBestMonsterTarget(this.x, this.y, eff.range);
      const tx = target ? target.x : PORTAL.x;
      const ty = target ? target.y : PORTAL.y + PORTAL.r * 0.15;
      gameState.effects.push({
        kind: "line",
        x0: this.x,
        y0: this.y,
        x1: tx,
        y1: ty,
        t: 0,
        dur: 0.14,
        color: "rgba(165,120,255,0.95)",
      });
      if (target) {
        target.takeDamage(eff.dmg);
        this._showDamageNumber(tx, ty, eff.dmg, "normal");
        this._sparkle(tx, ty, "#ead7ff", 10);
      } else {
        this._dealPortal(eff.portalDmg);
      }
    } else if (eff.kind === "hellfireBeam") {
      const target = this._findBestMonsterTarget(this.x, this.y, 520);
      
      if (target) {
        if (this.lastBurnTarget !== target) {
          this.burnTarget = target;
          this.burnStartTime = gameState.now;
          this.burnDamage = 0;
          this.lastBurnTarget = target;
        }
        
        const burnTime = gameState.now - this.burnStartTime;
        const rampProgress = Math.min(burnTime / eff.rampTime, 1.0);
        const damageMul = 1.0 + (eff.maxDmgMul - 1.0) * rampProgress;
        const finalDamage = eff.baseDmg * damageMul;
        
        target.takeDamage(finalDamage);
        this._showDamageNumber(target.x, target.y, finalDamage, "burn");
        
        gameState.effects.push({
          kind: "line",
          x0: this.x,
          y0: this.y,
          x1: target.x,
          y1: target.y,
          t: 0,
          dur: 0.16,
          color: `rgba(255, 107, 53, ${0.6 + rampProgress * 0.4})`,
        });
        
        this._sparkle(target.x, target.y, "#ff6b35", 12);
        
        if (damageMul > 2.0) {
          for (let i = 0; i < 3; i++) {
            gameState.particles.push({
              x: target.x + rand(-20, 20),
              y: target.y + rand(-20, 20),
              vx: rand(-60, 60),
              vy: rand(-80, -20),
              r: rand(2, 4),
              t: 0,
              dur: rand(0.3, 0.6),
              color: "#ff6b35",
            });
          }
        }
      } else {
        this.lastBurnTarget = null;
        this.burnDamage = 0;
      }
    } else if (eff.kind === "auraSlow") {
      gameState.effects.push({
        kind: "pulse",
        x: this.x,
        y: this.y,
        t: 0,
        dur: 0.20,
        color: "rgba(255,210,90,0.95)",
        r: eff.radius,
      });
      for (const m of gameState.monsters) {
        const d = Math.hypot(m.x - this.x, m.y - this.y);
        if (d <= eff.radius + m.r) {
          m.takeDamage(eff.dmg);
          this._showDamageNumber(m.x, m.y, eff.dmg, "normal");
          m.slowTimer = Math.max(m.slowTimer, 0.55);
          m.slowMul = Math.min(m.slowMul, eff.slow);
        }
      }
    }
  }

  // 辅助函数
  _puff(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      gameState.particles.push({
        x: x + rand(-10, 10),
        y: y + rand(-10, 10),
        vx: rand(-30, 30),
        vy: rand(-30, 30),
        r: rand(3, 6),
        t: 0,
        dur: rand(0.2, 0.4),
        color: color,
      });
    }
  }

  _sparkle(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      gameState.particles.push({
        x: x + rand(-15, 15),
        y: y + rand(-15, 15),
        vx: rand(-60, 60),
        vy: rand(-60, 60),
        r: rand(2, 4),
        t: 0,
        dur: rand(0.3, 0.6),
        color: color,
      });
    }
  }

  _showDamageNumber(x, y, damage, type = "normal") {
    const colors = {
      normal: "#ff4444",
      crit: "#ff8800",
      heal: "#44ff44",
      burn: "#ff6b35"
    };
    
    gameState.damageNumbers.push({
      x: x,
      y: y,
      damage: Math.round(damage),
      color: colors[type] || colors.normal,
      t: 0,
      dur: 1.5,
      vy: -60
    });
  }

  _dealPortal(damage) {
    gameState.portal.hp = Math.max(0, gameState.portal.hp - damage);
  }

  _findBestMonsterTarget(x, y, range) {
    let best = null;
    let bestScore = -1;
    
    for (const monster of gameState.monsters) {
      const d = Math.hypot(monster.x - x, monster.y - y);
      if (d <= range) {
        let score = 1;
        if (monster.elite) score *= 3;
        if (monster.boss) score *= 5;
        score *= (1 - d / range);
        
        if (score > bestScore) {
          bestScore = score;
          best = monster;
        }
      }
    }
    
    return best;
  }

  _hitMonstersInRadius(x, y, radius, damage, knock) {
    for (const monster of gameState.monsters) {
      const d = Math.hypot(monster.x - x, monster.y - y);
      if (d <= radius + monster.r) {
        monster.takeDamage(damage);
        this._showDamageNumber(monster.x, monster.y, damage, "normal");
        
        if (knock > 0) {
          const angle = Math.atan2(monster.y - y, monster.x - x);
          monster.vx += Math.cos(angle) * knock;
          monster.vy += Math.sin(angle) * knock;
        }
      }
    }
  }
}

// 怪物类
export class Monster {
  constructor(type = 'normal') {
    this.type = type;
    this.elite = type === 'elite';
    this.boss = type === 'boss';
    this.megaboss = type === 'megaboss';
    
    if (this.megaboss) {
      this.r = 45;
      this.maxHp = 500;
      this.speed = 25;
      this.dmg = 25;
      this.color = '#8b0000';
    } else if (this.boss) {
      this.r = 35;
      this.maxHp = 200;
      this.speed = 35;
      this.dmg = 15;
      this.color = '#dc143c';
    } else if (this.elite) {
      this.r = 28;
      this.maxHp = 60;
      this.speed = 45;
      this.dmg = 8;
      this.color = '#ff8c00';
    } else {
      this.r = 20;
      this.maxHp = 20;
      this.speed = 60;
      this.dmg = 3;
      this.color = '#696969';
    }
    
    this.hp = this.maxHp;
    this.x = PORTAL.x + rand(-30, 30);
    this.y = PORTAL.y + PORTAL.r + 20;
    this.vx = 0;
    this.vy = this.speed * gameState.modifiers.monsterSpeedMul;
    this.slowTimer = 0;
    this.slowMul = 1;
    this.dead = false;
  }

  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.dead = true;
      gameState.gameProgress.totalKills++;
    }
  }

  update(dt) {
    // 减速效果
    let speedMul = this.slowMul;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowMul = 1;
      }
    }

    this.x += this.vx * dt * speedMul;
    this.y += this.vy * dt * speedMul;

    // 边界碰撞
    if (this.x - this.r < ARENA.l) {
      this.x = ARENA.l + this.r;
      this.vx = Math.abs(this.vx);
    } else if (this.x + this.r > ARENA.r) {
      this.x = ARENA.r - this.r;
      this.vx = -Math.abs(this.vx);
    }

    // 检查是否到达城墙
    if (this.y + this.r >= WORLD.h - WALL_H) {
      this.dead = true;
      gameState.wall.hp = Math.max(0, gameState.wall.hp - this.dmg);
    }
  }
}
