"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { motion, useScroll, useTransform } from "framer-motion";

function WarpTravel({ scrollYProgress }: { scrollYProgress: any }) {
    // User requested stability/fixed size. Removing camera Z movement.
    // The "Warp" effect is now just the background stars moving/fading.
    return null;
}

function CoreArtifact({ scrollYProgress }: { scrollYProgress: any }) {
    const meshRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const outerRef = useRef<THREE.Mesh>(null);

    useFrame((state, delta) => {
        const scroll = scrollYProgress.get(); // 0 to 1

        if (meshRef.current) {
            // Constant slow spin
            meshRef.current.rotation.y += 0.15 * delta;
            // Float up/down slightly based on scroll to track page flow
            meshRef.current.position.y = THREE.MathUtils.lerp(0, -1, scroll);
        }

        if (innerRef.current) {
            // Constant rotation speed (User requested no speedup)
            innerRef.current.rotation.x += 0.2 * delta;
            innerRef.current.rotation.y += 0.3 * delta;

            // Constant gentle pulse
            const time = state.clock.getElapsedTime();
            const scale = 1 + Math.sin(time * 2) * 0.1;
            innerRef.current.scale.setScalar(scale);
        }

        if (outerRef.current) {
            outerRef.current.rotation.x -= 0.5 * delta;
            outerRef.current.rotation.y += 0.3 * delta;
            // Constant Z rotation
            outerRef.current.rotation.z += 0.5 * delta;

            // Dynamic color shift directly on the material
            const material = outerRef.current.material as THREE.MeshStandardMaterial;
            const hue = (0.6 + scroll * 0.4) % 1; // Keep color shift as it's nice
            material.color.setHSL(hue, 0.8, 0.5);
        }
    });

    return (
        <group ref={meshRef}>
            <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
                {/* Inner Core */}
                <mesh ref={innerRef}>
                    <icosahedronGeometry args={[1.2, 0]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        wireframe
                        emissive="#ffffff"
                        emissiveIntensity={0.8}
                    />
                </mesh>

                {/* Outer Ring */}
                <mesh ref={outerRef}>
                    <torusGeometry args={[3, 0.2, 16, 100]} />
                    <meshStandardMaterial
                        color="#3b82f6"
                        metalness={0.9}
                        roughness={0.1}
                        transparent
                        opacity={0.6}
                        wireframe
                    />
                </mesh>
            </Float>
        </group>
    );
}

function SceneLighting({ scrollYProgress }: { scrollYProgress: any }) {
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame(() => {
        if (!lightRef.current) return;
        const scroll = scrollYProgress.get();

        // Light dances around as we travel
        lightRef.current.position.x = Math.sin(scroll * Math.PI * 2) * 15;
        lightRef.current.position.y = Math.cos(scroll * Math.PI * 2) * 10;
        lightRef.current.color.setHSL(scroll, 0.8, 0.6);
    });

    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight ref={lightRef} position={[10, 10, 10]} intensity={2} distance={30} />
            <pointLight position={[-10, -5, -10]} intensity={1} color="#4c1d95" />
        </>
    );
}

// --- Randomized Cosmic Events System ---

function ShootingStar({ active, onComplete }: { active: boolean; onComplete: () => void }) {
    const ref = useRef<THREE.Group>(null);
    const speed = useRef(0);

    useEffect(() => {
        if (active && ref.current) {
            // Random start position (top/left mostly)
            const x = (Math.random() - 0.5) * 20;
            const y = (Math.random() - 0.5) * 20 + 10;
            ref.current.position.set(x, y, -5);
            ref.current.lookAt(x + 5, y - 5, -5); // Aim diagonally
            speed.current = 0.5 + Math.random() * 0.5;
        }
    }, [active]);

    useFrame(() => {
        if (!active || !ref.current) return;

        // Move diagonally down
        ref.current.translateZ(speed.current);

        // Check if out of bounds
        if (ref.current.position.y < -15 || ref.current.position.x > 20) {
            onComplete();
        }
    });

    if (!active) return null;

    return (
        <group ref={ref}>
            {/* Trail */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.02, 0.05, 4]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
            </mesh>
        </group>
    );
}

