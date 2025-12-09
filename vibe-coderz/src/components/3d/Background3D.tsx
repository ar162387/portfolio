"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Float } from "@react-three/drei";
import * as THREE from "three";
import { motion, useScroll, useTransform } from "framer-motion";

function CoreArtifact({ scrollYProgress }: { scrollYProgress: any }) {
    const meshRef = useRef<THREE.Group>(null);
    const innerRef = useRef<THREE.Mesh>(null);
    const outerRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        const scroll = scrollYProgress.get(); // 0 to 1

        if (meshRef.current) {
            meshRef.current.rotation.y = time * 0.15;
            meshRef.current.position.y = THREE.MathUtils.lerp(0, -2, scroll); // Move down as we scroll
        }

        if (innerRef.current) {
            innerRef.current.rotation.x = time * 0.2 + scroll * Math.PI;
            innerRef.current.rotation.y = time * 0.3;
            // Pulse
            const scale = 1 + Math.sin(time * 2) * 0.1;
            innerRef.current.scale.setScalar(scale);
        }

        if (outerRef.current) {
            outerRef.current.rotation.x = -time * 0.5;
            outerRef.current.rotation.y = time * 0.3;
            outerRef.current.rotation.z = scroll * Math.PI * 2;

            // Color shift based on scroll
            const material = outerRef.current.material as THREE.MeshStandardMaterial;
            // Simple lerp is hard in HSL with raw THREE, but we can set specific colors
            if (scroll < 0.33) material.color.set("#3b82f6"); // Blue
            else if (scroll < 0.66) material.color.set("#8b5cf6"); // Purple
            else material.color.set("#ef4444"); // Red
        }
    });

    return (
        <group ref={meshRef}>
            <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* Inner Core */}
                <mesh ref={innerRef}>
                    <icosahedronGeometry args={[1.2, 0]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        wireframe
                        emissive="#ffffff"
                        emissiveIntensity={0.5}
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

        // Move light
        lightRef.current.position.x = Math.sin(scroll * Math.PI) * 10;
        lightRef.current.color.setHSL(scroll * 0.5, 0.8, 0.5);
    });

    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight ref={lightRef} position={[10, 10, 10]} intensity={2} distance={20} />
            <pointLight position={[-10, -5, -10]} intensity={1} color="#4c1d95" />
        </>
    );
}

export function Background3D() {
    const { scrollYProgress } = useScroll();

    // Create a color transform for the HTML background div
    const backgroundColor = useTransform(
        scrollYProgress,
        [0, 0.5, 1],
        ["#0a0a0a", "#1a1033", "#0f0505"] // Black -> Deep Purple -> Dark Red
    );

    return (
        <motion.div
            style={{ backgroundColor: backgroundColor }}
            className="fixed inset-0 z-[-1] transition-colors duration-700 ease-out"
        >
            <Canvas camera={{ position: [0, 0, 10], fov: 40 }} gl={{ antialias: true, alpha: true }}>
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
                <CoreArtifact scrollYProgress={scrollYProgress} />
                <SceneLighting scrollYProgress={scrollYProgress} />
            </Canvas>

            {/* Grid overlay for 'Cyber' vibe */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        </motion.div>
    );
}
