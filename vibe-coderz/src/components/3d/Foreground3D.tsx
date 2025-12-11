"use client";

import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function BlackHole({ active, onComplete }: { active: boolean; onComplete: () => void }) {
    const groupRef = useRef<THREE.Group>(null);
    const lifeTime = useRef(0);
    const speed = useRef(0);

    useFrame((state, delta) => {
        if (!active || !groupRef.current) return;

        lifeTime.current += delta;

        // Movement: Slow drift (approx half shooting star speed logic) 
        groupRef.current.position.z += speed.current * delta * 50;

        // Slight Rotation
        groupRef.current.rotation.z += delta * 0.1;

        // Fade in/out logic
        const duration = 20;
        const opacity = lifeTime.current < 2
            ? lifeTime.current / 2 // Fade in
            : lifeTime.current > (duration - 2)
                ? (duration - lifeTime.current) / 2 // Fade out
                : 1;

        // Update opacity
        groupRef.current.children.forEach((child: any) => {
            if (child.material) {
                child.material.opacity = Math.max(0, opacity);
                child.material.transparent = true;
            }
        });

        if (lifeTime.current > duration) {
            onComplete();
        }
    });

    useEffect(() => {
        if (active) {
            lifeTime.current = 0;
            speed.current = 0.25 + Math.random() * 0.25;

            if (groupRef.current) {
                // Random position
                groupRef.current.position.set(
                    (Math.random() - 0.5) * 20,
                    (Math.random() - 0.5) * 20,
                    -40
                );
                groupRef.current.lookAt(0, 0, 10);
            }
        }
    }, [active]);

    if (!active) return null;

    return (
        <group ref={groupRef}>
            {/* Event Horizon - Pure Black Void */}
            <mesh>
                <sphereGeometry args={[2.5, 64, 64]} />
                <meshBasicMaterial color="#000000" /> {/* Pure black to occlude text */}
            </mesh>
            {/* No accretion disk rings per request "no hit of red" */}
        </group>
    );
}

function ForegroundEvents() {
    const [blackHoleActive, setBlackHoleActive] = useState(false);
    const cooldown = useRef(0);

    useFrame((state, delta) => {
        cooldown.current -= delta;
        const r = Math.random();

        // Black Hole: Rare (Every ~3-5 mins)
        // 0.0001 chance per frame -> ~166 seconds
        if (!blackHoleActive && cooldown.current <= 0 && r < 0.0001) {
            setBlackHoleActive(true);
        }
    });

    return (
        <BlackHole
            active={blackHoleActive}
            onComplete={() => {
                setBlackHoleActive(false);
                cooldown.current = 120 + Math.random() * 120; // 2-4 min cooldown
            }}
        />
    );
}

export function Foreground3D() {
    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            <Canvas
                camera={{ position: [0, 0, 10], fov: 45 }}
                gl={{ antialias: true, alpha: true }}
                className="pointer-events-none"
                style={{ pointerEvents: 'none' }} // Force disable pointer events
            >
                <ForegroundEvents />
            </Canvas>
        </div>
    );
}
