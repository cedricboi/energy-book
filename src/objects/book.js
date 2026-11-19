// src/objects/book.js
// An open A4 hardback notebook lying flat, built in code at real-world scale
// (metres). Two curved pages over page blocks, cloth-covered boards, a cloth
// spine with headbands, and a ribbon bookmark.
//
// Coordinates: y is up, the desk top is y = 0, the spine runs along z through
// x = 0, the right page is +x, the foot of the page (nearest the reader) is +z.
import {
  Group, Mesh, BoxGeometry, PlaneGeometry, ExtrudeGeometry, Shape, CylinderGeometry,
  BufferGeometry, Float32BufferAttribute, CatmullRomCurve3, Vector3,
  MeshLambertMaterial, MeshStandardMaterial, Color, DoubleSide,
} from 'three';
import { createPaperMaterial, createPageEdgeMaterial, injectVaryings } from '../ink/paper.js';

export const BOOK = Object.freeze({
  pageW: 0.21, // A4 width
  pageH: 0.297, // A4 height
  boardT: 0.0025, // board thickness
  overhang: 0.003, // board overhang beyond the pages
  gutter: 0.0007, // half the gap between the two page blocks
});

/** Overall size of the open book, for camera framing. */
export const BOOK_EXTENT = Object.freeze({
  width: 2 * (BOOK.gutter + BOOK.pageW + BOOK.overhang),
  depth: BOOK.pageH + 2 * BOOK.overhang,
});

/**
 * Height of the page surface above the board, from s = 0 at the spine to
 * s = 1 at the fore-edge. The page dips into the gutter, rises quickly, then
 * flattens and falls a little towards the fore-edge.
 */
export function pageProfile(s) {
  return 0.0004 + 0.0122 * (1 - Math.exp(-s / 0.075)) - 0.0025 * s;
}

/** The slight bow along the page: its middle sits a fraction higher. */
export function pageBow(z) {
  return 0.0007 * Math.cos((z / BOOK.pageH) * Math.PI);
}

/** World-space height of the top page surface at (x, z), in metres. */
export function pageSurfaceY(x, z = 0) {
  const s = Math.min(1, Math.max(0, (Math.abs(x) - BOOK.gutter) / BOOK.pageW));
  const zc = Math.min(BOOK.pageH / 2, Math.max(-BOOK.pageH / 2, z));
  return BOOK.boardT + pageProfile(s) + 0.00025 + pageBow(zc);
}

function clothMaterial(hex) {
  const m = new MeshLambertMaterial({ color: new Color(hex) });
  m.onBeforeCompile = (shader) => {
    injectVaryings(shader);
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      /* glsl */ `#include <color_fragment>
      {
        // Book cloth: a faint woven texture plus soft wear. Fades below a pixel.
        vec2 p = vElWorld.xz * 1000.0 / 0.6;
        float w = length(fwidth(p));
        float weave = (sin(p.x * 6.2832) * sin(p.y * 6.2832)) * 0.5 + 0.5;
        float vis = 1.0 - smoothstep(0.35, 0.9, w);
        float wear = el_fbm(vElWorld.xz * 60.0);
        vec3 c = diffuseColor.rgb;
        c *= 1.0 + (weave - 0.5) * 0.12 * vis;
        c *= 0.9 + 0.2 * wear;
        diffuseColor.rgb = c;
      }`,
    );
  };
  m.customProgramCacheKey = () => 'el-cloth';
  return m;
}

/** The page block of the right-hand side, as an extruded cross-section. */
function pageBlockGeometry() {
  const { pageW, pageH, boardT, gutter } = BOOK;
  const shape = new Shape();
  const N = 48;
  shape.moveTo(gutter, boardT);
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    shape.lineTo(gutter + s * pageW, boardT + pageProfile(s));
  }
  shape.lineTo(gutter + pageW, boardT);
  shape.lineTo(gutter, boardT);
  const g = new ExtrudeGeometry(shape, { depth: pageH, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -pageH / 2);
  return g;
}

/** The top page of the right-hand side, curved to sit just above the block. */
function pageSurfaceGeometry() {
  const { pageW, pageH, boardT, gutter } = BOOK;
  const g = new PlaneGeometry(pageW, pageH, 96, 16);
  g.rotateX(-Math.PI / 2);
  g.translate(gutter + pageW / 2, 0, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const s = (x - gutter) / pageW;
    pos.setY(i, boardT + pageProfile(s) + 0.00025 + pageBow(z));
  }
  g.computeVertexNormals();
  return g;
}

