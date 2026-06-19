"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import * as THREE from "three";

// smoothstep ramp: fades in once over [a, b] then holds at full until the end
function smoothstep(a: number, b: number, t: number) {
    const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Analytic Interstellar / Gargantua black hole rendered in a fragment shader on
 * a camera-facing quad. Absolute-black event horizon, an inclined accretion disk
 * that wraps over the top/bottom (the lensed ring), a bright white-blue photon
 * ring on the silhouette, Doppler beaming, and relativistic jets. Transparent
 * everywhere else so the starfield shows through; opaque only at the horizon so
 * the hole actually occludes the stars.
 */
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    // Early-out keeps the material compiled & cheap when the hole isn't showing
    if (uOpacity < 0.001) discard;

    vec2 p = (vUv - 0.5) * 2.0;   // -1..1
    float r = length(p);
    float ang = atan(p.y, p.x);

    vec3 col = vec3(0.0);
    float alpha = 0.0;

    // --- geometry params ---
    float rs   = 0.20;   // event horizon radius
    float sinv = 0.34;   // inclination squash (smaller = more edge-on)
    float rin  = 0.27;   // disk inner radius
    float rout = 0.95;   // disk outer radius

    // --- accretion disk: inclined ring -> projects to a wide flat ellipse ---
    float dr = sqrt(p.x * p.x + (p.y * p.y) / (sinv * sinv));

    float swirl = ang * 3.0 + uTime * 1.4 - dr * 7.0;
    float turb = 0.55 + 0.45 * sin(swirl);
    turb *= 0.65 + 0.55 * hash(vec2(floor(swirl * 2.0), floor(dr * 22.0)));

    float diskBand = smoothstep(rin, rin + 0.04, dr) * (1.0 - smoothstep(rout - 0.30, rout, dr));
    float temp = 1.0 - smoothstep(rin, rout, dr);

    vec3 cold = vec3(0.85, 0.25, 0.04);
    vec3 mid  = vec3(1.0, 0.6, 0.2);
    vec3 hot  = vec3(1.0, 0.95, 0.85);
    vec3 diskCol = mix(cold, mid, smoothstep(0.0, 0.5, temp));
    diskCol = mix(diskCol, hot, smoothstep(0.5, 1.0, temp));

    // Doppler beaming: approaching side (x > 0) brighter and bluer
    float doppler = 0.45 + 1.0 * smoothstep(-1.0, 1.0, p.x);
    diskCol = mix(diskCol, diskCol * vec3(0.8, 0.9, 1.35), smoothstep(0.0, 1.0, p.x) * 0.5);

    float diskI = diskBand * temp * turb * doppler * 1.5;

    // --- event horizon ---
    float hole = smoothstep(rs + 0.006, rs - 0.02, r); // 1 inside silhouette
    float front = step(p.y, 0.0);                       // lower half = disk in front

    // hide the disk that sits behind the hole (upper half, inside silhouette)
    float diskVisible = diskI * (1.0 - hole * (1.0 - front));
    col += diskCol * diskVisible;
    alpha = max(alpha, clamp(diskVisible, 0.0, 1.0));

    // pure black where the horizon covers the far disk
    col = mix(col, vec3(0.0), hole * (1.0 - front));
    alpha = max(alpha, hole); // opaque hole occludes stars

    // --- photon ring (tight gravitational lensing ring) ---
    float ring = smoothstep(0.028, 0.0, abs(r - rs));
    col += vec3(0.75, 0.86, 1.0) * ring * 1.6;
    alpha = max(alpha, ring);

    // soft lensing halo just outside the ring
    float halo = smoothstep(0.12, 0.0, abs(r - (rs + 0.06))) * 0.35;
    col += vec3(0.45, 0.65, 1.0) * halo;
    alpha = max(alpha, halo * 0.8);

    // --- relativistic jets (electric blue, top & bottom) ---
    float jetW = 0.03 + 0.03 * abs(p.y);
    float jet = smoothstep(jetW, 0.0, abs(p.x))
              * smoothstep(rs - 0.02, rs + 0.08, abs(p.y))
              * (1.0 - smoothstep(0.55, 1.0, abs(p.y)));
    col += vec3(0.4, 0.7, 1.0) * jet * 0.7;
    alpha = max(alpha, jet * 0.6);

    col *= uOpacity;
    alpha *= uOpacity;

    if (alpha < 0.003) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function BlackHole({
    scrollYProgress,
    lowPower = false,
}: {
    scrollYProgress: MotionValue<number>;
    lowPower?: boolean;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uOpacity: { value: 0 },
        }),
        []
    );

    useFrame((state, delta) => {
        const grp = groupRef.current;
        if (!grp) return;

        const t = scrollYProgress.get();
        // Ramp in once during the Selected Works section, then HOLD to the end
        const vis = smoothstep(0.4, 0.56, t);

        const s = 0.78 + vis * 0.22;
        grp.scale.setScalar(s);
        // Gentle, eased drift that settles roughly centered for the rest of the page
        grp.position.x = THREE.MathUtils.lerp(3.2, -1.5, vis);
        grp.position.y = THREE.MathUtils.lerp(-1.5, 0.6, vis);
        grp.rotation.z = THREE.MathUtils.lerp(-0.1, 0.08, vis);

        if (matRef.current) {
            matRef.current.uniforms.uOpacity.value = vis;
            if (!lowPower && vis > 0.01) matRef.current.uniforms.uTime.value += delta;
        }
    });

    return (
        // Always mounted so the shader compiles up front (no stall when it appears)
        <group ref={groupRef} position={[0, 0, -7]}>
            <mesh renderOrder={10}>
                <planeGeometry args={[11, 11]} />
                <shaderMaterial
                    ref={matRef}
                    vertexShader={vertexShader}
                    fragmentShader={fragmentShader}
                    uniforms={uniforms}
                    transparent
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
}
