// 通用工具函数
export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function len(x, y) {
  return Math.hypot(x, y);
}

export function norm(x, y) {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l, l };
}

export function rand(a, b) {
  return a + Math.random() * (b - a);
}

export function pick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

export function withAlpha(color, alpha) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

export function shade(color, percent) {
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const adjust = (c) => {
      const adjusted = Math.round(c * (1 + percent / 100));
      return clamp(adjusted, 0, 255);
    };
    
    const newR = adjust(r);
    const newG = adjust(g);
    const newB = adjust(b);
    
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }
  return color;
}

// 坐标转换函数
export function screenToWorld(px, py, view) {
  return {
    x: (px - view.ox) / view.scale,
    y: (py - view.oy) / view.scale,
  };
}

export function worldToScreen(wx, wy, view) {
  return {
    x: wx * view.scale + view.ox,
    y: wy * view.scale + view.oy,
  };
}