/** A flat ribbon following a curve. `side` is the fixed width direction. */
function ribbonGeometry(points, width, side) {
  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  const N = 120;
  const verts = [];
  const uvs = [];
  const idx = [];
  const half = side.clone().normalize().multiplyScalar(width / 2);
  for (let i = 0; i <= N; i++) {
    const p = curve.getPointAt(i / N);
    verts.push(p.x - half.x, p.y - half.y, p.z - half.z, p.x + half.x, p.y + half.y, p.z + half.z);
    uvs.push(0, i / N, 1, i / N);
    if (i < N) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createBook() {
  const { pageW, pageH, boardT, overhang, gutter } = BOOK;
  const book = new Group();
  book.name = 'book';

  const cloth = clothMaterial('#1F2A44');

  // Boards: one cloth-covered slab under both page blocks.
  const boards = new Mesh(new BoxGeometry(BOOK_EXTENT.width, boardT, BOOK_EXTENT.depth), cloth);
  boards.position.y = boardT / 2;
  boards.castShadow = true;
  boards.receiveShadow = true;
  book.add(boards);

  // Page blocks and top pages. The left side is the right side mirrored.
  const blockGeo = pageBlockGeometry();
  const pageGeo = pageSurfaceGeometry();
  const edgeMat = createPageEdgeMaterial();
  for (const side of [1, -1]) {
    const block = new Mesh(blockGeo, edgeMat);
    block.scale.x = side;
    block.castShadow = true;
    block.receiveShadow = true;
    book.add(block);

    const page = new Mesh(pageGeo, createPaperMaterial({ width: pageW, height: pageH, spineU: 0, seed: side > 0 ? 1 : 2 }));
    page.scale.x = side;
    page.receiveShadow = true;
    page.castShadow = true;
    page.name = side > 0 ? 'page-right' : 'page-left';
    book.add(page);
  }

  // Cloth spine lining, seen in the gutter between the blocks.
  const spine = new Mesh(new CylinderGeometry(0.0016, 0.0016, pageH + 2 * overhang, 12, 1, false), cloth);
  spine.rotation.x = Math.PI / 2;
  spine.position.set(0, boardT, 0);
  spine.receiveShadow = true;
  book.add(spine);

  // Headbands at the head and tail of the spine (small striped cords).
  const bandMat = new MeshLambertMaterial({ color: new Color('#8E3B33') });
  for (const z of [-pageH / 2 - 0.0005, pageH / 2 + 0.0005]) {
    const band = new Mesh(new CylinderGeometry(0.0016, 0.0016, 2 * gutter + 0.009, 12), bandMat);
    band.rotation.z = Math.PI / 2;
    band.position.set(0, boardT + 0.0025, z);
    book.add(band);
  }

  // Ribbon bookmark: comes out of the gutter at the head, lies across the
  // right page, drops over the foot of the page block and the board, and
  // rests on the desk.
  const lift = 0.0003;
  const footZ = pageH / 2;
  const onPage = (x, z) => new Vector3(x, pageSurfaceY(x, z) + lift, z);
  const pts = [
    // It runs down beside the gutter, clear of the printed text and ledger.
    onPage(0.0032, -footZ + 0.003),
    onPage(0.0036, -footZ * 0.6),
    onPage(0.004, -footZ * 0.2),
    onPage(0.0045, footZ * 0.2),
    onPage(0.005, footZ * 0.6),
    onPage(0.0055, footZ - 0.002),
    new Vector3(0.0058, pageSurfaceY(0.0058, footZ) - 0.003, footZ + 0.0012),
    new Vector3(0.0065, boardT + 0.0012, footZ + overhang + 0.0015),
    new Vector3(0.008, 0.0018, footZ + overhang + 0.008),
    new Vector3(0.013, 0.0006, footZ + 0.05),
    new Vector3(0.024, 0.0006, footZ + 0.085),
  ];
  const ribbon = new Mesh(
    ribbonGeometry(pts, 0.0055, new Vector3(1, 0, -0.08)),
    new MeshStandardMaterial({ color: new Color('#7A2328'), roughness: 0.7, metalness: 0, side: DoubleSide }),
  );
  // The ribbon lies flat on the page, so it casts no shadow of its own.
  ribbon.castShadow = false;
  ribbon.receiveShadow = true;
  ribbon.name = 'ribbon';
  book.add(ribbon);

  return book;
}
