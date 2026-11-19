// src/scenes/energyKit.js
// The energy picture every lesson scene shares: a row of store jars at the
// back of the right-hand page, flows between them, the display ledger, the
// ledger bar along the front edge and the jar labels. A scene supplies its
// own objects and physics model and reports the model's store values here.
import { Vector3, Color } from 'three';
import { createStoreJar } from '../energy/storeJar.js';
import { createFlowPath } from '../energy/flow.js';
import { createLedgerBar } from '../energy/ledgerBar.js';
import { createDisplayLedger } from '../energy/displayLedger.js';
import { STORES, iconSvg, glowColour } from '../energy/palette.js';
import { formatQuantity } from '../physics/format.js';
import { pageSurfaceY, BOOK } from '../objects/book.js';
import { createStand } from './stand.js';

/** Back row of the right-hand page, where the jars stand. */
export const JAR_ROW_Z = -0.07;

/**
 * @param {object} ctx  scene context from the book
 * @param {object} o
 * @param {string[]} o.stores          store ids, left to right
 * @param {number} o.scale             joules for a full jar (one scale per page)
 * @param {Record<string, number>} o.start  starting values
 * @param {{ from: string, to: string, pathway: string, moved: Function }[]} o.transfers
 * @param {number} [o.travel]          seconds a packet takes, in model time
 * @param {string} [o.caption]
 * @param {number} [o.total]           total for the ledger line (defaults to the start sum)
 * @param {number} [o.jarSize]         drawing size of the jars
 * @param {number} [o.rowZ]            how far back the jars stand
 * @param {boolean} [o.ledger]         show the ledger bar
 * @param {boolean} [o.values]         show joules (false for lessons before any equation)
 * @param {number[]} [o.xs]            x positions for the jars, if not evenly spaced
 * @param {boolean} [o.compactLabels]  two-line names, staggered heights (many jars)
 * @param {boolean} [o.stand]          stand the jars on a store stand with a printed card above each
 * @param {number} [o.jarY]            height of the jars' base above the page (on a shelf)
 * @param {(store: string, jar: object) => (() => Vector3[])} [o.card]  print each jar's label on a
 *   paper card with these world corners, instead of a floating label
 */
