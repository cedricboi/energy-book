// src/book/printer.js
// Prints laid-out HTML onto a 2D canvas, so the page text can live in the
// page's own texture (TECHNIQUES.md C1). The browser does the layout: we
// read where it put every word, box and rule, and draw the same thing with
// the canvas. One source of truth for the page design (the HTML and CSS),
// and the printed copy matches it word for word.
//
// What it draws: text (each word at its laid-out place, in its own font and
// colour), background colours, borders (solid, dashed, dotted, rounded),
// list numbers and bullets, images, and inline SVG paths. What it leaves
// out: anything `skip` returns true for (the live controls, which stay as
// real HTML so they can be pressed and typed in).

const cache = new WeakMap();
function style(el) {
  let cs = cache.get(el);
  if (!cs) {
    cs = getComputedStyle(el);
    cache.set(el, cs);
  }
  return cs;
}

const px = (v) => parseFloat(v) || 0;

/** rgba() / rgb() / #hex to { css, a }. Transparent gives a = 0. */
function colour(v) {
  if (!v || v === 'transparent') return { css: v, a: 0 };
  const m = v.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    const a = parts.length > 3 ? parseFloat(parts[3]) * (parts[3].endsWith('%') ? 0.01 : 1) : 1;
    return { css: v, a };
  }
  return { css: v, a: 1 };
}

function fontOf(cs, scale) {
  const caps = cs.fontVariantCaps && cs.fontVariantCaps !== 'normal' ? 'small-caps ' : '';
  return `${cs.fontStyle} ${caps}${cs.fontWeight} ${px(cs.fontSize) * scale}px ${cs.fontFamily}`;
}

function transformText(s, cs) {
  if (cs.textTransform === 'uppercase') return s.toUpperCase();
  if (cs.textTransform === 'lowercase') return s.toLowerCase();
  if (cs.textTransform === 'capitalize') return s.replace(/(^|\s)(\S)/g, (_, a, b) => a + b.toUpperCase());
  return s;
}

/** A pattern fill, url(#id), drawn as its base colour (the first rect's fill). */
function patternColour(svgEl, fill) {
  const m = /url\(["']?#([^"')]+)["']?\)/.exec(fill);
  if (!m) return fill;
  const base = svgEl.querySelector(`[id="${m[1]}"] rect`);
  return base ? getComputedStyle(base).fill : 'transparent';
}

/** An SVG shape as a canvas path. */
function shapePath(p) {
  const n = (a) => parseFloat(p.getAttribute(a)) || 0;
  const path = new Path2D();
  switch (p.tagName.toLowerCase()) {
    case 'path':
      return new Path2D(p.getAttribute('d') ?? '');
    case 'rect': {
      const rx = n('rx') || n('ry');
      if (rx && path.roundRect) path.roundRect(n('x'), n('y'), n('width'), n('height'), rx);
      else path.rect(n('x'), n('y'), n('width'), n('height'));
      return path;
    }
    case 'circle':
      path.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2);
      return path;
    case 'ellipse':
      path.ellipse(n('cx'), n('cy'), n('rx'), n('ry'), 0, 0, Math.PI * 2);
      return path;
    case 'line':
      path.moveTo(n('x1'), n('y1'));
      path.lineTo(n('x2'), n('y2'));
      return path;
    case 'polyline': {
      const pts = (p.getAttribute('points') ?? '').trim().split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < pts.length; i += 2) (i ? path.lineTo : path.moveTo).call(path, pts[i], pts[i + 1]);
      return path;
    }
    default:
      return null;
  }
}

const range = typeof document !== 'undefined' ? document.createRange() : null;

/**
 * Draw `root` and everything in it onto `ctx`.
 * @param {HTMLElement} root  laid out, upright (no transform at the time of printing)
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o
 * @param {number} o.x      canvas x of the root's top-left
 * @param {number} o.y      canvas y of the root's top-left
 * @param {number} o.scale  canvas px per CSS px
 * @param {(el: Element) => boolean} [o.skip]  leave this element (and its contents) out
 */
