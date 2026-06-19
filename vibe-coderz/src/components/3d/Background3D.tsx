"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Float, Sparkles, PerformanceMonitor, AdaptiveDpr } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { BlackHole } from "@/components/3d/Foreground3D";
import { prefersReducedMotion, isMobileViewport } from "@/lib/scroll";

function CoreArtifact({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
    const meshRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const outerRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        const scroll = scrollYProgress.get();

        if (meshRef.current) {
            meshRef.current.rotation.y += 0.12 * delta;
            meshRef.current.position.y = THREE.MathUtils.lerp(0, -1.2, scroll);
            meshRef.current.position.x = THREE.MathUtils.lerp(0, 2.5, scroll);
            meshRef.current.scale.setScalar(THREE.MathUtils.lerp(1, 0.5, scroll));
        }

        if (innerRef.current) {
            innerRef.current.rotation.x += 0.18 * delta;
            innerRef.current.rotation.y += 0.26 * delta;
            const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 1.6) * 0.08;
            innerRef.current.scale.setScalar(pulse);
        }

        if (outerRef.current) {
            outerRef.current.rotation.x -= 0.4 * delta;
            outerRef.current.rotation.z += 0.4 * delta;
            const material = outerRef.current.material as THREE.MeshStandardMaterial;
            const hue = (0.62 + scroll * 0.25) % 1;
            material.color.setHSL(hue, 0.85, 0.55);
            material.emissive.setHSL(hue, 0.9, 0.4);
        }
    });

    return (
        <group ref={meshRef}>
            <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.9}>
                <mesh ref={innerRef}>
                    <icosahedronGeometry args={[1.2, 0]} />
                    <meshStandardMaterial color="#e9e4ff" wireframe emissive="#a78bfa" emissiveIntensity={1.2} />
                </mesh>
                <mesh ref={outerRef}>
                    <torusGeometry args={[3, 0.14, 16, 120]} />
                    <meshStandardMaterial
                        color="#6366f1"
                        emissive="#4338ca"
                        emissiveIntensity={0.8}
                        metalness={0.9}
                        roughness={0.15}
                        transparent
                        opacity={0.7}
                        wireframe
                    />
                </mesh>
            </Float>
        </group>
    );
}

function SceneLighting({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame(() => {
        if (!lightRef.current) return;
        const scroll = scrollYProgress.get();
        lightRef.current.position.x = Math.sin(scroll * Math.PI * 2) * 15;
        lightRef.current.position.y = Math.cos(scroll * Math.PI * 2) * 10;
        lightRef.current.color.setHSL((0.6 + scroll * 0.3) % 1, 0.8, 0.6);
    });

    return (
        <>
            <ambientLight intensity={0.25} />
            <pointLight ref={lightRef} position={[10, 10, 10]} intensity={2.2} distance={40} />
            <pointLight position={[-10, -5, -10]} intensity={1.2} color="#4c1d95" />
            <directionalLight position={[5, 8, 5]} intensity={0.6} color="#fff4e0" />
        </>
    );
}

/**
 * Self-managing shooting star — no React state, so spawning never triggers a
 * re-render of the 3D tree (the old setState-per-spawn was a scroll-jank source).
 */
function ShootingStar() {
    const ref = useRef<THREE.Group>(null);
    const speed = useRef(0);
    const active = useRef(false);
    const cooldown = useRef(3 + Math.random() * 6);

    useFrame((_, delta) => {
        const g = ref.current;
        if (!g) return;

        if (!active.current) {
            cooldown.current -= delta;
            if (cooldown.current <= 0 && Math.random() < 0.02) {
                const x = (Math.random() - 0.5) * 20;
                const y = (Math.random() - 0.5) * 20 + 10;
                g.position.set(x, y, -5);
                g.lookAt(x + 5, y - 5, -5);
                speed.current = 0.5 + Math.random() * 0.5;
                g.visible = true;
                active.current = true;
            }
            return;
        }

        g.translateZ(speed.current);
        if (g.position.y < -15 || g.position.x > 20) {
            g.visible = false;
            active.current = false;
            cooldown.current = 5 + Math.random() * 10;
        }
    });

    return (
        <group ref={ref} visible={false}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.05, 4]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
        </group>
    );
}