export function createEnergyKit(ctx, { stores, scale, start, transfers = [], travel = 0.3, caption, total, jarSize = 0.6, rowZ = JAR_ROW_Z, ledger: withLedger = true, values: withValues = true, xs, compactLabels = stores.length >= 4, jarY = 0, card, stand: withStand = false }) {
  const { scene, overlay } = ctx;
  const n = stores.length;
  const span = Math.min(0.17, 0.055 * (n - 1));
  const x0 = BOOK.gutter + BOOK.pageW / 2 - span / 2;
  const jarXs = stores.map((s, i) => xs?.[i] ?? (n === 1 ? BOOK.gutter + BOOK.pageW / 2 : x0 + (span * i) / (n - 1)));
  // The store stand: the jars stand on its shelf, and their labels are
  // printed on the cards above them.
  const standKit = withStand ? createStand(ctx, { xs: jarXs, z: rowZ, jarSize }) : null;
  if (standKit) {
    jarY = standKit.shelf;
    card = (s) => standKit.cardQuad(stores.indexOf(s));
  }
  const jars = {};
  stores.forEach((s, i) => {
    const x = jarXs[i];
    const jar = createStoreJar({ store: s, scale, value: start[s] ?? 0, size: jarSize });
    jar.group.position.set(x, pageSurfaceY(x, rowZ) + jarY, rowZ);
    scene.add(jar.group);
    jars[s] = jar;
  });

  // Flows run between jar sides at mid height, bowing towards the reader,
  // so they never pass through the labels above the jars.
  const flows = transfers.map((tr) => {
    const a = jars[tr.from].group.position;
    const b = jars[tr.to].group.position;
    const dir = Math.sign(b.x - a.x) || 1;
    const side = 0.035 * jarSize;
    const lift = tr.lift ?? 0.03;
    const from = a.clone().add(new Vector3(dir * side, lift, 0));
    const to = b.clone().add(new Vector3(-dir * side, lift, 0));
    const f = createFlowPath({
      from, to, pathway: tr.pathway, fromStore: tr.from, toStore: tr.to,
      arc: tr.arc ?? 0.02 + Math.abs(b.x - a.x) * 0.15, bulge: tr.bulge ?? new Vector3(0, 0.6, 1), travel,
    });
    scene.add(f.pathLine, f.points);
    return f;
  });

  const dl = createDisplayLedger({ start, travel, transfers });
  flows.forEach((f, i) => {
    dl.ledgers[i] = f.ledger;
  });

  stores.forEach((s, i) => {
    const stagger = compactLabels && i % 2 === 1 ? 0.03 : 0;
    if (card) overlay.addPrinted({ id: `jar-${s}`, quad: card(s, jars[s]), size: [220, 115], className: `jar-card${withValues ? '' : ' no-values'}` });
    else overlay.add({ id: `jar-${s}`, anchor: () => jars[s].labelPoint().add(new Vector3(0, stagger, 0)), html: '', gap: 4 });
    overlay.addGlow(() => jars[s].glowCorners());
  });
  const ledgerTotal = total ?? stores.reduce((a, s) => a + (start[s] ?? 0), 0);
  const ledger = withLedger
    ? createLedgerBar(ctx.ledgerRoot, { stores, total: ledgerTotal, caption: caption ?? 'Energy ledger. The dark line marks the total.' })
    : { update() {}, setTotal() {}, destroy() {}, el: document.createElement('div') };
  // With the values printed on the jar cards, the ledger is a slim bar and its total line.
  if (card) ledger.el.classList.add('with-cards');

  let shown = dl.snapshot();
  let glow = 0;
  // While a question asks for these values, show the stores without numbers
  // or fills. While a question asks for the stores themselves, hide the names.
  let hideValues = false;
  let hideNames = false;

  function refresh() {
    for (const s of stores) {
      const val = Math.max(0, shown.display[s] ?? 0);
      jars[s].setValue(val);
      if (hideValues) jars[s].liquid.visible = false;
      jars[s].setGlowFade(glow);
      const full = compactLabels || card ? STORES[s].short.replace(' potential', '<br>potential') : STORES[s].short;
      const name = hideNames ? 'which store?' : `${iconSvg(s, card ? 24 : 16)} ${full}`;
      if (card) {
        overlay.setHtml(`jar-${s}`, `<span class="card-name">${name}</span>${withValues ? `<span class="card-val">${hideValues ? '?' : formatQuantity(val, 'J', 2)}</span>` : ''}`);
        continue;
      }
      overlay.setHtml(`jar-${s}`, `<span class="jar-name">${name}</span>${withValues ? `<span class="jar-val">${hideValues ? '?' : formatQuantity(val, 'J', 2)}</span>` : ''}`);
    }
    ledger.update(shown.display, shown.transit);
    ledger.el.classList.toggle('values-hidden', hideValues);
    lightPaper();
  }

  // Coloured light from the fullest jars falls on the paper around them.
  const tmpPos = new Vector3();
  const tmpCol = new Color();
  function lightPaper() {
    const lights = ctx.energyLights;
    if (!lights) return;
    const ranked = hideValues ? [] : stores
      .map((s) => ({ s, f: Math.min(1, (shown.display[s] ?? 0) / jars[s].scale) }))
      .filter((r) => r.f > 0.01)
      .sort((a, b) => b.f - a.f);
    lights.forEach((l, i) => {
      const r = ranked[i];
      if (!r) {
        l.intensity = 0;
        return;
      }
      const jar = jars[r.s];
      jar.liquid.getWorldPosition(tmpPos);
      tmpPos.y += jar.fillHeight() * jar.group.scale.y * 0.5;
      l.position.copy(tmpPos);
      tmpCol.setRGB(...glowColour(r.s, 1));
      l.color.copy(tmpCol);
      l.intensity = 0.0009 * (0.35 + 0.65 * r.f) * glow;
    });
  }
  refresh();

  return {
    jars,
    flows,
    ledger,
    objects: [...(standKit?.objects ?? []), ...stores.map((s) => jars[s])],
    /** Feed the model's latest values (model time step dt). */
    step(values, dt, screenDt) {
      shown = dl.step(values, dt);
      for (const f of flows) f.step(0);
      const flowing = flows.some((f) => f.active);
      for (const s of stores) jars[s].animate(screenDt, flowing);
      refresh();
      return flowing;
    },
    /** Jump straight to values with nothing in transit (after a reset or a slider change). */
    set(values) {
      dl.reset(values);
      for (const f of flows) f.clear();
      shown = dl.snapshot();
      refresh();
    },
    setHideValues(on) {
      hideValues = on;
      refresh();
    },
    setHideNames(on) {
      hideNames = on;
      refresh();
    },
    setTotal(t) {
      ledger.setTotal(t);
      refresh();
    },
    setScale(joules) {
      for (const s of stores) jars[s].setScale(joules);
      refresh();
    },
    /** Fade the glow in once the jars have drawn in. Returns true while fading. */
    fadeGlow(dt, ready) {
      // Tubes keep glowing briefly after their energy lands, then fade.
      let tubes = false;
      for (const f of flows) {
        if (f.glowing && !f.active) {
          f.step(0);
          tubes = tubes || f.glowing;
        }
      }
      if (!ready || glow >= 1) return tubes;
      glow = Math.min(1, glow + dt / 0.5);
      refresh();
      return glow < 1 || tubes;
    },
    setGlow(g) {
      glow = g;
      refresh();
    },
    snapshot: () => shown,
    destroy() {
      for (const l of ctx.energyLights ?? []) l.intensity = 0;
      ledger.destroy();
    },
  };
}