export function printElement(root, ctx, { x = 0, y = 0, scale = 1, skip = () => false }) {
  const origin = root.getBoundingClientRect();
  // Everything is drawn in CSS px under a scale, so type is set at its real
  // size: a variable font then picks the same optical size as on screen.
  const X = (v) => v - origin.left;
  const Y = (v) => v - origin.top;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  scale = 1;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if ('fontKerning' in ctx) ctx.fontKerning = 'normal';
  if ('textRendering' in ctx) ctx.textRendering = 'optimizeLegibility';

  function roundRect(r, radius) {
    ctx.beginPath();
    if (radius > 0 && ctx.roundRect) ctx.roundRect(r.x, r.y, r.w, r.h, radius);
    else ctx.rect(r.x, r.y, r.w, r.h);
  }

  function box(el, cs, alpha) {
    const rects = cs.display === 'inline' ? [...el.getClientRects()] : [el.getBoundingClientRect()];
    const bg = colour(cs.backgroundColor);
    const radius = px(cs.borderTopLeftRadius) * scale;
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({
      s,
      w: px(cs[`border${s}Width`]) * scale,
      style: cs[`border${s}Style`],
      c: colour(cs[`border${s}Color`]),
    }));
    for (const b of rects) {
      if (b.width <= 0 || b.height <= 0) continue;
      const r = { x: X(b.left), y: Y(b.top), w: b.width * scale, h: b.height * scale };
      if (bg.a > 0) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = bg.css;
        roundRect(r, radius);
        ctx.fill();
      }
      // An outline that is part of the design (the stamp's second ring), not a focus ring.
      const ow = px(cs.outlineWidth);
      const oc = colour(cs.outlineColor);
      if (ow > 0 && oc.a > 0 && cs.outlineStyle !== 'none' && !el.matches(':focus-visible')) {
        const off = px(cs.outlineOffset) + ow / 2;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = oc.css;
        ctx.lineWidth = ow;
        roundRect({ x: r.x - off, y: r.y - off, w: r.w + 2 * off, h: r.h + 2 * off }, radius > 0 ? radius + off : 0);
        ctx.stroke();
      }
      const drawn = sides.filter((d) => d.w > 0 && d.c.a > 0 && d.style !== 'none' && d.style !== 'hidden');
      if (!drawn.length) continue;
      ctx.globalAlpha = alpha;
      const same = drawn.length === 4 && drawn.every((d) => d.w === drawn[0].w && d.style === drawn[0].style && d.c.css === drawn[0].c.css);
      const dash = (d) => (d.style === 'dashed' ? [d.w * 3, d.w * 2.5] : d.style === 'dotted' ? [d.w, d.w * 1.6] : []);
      if (same) {
        const d = drawn[0];
        ctx.strokeStyle = d.c.css;
        ctx.lineWidth = d.w;
        ctx.setLineDash(dash(d));
        roundRect({ x: r.x + d.w / 2, y: r.y + d.w / 2, w: r.w - d.w, h: r.h - d.w }, Math.max(0, radius - d.w / 2));
        ctx.stroke();
        continue;
      }
      for (const d of drawn) {
        ctx.strokeStyle = d.c.css;
        ctx.lineWidth = d.w;
        ctx.setLineDash(dash(d));
        ctx.beginPath();
        const h = d.w / 2;
        if (d.s === 'Top') { ctx.moveTo(r.x, r.y + h); ctx.lineTo(r.x + r.w, r.y + h); }
        if (d.s === 'Bottom') { ctx.moveTo(r.x, r.y + r.h - h); ctx.lineTo(r.x + r.w, r.y + r.h - h); }
        if (d.s === 'Left') { ctx.moveTo(r.x + h, r.y); ctx.lineTo(r.x + h, r.y + r.h); }
        if (d.s === 'Right') { ctx.moveTo(r.x + r.w - h, r.y); ctx.lineTo(r.x + r.w - h, r.y + r.h); }
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
  }

  /** Baseline of a run of text whose box (font ascent + descent) is `r`. */
  function baseline(r, m) {
    const asc = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
    const desc = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;
    const h = r.height * scale;
    return Y(r.top) + (asc + desc > 0 ? (h * asc) / (asc + desc) : h * 0.8);
  }

  function word(s, r, cs) {
    const m = ctx.measureText(s);
    const by = baseline(r, m);
    const w = r.width * scale;
    // Match the browser's width exactly, so words end where the layout says.
    const k = m.width > 0 ? w / m.width : 1;
    if (Math.abs(k - 1) > 0.002 && Math.abs(k - 1) < 0.08) {
      ctx.save();
      ctx.translate(X(r.left), by);
      ctx.scale(k, 1);
      ctx.fillText(s, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(s, X(r.left), by);
    }
    if (cs.textDecorationLine?.includes('underline')) {
      const t = Math.max(1, px(cs.fontSize) * scale * 0.06);
      ctx.fillRect(X(r.left), by + t * 1.6, w, t);
    }
  }

  function text(node, cs, alpha) {
    const data = node.data;
    if (!/\S/.test(data)) return;
    const c = colour(cs.color);
    if (c.a <= 0) return;
    ctx.globalAlpha = alpha * Math.min(1, c.a);
    ctx.fillStyle = c.css;
    ctx.font = fontOf(cs, scale);
    const spaced = cs.letterSpacing && cs.letterSpacing !== 'normal' && px(cs.letterSpacing) !== 0;
    const re = /\S+/g;
    let m;
    while ((m = re.exec(data))) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      if (!spaced && rects.length === 1) {
        word(transformText(m[0], cs), rects[0], cs);
        continue;
      }
      // Tracked-out type, or a word broken over two lines: one letter at a time.
      for (let i = 0; i < m[0].length; i++) {
        range.setStart(node, m.index + i);
        range.setEnd(node, m.index + i + 1);
        const r = range.getClientRects()[0];
        if (!r || r.width === 0) continue;
        const ch = transformText(m[0][i], cs);
        ctx.fillText(ch, X(r.left), baseline(r, ctx.measureText(ch)));
      }
    }
  }

  function marker(li, cs, alpha) {
    const type = cs.listStyleType;
    if (!type || type === 'none' || cs.listStylePosition !== 'outside') return;
    const list = li.parentElement;
    const items = [...list.children].filter((e) => style(e).display === 'list-item');
    const start = Number(list.getAttribute('start') ?? 1);
    const n = start + items.indexOf(li);
    const label = type === 'decimal' ? `${n}.` : type === 'lower-alpha' ? `${String.fromCharCode(96 + n)}.` : type === 'circle' ? '◦' : type === 'square' ? '▪' : '•';
    // The first line of the item sets the marker's baseline.
    const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, { acceptNode: (t) => (/\S/.test(t.data) ? 1 : 3) });
    const first = walker.nextNode();
    if (!first) return;
    range.setStart(first, first.data.search(/\S/));
    range.setEnd(first, first.data.search(/\S/) + 1);
    const r = range.getClientRects()[0];
    if (!r) return;
    const c = colour(cs.color);
    ctx.globalAlpha = alpha * c.a;
    ctx.fillStyle = c.css;
    ctx.font = fontOf(cs, scale);
    const lr = li.getBoundingClientRect();
    const gap = ctx.measureText(' ').width;
    ctx.textAlign = 'right';
    ctx.fillText(label, X(lr.left) - gap, baseline(r, ctx.measureText(label)));
    ctx.textAlign = 'left';
  }

  function svg(el, alpha) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const vb = el.viewBox?.baseVal;
    const sx = vb && vb.width ? b.width / vb.width : 1;
    const sy = vb && vb.height ? b.height / vb.height : 1;
    // preserveAspectRatio="none" stretches the drawing to the box (a bar).
    const stretch = el.getAttribute('preserveAspectRatio') === 'none';
    const kx = stretch ? sx : Math.min(sx, sy);
    const ky = stretch ? sy : Math.min(sx, sy);
    ctx.save();
    ctx.translate(X(b.left) + (b.width - (vb?.width ?? 0) * kx) * scale * 0.5, Y(b.top) + (b.height - (vb?.height ?? 0) * ky) * scale * 0.5);
    ctx.scale(kx * scale, ky * scale);
    if (vb) ctx.translate(-vb.x, -vb.y);
    for (const p of el.querySelectorAll('path, rect, circle, ellipse, line, polyline')) {
      if (p.closest('defs, pattern')) continue;
      const cs = style(p);
      const path = shapePath(p);
      if (!path) continue;
      // A shape's own transform (an icon's rotated ellipse).
      const m = p.transform?.baseVal?.consolidate?.()?.matrix;
      ctx.save();
      if (m) ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
      const fill = colour(cs.fill === 'none' ? 'transparent' : patternColour(el, cs.fill));
      const stroke = colour(cs.stroke === 'none' ? 'transparent' : cs.stroke);
      if (fill.a > 0) {
        ctx.globalAlpha = alpha * fill.a;
        ctx.fillStyle = fill.css;
        ctx.fill(path);
      }
      if (stroke.a > 0) {
        ctx.globalAlpha = alpha * stroke.a;
        ctx.strokeStyle = stroke.css;
        ctx.lineWidth = px(cs.strokeWidth) || 1;
        ctx.lineCap = cs.strokeLinecap || 'butt';
        ctx.lineJoin = cs.strokeLinejoin || 'miter';
        ctx.stroke(path);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /** Form controls draw their own insides: a slider, a tick, a typed value. */
  function control(el, cs, alpha) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || cs.color;
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#F4EEDF';
    ctx.globalAlpha = alpha;
    const type = el.type;
    if (type === 'range') {
      const min = Number(el.min || 0);
      const max = Number(el.max || 100);
      const f = max > min ? (Number(el.value) - min) / (max - min) : 0;
      const cy = Y(b.top) + b.height / 2;
      const r = 9;
      ctx.fillStyle = ink;
      ctx.fillRect(X(b.left), cy - 0.75, b.width, 1.5);
      const cx = X(b.left) + r + f * (b.width - 2 * r);
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = paper;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
      ctx.fillStyle = ink;
      ctx.fill();
      return;
    }
    if (type === 'checkbox' || type === 'radio') {
      if (!el.checked) return;
      const cx = X(b.left) + b.width / 2;
      const cy = Y(b.top) + b.height / 2;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4.5, cy - 1);
      ctx.lineTo(cx - 1.5, cy + 2.2);
      ctx.lineTo(cx + 5, cy - 4.2);
      ctx.stroke();
      return;
    }
    const value = el instanceof HTMLSelectElement ? el.selectedOptions[0]?.textContent ?? '' : el.value;
    const shown = value || el.placeholder || '';
    if (!shown) return;
    const c = colour(cs.color);
    ctx.globalAlpha = alpha * c.a * (value ? 1 : 0.5);
    ctx.fillStyle = c.css;
    ctx.font = fontOf(cs, scale);
    const m = ctx.measureText(shown);
    const asc = m.fontBoundingBoxAscent ?? 0;
    const desc = m.fontBoundingBoxDescent ?? 0;
    const x0 = X(b.left) + px(cs.borderLeftWidth) + px(cs.paddingLeft);
    const top = el instanceof HTMLTextAreaElement ? Y(b.top) + px(cs.borderTopWidth) + px(cs.paddingTop) + asc : Y(b.top) + b.height / 2 + (asc - desc) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(b.left), Y(b.top), b.width, b.height);
    ctx.clip();
    ctx.fillText(shown.split(String.fromCharCode(10))[0], x0, top);
    ctx.restore();
  }

  function visit(el, alpha, isRoot) {
    const cs = style(el);
    if (cs.display === 'none' || el.hidden) return;
    if (!isRoot && skip(el)) return;
    // The root's own opacity is ignored: it may be faded out on screen
    // (turning, or stepped aside) while its printed copy stays on the page.
    const a = isRoot ? alpha : alpha * px(cs.opacity === '' ? '1' : cs.opacity);
    if (a < 0.01) return;
    const shown = cs.visibility === 'visible';
    // A 2D transform (a stamp pressed in at an angle): lay the element
    // upright for a moment and draw it through the same transform.
    let inline = null;
    if (!isRoot && cs.transform && cs.transform !== 'none' && !(el instanceof SVGElement)) {
      const m = new DOMMatrix(cs.transform);
      if (m.is2D) {
        const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
        inline = el.style.transform;
        el.style.transform = 'none';
        const b = el.getBoundingClientRect();
        const cx = X(b.left) + ox;
        const cy = Y(b.top) + oy;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        ctx.translate(-cx, -cy);
      }
    }
    if (el instanceof SVGSVGElement) {
      if (shown) svg(el, a);
      return;
    }
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      if (shown) {
        box(el, cs, a);
        control(el, cs, a);
      }
      return;
    }
    if (shown) {
      box(el, cs, a);
      if (cs.display === 'list-item') marker(el, cs, a);
      if (el instanceof HTMLImageElement && el.complete && el.naturalWidth) {
        const b = el.getBoundingClientRect();
        ctx.globalAlpha = a;
        ctx.drawImage(el, X(b.left), Y(b.top), b.width * scale, b.height * scale);
      }
    }
    const clips = !isRoot && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible');
    if (clips) {
      const b = el.getBoundingClientRect();
      ctx.save();
      ctx.beginPath();
      ctx.rect(X(b.left), Y(b.top), b.width * scale, b.height * scale);
      ctx.clip();
    }
    for (const child of el.childNodes) {
      if (child.nodeType === 3) {
        if (shown) text(child, cs, a);
      } else if (child.nodeType === 1) {
        visit(child, a, false);
      }
    }
    if (clips) ctx.restore();
    if (inline !== null) {
      ctx.restore();
      el.style.transform = inline;
    }
  }

  visit(root, 1, true);
  ctx.restore();
}

