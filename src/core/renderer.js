// src/core/renderer.js
// The WebGL renderer. Tone mapping is done by core/post.js, so the renderer
// itself does none. Returns null if WebGL is not available.
import { WebGLRenderer, SRGBColorSpace, NoToneMapping, PCFShadowMap } from 'three';

export function createRenderer(canvas, tier) {
  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      powerPreference: 'high-performance',
      // Anti-aliasing is SMAA in post. The composer has its own depth buffer.
      antialias: false,
      stencil: false,
      depth: false,
    });
  } catch (err) {
    console.warn('WebGL is not available:', err);
    return null;
  }
  // Cutaways clip one object open with a plane (Lesson 1's battery).
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(tier.dpr); // already capped at 2 or lower (CLAUDE.md section 9)
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  // three r18x removed PCFSoftShadowMap. PCFShadowMap with a light's
  // shadow.radius gives the soft edge.
  renderer.shadowMap.type = PCFShadowMap;
  return renderer;
}

/** True if this browser can make a WebGL2 context at all. */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!c.getContext('webgl2');
  } catch {
    return false;
  }
}
