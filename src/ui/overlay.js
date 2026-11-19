// src/ui/overlay.js
// HTML labels positioned from 3D points (CLAUDE.md section 4). They stay
// sharp, translatable and readable by screen readers. Labels never sit on
// top of an energy glow or another label: each label tries a few positions
// around its anchor and takes the first one that is clear.
import { Vector3 } from 'three';

const NEAR = [
  [0, -1], // above
  [1, -0.4], // right
  [-1, -0.4], // left
  [0, 1], // below
  [1.2, 0.6],
  [-1.2, 0.6],
];
// If every near position is taken, try a wider ring before giving up.
const CANDIDATES = [...NEAR, ...NEAR.map(([x, y]) => [x * 2.2, y * 2.4]), [0, -3.6], [0, 3.6]];

function overlaps(a, b, pad = 4) {
  return a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
}

// Labels stay at least this far inside the visible stage.
const EDGE = 4;

function inside(r, area) {
  return r.x >= area.x + EDGE && r.y >= area.y + EDGE && r.x + r.w <= area.x + area.w - EDGE && r.y + r.h <= area.y + area.h - EDGE;
}

export function createOverlay(root, camera) {
  const labels = new Map();
  // The part of the screen the stage shows (above the bottom bar, and above
  // the text panel in the stacked layout). Null means the whole root.
  let safeArea = null;
  const glowSources = new Set();
  // Printed things labels must keep clear of (the figure caption). Not
  // cleared with the scene's labels.
  const blockers = new Set();
  const v = new Vector3();

  function project(world) {
    v.copy(world).project(camera);
    const r = root.getBoundingClientRect();
    return { x: (v.x * 0.5 + 0.5) * r.width, y: (-v.y * 0.5 + 0.5) * r.height, behind: v.z > 1 };
  }

  function rectOf(points) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) {
      const s = project(p);
      x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  return {
    /**
     * @param {object} o
     * @param {string} o.id
     * @param {() => Vector3} o.anchor  world point
     * @param {string} o.html
     * @param {'part'|'value'} [o.kind] part names use the handwritten font
     * @param {number} [o.gap] px between anchor and label
     * @param {'above'|'below'|'left'} [o.prefer] which side to try first
     */
    add({ id, anchor, html, kind = 'value', gap = 10, prefer = 'above' }) {
      const el = document.createElement('div');
      el.className = `label label-${kind}`;
      el.innerHTML = html;
      root.append(el);
      labels.set(id, { el, anchor, gap, visible: true, prefer });
      return el;
    },
    setHtml(id, html) {
      const l = labels.get(id);
      if (l && l.el.innerHTML !== html) l.el.innerHTML = html;
    },
    setVisible(id, on) {
      const l = labels.get(id);
      if (l) {
        l.visible = on;
        l.el.hidden = !on;
      }
    },
    remove(id) {
      labels.get(id)?.el.remove();
      labels.delete(id);
    },
    clear() {
      for (const l of labels.values()) l.el.remove();
      labels.clear();
      glowSources.clear();
    },
    /** Keep labels inside this rectangle (CSS px). */
    setSafeArea(r) {
      safeArea = r;
    },
    /** A function returning a screen rectangle (CSS px) that labels keep clear of, or null. */
    addBlocker(fn) {
      blockers.add(fn);
    },
    /** A function returning world points that bound a glow. */
    addGlow(fn) {
      glowSources.add(fn);
    },
    /** Lay out every label. Call after the camera moves. */
    update() {
      const blocked = [];
      for (const fn of glowSources) {
        const pts = fn();
        if (pts.length) blocked.push(rectOf(pts));
      }
      for (const fn of blockers) {
        const r = fn();
        if (r) blocked.push(r);
      }
      const r = root.getBoundingClientRect();
      const area = safeArea ?? { x: 0, y: 0, w: r.width, h: r.height };
      for (const l of labels.values()) {
        if (!l.visible) continue;
        const a = project(l.anchor());
        // An object outside the visible stage keeps its label hidden.
        const offStage = a.behind || a.x < area.x || a.x > area.x + area.w || a.y < area.y || a.y > area.y + area.h;
        l.el.style.visibility = offStage ? 'hidden' : '';
        if (offStage) {
          l.rect = null;
          continue;
        }
        const w = l.el.offsetWidth;
        const h = l.el.offsetHeight;
        let chosen = null;
        const first = { below: 3, left: 2 }[l.prefer];
        const order = first !== undefined ? [CANDIDATES[first], ...CANDIDATES.filter((c, i) => i !== first)] : CANDIDATES;
        for (const [cx, cy] of order) {
          const rect = {
            x: a.x + cx * (w / 2 + l.gap) - w / 2,
            y: a.y + cy * (h / 2 + l.gap) - h / 2,
            w, h,
          };
          if (inside(rect, area) && !blocked.some((b) => overlaps(rect, b))) {
            chosen = rect;
            break;
          }
        }
        // Nothing is clear: take the first spot, pushed back on screen.
        if (!chosen) {
          const [cx, cy] = order[0];
          chosen = { x: a.x + cx * (w / 2 + l.gap) - w / 2, y: a.y + cy * (h / 2 + l.gap) - h / 2, w, h };
          chosen.x = Math.min(Math.max(chosen.x, area.x + EDGE), area.x + area.w - w - EDGE);
          chosen.y = Math.min(Math.max(chosen.y, area.y + EDGE), area.y + area.h - h - EDGE);
        }
        l.el.style.transform = `translate(${Math.round(chosen.x)}px, ${Math.round(chosen.y)}px)`;
        l.rect = chosen;
        blocked.push(chosen);
      }
    },
    /** For tests: every visible label's rectangle and every glow rectangle. */
    debugRects() {
      const glows = [...glowSources].map((fn) => fn()).filter((p) => p.length).map(rectOf);
      const r = root.getBoundingClientRect();
      const area = safeArea ?? { x: 0, y: 0, w: r.width, h: r.height };
      const printed = [...blockers].map((fn) => fn()).filter(Boolean);
      return { labels: [...labels.values()].filter((l) => l.visible && l.rect).map((l) => l.rect), glows, area, printed };
    },
  };
}