/** Self-managing fireball meteoroid — lit rocky body + ember trail, refs only. */
function Fireball() {
    const groupRef = useRef<THREE.Group>(null);
    const rockRef = useRef<THREE.Mesh>(null);
    const emberRef = useRef<THREE.Points>(null);
    const velocity = useRef(new THREE.Vector3());
    const gravity = useRef(new THREE.Vector3(0, -2.4, 0));
    const rot = useRef({ x: 0, y: 0, z: 0 });
    const life = useRef(0);
    const active = useRef(false);
    const cooldown = useRef(8 + Math.random() * 12);

    const rockGeo = useMemo(() => {
        const geo = new THREE.IcosahedronGeometry(0.7, 1);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const f = 0.78 + Math.random() * 0.34;
            pos.setXYZ(i, pos.getX(i) * f, pos.getY(i) * f, pos.getZ(i) * f);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    const emberCount = 50;
    const emberGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        const arr = new Float32Array(emberCount * 3);
        for (let i = 0; i < emberCount; i++) {
            arr[i * 3 + 0] = (Math.random() - 0.5) * 0.4;
            arr[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
            arr[i * 3 + 2] = i * 0.18;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
        return geo;
    }, []);

    const spawn = (g: THREE.Group) => {
        life.current = 0;
        const startX = -16 + Math.random() * 6;
        const startY = 10 + Math.random() * 6;
        const startZ = -8 + Math.random() * 10;
        g.position.set(startX, startY, startZ);
        const dir = new THREE.Vector3(
            0.7 + Math.random() * 0.4,
            -0.9 - Math.random() * 0.3,
            0.12 + Math.random() * 0.18
        ).normalize();
        velocity.current.copy(dir).multiplyScalar(9 + Math.random() * 4);
        rot.current = {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: (Math.random() - 0.5) * 2,
        };
        g.lookAt(startX + dir.x, startY + dir.y, startZ + dir.z);
        g.visible = true;
        active.current = true;
    };

    useFrame((state, delta) => {
        const g = groupRef.current;
        if (!g) return;

        if (!active.current) {
            cooldown.current -= delta;
            if (cooldown.current <= 0 && Math.random() < 0.02) spawn(g);
            return;
        }

        life.current += delta;
        velocity.current.addScaledVector(gravity.current, delta);
        g.position.addScaledVector(velocity.current, delta);

        if (rockRef.current) {
            rockRef.current.rotation.x += rot.current.x * delta;
            rockRef.current.rotation.y += rot.current.y * delta;
            rockRef.current.rotation.z += rot.current.z * delta;
        }
        if (emberRef.current) {
            (emberRef.current.material as THREE.PointsMaterial).opacity =
                0.55 + Math.sin(state.clock.elapsedTime * 30) * 0.2;
        }

        const p = g.position;
        if (p.y < -16 || p.x > 18 || life.current > 6) {
            g.visible = false;
            active.current = false;
            cooldown.current = 18 + Math.random() * 18;
        }
    });

    return (
        <group ref={groupRef} visible={false}>
            <mesh ref={rockRef} geometry={rockGeo}>
                <meshStandardMaterial color="#5b5048" emissive="#ff5a1f" emissiveIntensity={0.5} roughness={1} metalness={0.1} flatShading />
            </mesh>
            <mesh position={[0, 0, -0.2]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#ffd9a0" transparent opacity={0.5} />
            </mesh>
            <mesh position={[0, 0, 2.2]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.45, 4.5, 16, 1, true]} />
                <meshBasicMaterial color="#ff7b29" transparent opacity={0.35} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <points ref={emberRef} geometry={emberGeo}>
                <pointsMaterial color="#ffb066" size={0.12} transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
            </points>
        </group>
    );
}

/** Lower render resolution while the user is actively scrolling, restore when idle. */
function ScrollRegress() {
    const regress = useThree((s) => s.performance.regress);
    useEffect(() => {
        const onScroll = () => regress();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [regress]);
    return null;
}

export function Background3D() {
    const { scrollYProgress } = useScroll();
    const [lowPower, setLowPower] = useState(false);
    const [dpr, setDpr] = useState(1.5);

    useEffect(() => {
        const low = prefersReducedMotion() || isMobileViewport();
        setLowPower(low);
        if (low) setDpr(1);
    }, []);

    const backgroundColor = useTransform(
        scrollYProgress,
        [0, 0.2, 0.4, 0.6, 0.8, 1],
        ["#030014", "#0b0524", "#140a33", "#1a0f3d", "#1e1b4b", "#1b1740"]
    );

    return (
        <motion.div style={{ backgroundColor }} className="fixed inset-0 z-[-1]">
            <Canvas
                camera={{ position: [0, 0, 10], fov: 45 }}
                gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
                dpr={dpr}
            >
                <PerformanceMonitor
                    onDecline={() => setDpr(1)}
                    onIncline={() => setDpr((d) => Math.min(d + 0.25, 1.5))}
                    flipflops={3}
                    onFallback={() => setDpr(1)}
                />
                <ScrollRegress />

                <fog attach="fog" args={["#0a0420", 30, 115]} />

                <Stars radius={120} depth={60} count={lowPower ? 2500 : 4500} factor={4} saturation={0} fade speed={1.2} />
                {!lowPower && <Sparkles count={120} scale={14} size={3} speed={0.3} opacity={0.4} color="#cdb4ff" />}

                <ShootingStar />
                {!lowPower && <Fireball />}
                <CoreArtifact scrollYProgress={scrollYProgress} />
                <BlackHole scrollYProgress={scrollYProgress} lowPower={lowPower} />
                <SceneLighting scrollYProgress={scrollYProgress} />

                <EffectComposer enableNormalPass={false}>
                    <Bloom intensity={0.45} luminanceThreshold={0.72} luminanceSmoothing={0.3} mipmapBlur />
                </EffectComposer>

                <AdaptiveDpr pixelated />
            </Canvas>

            {/* Cheap CSS vignette + grid (was a postprocessing pass before) */}
            <div className="absolute inset-0 pointer-events-none [background:radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.7)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        </motion.div>
    );
}
