// src/core/post.js
// Post-processing with the pmndrs postprocessing library, on a HalfFloat
// frame buffer so the scene stays HDR until tone mapping.
//
//   RenderPass -> N8AO (high tier only) -> [tone mapping, vignette, still grain] -> SMAA
//
// Phase 4 inserts bloom (luminanceThreshold 1) before tone mapping.
// ?debug=hot replaces the chain with a luminance view: grey for normal
// pixels, orange above 0.9, red above 1. Only energy may ever show red.
import {
  EffectComposer, RenderPass, EffectPass, Effect, SMAAEffect, SMAAPreset,
  ToneMappingEffect, ToneMappingMode, VignetteEffect, BloomEffect,
} from 'postprocessing';
import { HalfFloatType, Uniform } from 'three';
import { N8AOPostPass } from 'n8ao';

/**
 * Film grain that does not change from frame to frame. The library's
 * NoiseEffect animates with time, which would mean rendering every frame and
 * break render-on-demand (CLAUDE.md section 9).
 */
class StillGrainEffect extends Effect {
  constructor({ amount = 0.012 } = {}) {
    super('StillGrainEffect', /* glsl */ `
      uniform float amount;
      float grainHash(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 px = floor(uv * resolution);
        float n = grainHash(px) + grainHash(px + vec2(41.0, 17.0)) - 1.0;
        outputColor = vec4(inputColor.rgb + n * amount, inputColor.a);
      }`, { uniforms: new Map([['amount', new Uniform(amount)]]) });
  }
}

/** Debug view of linear scene luminance before tone mapping. */
class HotPixelEffect extends Effect {
  constructor() {
    super('HotPixelEffect', /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float l = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        vec3 c = vec3(clamp(l * 0.5, 0.0, 1.0));
        if (l > 1.0) c = vec3(1.0, 0.0, 0.0);
        else if (l > 0.9) c = vec3(1.0, 0.5, 0.0);
        outputColor = vec4(c, 1.0);
      }`);
  }
}

export const TONE_MAPPINGS = {
  agx: ToneMappingMode.AGX,
  aces: ToneMappingMode.ACES_FILMIC,
};

export function createPost(renderer, scene, camera, { tier, toneMapping = 'aces' }) {
  const composer = new EffectComposer(renderer, { frameBufferType: HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  let ao = null;
  if (tier.ao) ao = addAO();

  function addAO() {
    const pass = new N8AOPostPass(scene, camera, 1, 1);
    // Scene units are metres and the book is about 0.43 m wide.
    pass.configuration.aoRadius = 0.05;
    pass.configuration.distanceFalloff = 0.4;
    pass.configuration.intensity = 2.2;
    // Tone mapping comes later in the chain, so AO must not gamma-correct.
    pass.configuration.gammaCorrection = false;
    pass.setQualityMode('Medium');
    composer.addPass(pass, 1);
    return pass;
  }

  const toneMappingEffect = new ToneMappingEffect({ mode: TONE_MAPPINGS[toneMapping] ?? ToneMappingMode.AGX });
  const vignette = new VignetteEffect({ offset: 0.45, darkness: 0.25 });
  const grain = new StillGrainEffect({ amount: 0.007 });
  // Bloom on the HDR image, before tone mapping. Only energy is above a
  // luminance of 1, so only energy blooms (CLAUDE.md section 4). Lower tiers
  // use fewer mip levels, which is the mipmap-blur equivalent of a lower
  // bloom resolution.
  const bloom = new BloomEffect({
    luminanceThreshold: 1,
    luminanceSmoothing: 0.05,
    mipmapBlur: true,
    intensity: 0.9,
    radius: 0.62,
    levels: { high: 8, medium: 6, low: 5 }[tier.name] ?? 6,
  });
  const mainPass = new EffectPass(camera, bloom, toneMappingEffect, vignette, grain);
  const smaaPass = new EffectPass(camera, new SMAAEffect({ preset: SMAAPreset.HIGH }));
  // The composer sends the last pass in its list to the screen, so the debug
  // view swaps passes in and out rather than toggling `enabled`.
  const hotPass = new EffectPass(camera, new HotPixelEffect());
  let hot = false;
  composer.addPass(mainPass);
  composer.addPass(smaaPass);

  return {
    composer,
    render(dt = 0) {
      composer.render(dt);
    },
    setSize(width, height) {
      composer.setSize(width, height);
    },
    setTier(t) {
      if (t.ao && !ao) ao = addAO();
      if (ao) ao.enabled = t.ao;
    },
    setDebugHot(on) {
      if (on === hot) return;
      hot = on;
      if (on) {
        composer.removePass(mainPass);
        composer.removePass(smaaPass);
        composer.addPass(hotPass);
      } else {
        composer.removePass(hotPass);
        composer.addPass(mainPass);
        composer.addPass(smaaPass);
      }
    },
    setToneMapping(name) {
      toneMappingEffect.mode = TONE_MAPPINGS[name] ?? ToneMappingMode.AGX;
    },
  };
}
