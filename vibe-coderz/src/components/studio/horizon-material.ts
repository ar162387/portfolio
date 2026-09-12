import * as THREE from "three";

/** A small transparent disc: light spirals inward toward the opaque core. */
export function createHorizonMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: { time: { value: 0 } },
    vertexShader: `
      varying vec2 horizonUv;
      void main() {
        horizonUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 horizonUv;
      uniform float time;
      void main() {
        vec2 p = (horizonUv - .5) * 3.3;
        float r = length(p);
        if (r < .995 || r > 1.6) discard;
        float angle = atan(p.y, p.x);
        float rim = exp(-pow((r - 1.016) / .016, 2.0));
        float glow = exp(-pow((r - 1.065) / .14, 2.0));
        // Advancing this phase moves the filaments inward, never outward.
        float phase = angle * 7.0 + log(max(r, 1.0)) * 38.0 + time * 2.2;
        float filament = pow(.5 + .5 * sin(phase), 7.0);
        float flow = filament * exp(-pow((r - 1.16) / .18, 2.0));
        float asymmetry = .85 + .15 * sin(angle - .4);
        float alpha = clamp(rim + glow * .66 + flow * .42, 0.0, 1.0);
        alpha *= asymmetry * (1.0 - smoothstep(1.38, 1.6, r));
        vec3 gold = mix(vec3(.50, .21, .035), vec3(1.0, .72, .28), rim);
        gl_FragColor = vec4(gold, alpha);
        #include <colorspace_fragment>
      }
    `,
  });
}