function Meteoroid({ active, onComplete }: { active: boolean; onComplete: () => void }) {
    const ref = useRef<THREE.Mesh>(null);
    const direction = useRef(new THREE.Vector3());
    const rotSpeed = useRef({ x: 0, y: 0 });

    useEffect(() => {
        if (active && ref.current) {
            // Spawn far away
            const angle = Math.random() * Math.PI * 2;
            const radius = 25;
            ref.current.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -10 + Math.random() * 5);

            // Aim roughly towards center but miss
            const targetX = (Math.random() - 0.5) * 10;
            const targetY = (Math.random() - 0.5) * 10;
            direction.current.subVectors(new THREE.Vector3(targetX, targetY, 0), ref.current.position).normalize().multiplyScalar(0.05); // Slow speed

            rotSpeed.current = { x: Math.random() * 0.02, y: Math.random() * 0.02 };
        }
    }, [active]);

    useFrame(() => {
        if (!active || !ref.current) return;

        ref.current.position.add(direction.current);
        ref.current.rotation.x += rotSpeed.current.x;
        ref.current.rotation.y += rotSpeed.current.y;

        // Despawn if too far
        if (ref.current.position.length() > 30) {
            onComplete();
        }
    });

    if (!active) return null;

    return (
        <mesh ref={ref}>
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#57534e" roughness={0.9} />
        </mesh>
    );
}


function CosmicEvents() {
    const [events, setEvents] = useState({
        shootingStar: false,
        meteoroid: false
    });

    // We use a ref to track "cooldowns" to prevent react state spam
    const cooldowns = useRef({
        shootingStar: 0,
        meteoroid: 0
    });

    useFrame((state, delta) => {
        // Decrease cooldowns
        cooldowns.current.shootingStar -= delta;
        cooldowns.current.meteoroid -= delta;

        // Probabilistic Spawning
        const r = Math.random();

        // Shooting Star: Frequent (Every ~10-20s)
        if (!events.shootingStar && cooldowns.current.shootingStar <= 0 && r < 0.005) {
            setEvents((prev: any) => ({ ...prev, shootingStar: true }));
        }

        // Meteoroid: Occasional (Every ~30-60s)
        if (!events.meteoroid && cooldowns.current.meteoroid <= 0 && r < 0.001) {
            setEvents((prev: any) => ({ ...prev, meteoroid: true }));
        }
    });

    return (
        <>
            <ShootingStar
                active={events.shootingStar}
                onComplete={() => {
                    setEvents((prev: any) => ({ ...prev, shootingStar: false }));
                    cooldowns.current.shootingStar = 5 + Math.random() * 10; // 5-15s cooldown
                }}
            />
            <Meteoroid
                active={events.meteoroid}
                onComplete={() => {
                    setEvents((prev: any) => ({ ...prev, meteoroid: false }));
                    cooldowns.current.meteoroid = 20 + Math.random() * 20; // 20-40s cooldown
                }}
            />
        </>
    );
}

export function Background3D() {
    const { scrollYProgress } = useScroll();

    // Map background color to 6 distinct sections for the "Galactic" journey
    // 0.0 - 0.16 : Hero (Deep Space Black)
    // 0.16 - 0.33 : Services (Cosmic Purple)
    // 0.33 - 0.50 : Skills (Cosmic Purple - Unified)
    // 0.50 - 0.66 : Portfolio (Cosmic Purple - Unified)
    // 0.66 - 0.83 : Resume (Deep Indigo)
    // 0.83 - 1.00 : Contact (Deep Indigo - Unified to prevent black)
    const backgroundColor = useTransform(
        scrollYProgress,
        [0, 0.2, 0.4, 0.6, 0.8, 1],
        [
            "#030014", // Hero: Deep Space Black
            "#1e1b4b", // Services: Cosmic Purple
            "#1e1b4b", // Skills: Cosmic Purple (Unified)
            "#1e1b4b", // Portfolio: Cosmic Purple (Unified)
            "#312e81", // Resume: Deep Indigo
            "#312e81"  // Contact: Deep Indigo (Unified per request)
        ]
    );

    return (
        <motion.div
            style={{ backgroundColor: backgroundColor }}
            className="fixed inset-0 z-[-1] transition-colors duration-1000 ease-in-out"
        >
            <Canvas camera={{ position: [0, 0, 10], fov: 45 }} gl={{ antialias: true, alpha: true }}>
                {/* Dynamic Starfield */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={2} />

                {/* Floating Particles for Depth */}
                <Sparkles
                    count={200}
                    scale={12}
                    size={4}
                    speed={0.4}
                    opacity={0.5}
                    color="#ffffff"
                />

                <CosmicEvents />
                <WarpTravel scrollYProgress={scrollYProgress} />
                <CoreArtifact scrollYProgress={scrollYProgress} />
                <SceneLighting scrollYProgress={scrollYProgress} />
            </Canvas>

            {/* Grid overlay for 'Cyber' vibe */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        </motion.div>
    );
}
