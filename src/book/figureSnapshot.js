// src/book/figureSnapshot.js
// When a page turns, its diagram folds flat onto the paper (book.js
// foldDown) and is then printed there, so the turning leaf carries the
// drawing away with it (TECHNIQUES.md C2, the leaving half). This renders
// the flattened drawing from straight above, at the page print's own scale,
// and returns it as a canvas laid out like the right page's print sheet.
import {
  OrthographicCamera, WebGLRenderTarget, Vector2, Vector3, Color, HalfFloatType,
  Mesh, PlaneGeometry, ShaderMaterial, Scene,
} from 'three';
import { BOOK } from '../objects/book.js';
import { inkUniforms } from '../ink/inkMaterial.js';
import { PRINT_SIZE } from './pagePrint.js';

// The drawing renders in high range (glows go above 1). This pass turns it
// into a print: colours above 1 keep their hue, glows (added on with
// little alpha) count their brightness as coverage, alpha is made straight,
// colour goes to sRGB, and rows are flipped so the head of the page is first.
const finish = new ShaderMaterial({
  uniforms: { tSrc: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tSrc;
    varying vec2 vUv;
    vec3 toSrgb(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
    }
    void main() {
      vec4 t = texture2D(tSrc, vec2(vUv.x, 1.0 - vUv.y));
      t.rgb /= max(1.0, max(t.r, max(t.g, t.b)));
      float a = clamp(max(t.a, 0.7 * max(t.r, max(t.g, t.b))), 0.0, 1.0);
      vec3 c = a > 0.0 ? clamp(t.rgb / max(a, max(t.r, max(t.g, t.b))), 0.0, 1.0) : vec3(0.0);
      gl_FragColor = vec4(toSrgb(c), a);
    }`,
  depthTest: false,
  depthWrite: false,
});
const quad = new Mesh(new PlaneGeometry(2, 2), finish);
quad.frustumCulled = false;
const quadScene = new Scene();
quadScene.add(quad);

export function createFigureSnapshot(renderer) {
  const { pageW, pageH, gutter } = BOOK;
  const [W, H] = PRINT_SIZE;
  const cam = new OrthographicCamera(-pageW / 2, pageW / 2, pageH / 2, -pageH / 2, 0.01, 2);
  cam.position.set(gutter + pageW / 2, 1, 0);
  cam.up.set(0, 0, -1); // the head of the page at the top of the image
  cam.lookAt(gutter + pageW / 2, 0, 0);
  cam.updateMatrixWorld();
  let target = null;
  let print = null;
  const pixels = new Uint8Array(W * H * 4);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const a = new Vector3();
  const b = new Vector3();
  const clear = new Color();

  /**
   * @param {import('three').Object3D} group  the scene's drawing (already folded flat)
   * @param {import('three').Camera} view     the camera the student sees through
   * @returns {HTMLCanvasElement}
   */
  return function snapshot(group, view) {
    target ??= new WebGLRenderTarget(W, H, { depthBuffer: true, type: HalfFloatType });
    print ??= new WebGLRenderTarget(W, H, { depthBuffer: false });
    // Lines keep the weight they have on screen: scale their pixel width by
    // how many print pixels one screen pixel covers across the page.
    const size = renderer.getDrawingBufferSize(new Vector2());
    const y = BOOK.boardT + 0.012;
    a.set(gutter, y, 0).project(view);
    b.set(gutter + pageW, y, 0).project(view);
    const screenPx = Math.hypot((b.x - a.x) * size.x, (b.y - a.y) * size.y) / 2;
    const k = screenPx > 1 ? W / screenPx : 1;
    const px = inkUniforms.uInkPx.value;
    const res = inkUniforms.uResolution.value.clone();
    inkUniforms.uInkPx.value = px * k;
    inkUniforms.uResolution.value.set(W, H);

    const visible = group.visible;
    group.visible = true;
    const prevTarget = renderer.getRenderTarget();
    renderer.getClearColor(clear);
    const prevAlpha = renderer.getClearAlpha();
    const prevAutoClear = renderer.autoClear;
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = true;
    renderer.clear();
    renderer.render(group, cam);
    finish.uniforms.tSrc.value = target.texture;
    renderer.setRenderTarget(print);
    renderer.clear();
    renderer.render(quadScene, cam);
    renderer.readRenderTargetPixels(print, 0, 0, W, H, pixels);
    renderer.setRenderTarget(prevTarget);
    renderer.setClearColor(clear, prevAlpha);
    renderer.autoClear = prevAutoClear;
    group.visible = visible;
    inkUniforms.uInkPx.value = px;
    inkUniforms.uResolution.value.copy(res);

    const img = new ImageData(new Uint8ClampedArray(pixels.buffer), W, H);
    ctx.putImageData(img, 0, 0);
    return canvas;
  };
}
