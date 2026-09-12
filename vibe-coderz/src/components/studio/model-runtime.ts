import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createHorizonMaterial } from "./horizon-material";

/** Loaded only when a sculpture approaches the viewport. */
export function mountModel(
  host: HTMLDivElement,
  model: string,
  motion: boolean,
  onReady: () => void,
  onError: () => void,
  initialStage = 0,
) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-2.4, 2.4, 2.4, -2.4, .1, 100);
  camera.position.set(0, 0, 7);
  camera.lookAt(0, 0, 0);
  let environmentMap: THREE.WebGLRenderTarget | null = null;
  if (model !== "gravity") {
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    environmentMap = pmrem.fromScene(environment, .04);
    scene.environment = environmentMap.texture;
    scene.environmentIntensity = .65;
    environment.dispose();
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xfff5e4, 0x899475, 2));
    const key = new THREE.DirectionalLight(0xfff2dc, 3);
    key.position.set(3, 6, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 1.5);
    fill.position.set(-4, 2, 1);
    scene.add(fill);
  }

  let disposed = false;
  let failed = false;
  let visible = false;
  let animated = motion;
  let object: THREE.Group | null = null;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;
  let pointerX = 0;
  let pointerY = 0;
  let baseY = 0;
  const orbitDefinitions = [
    { name: "horizontal", radius: 1.65, tilt: [1.10, .15, -.35], axis: new THREE.Vector3(1, 0, 0), speed: .24 },
    { name: "vertical", radius: 2.02, tilt: [.12, 1.08, .35], axis: new THREE.Vector3(0, 1, 0), speed: -.19 },
    { name: "diagonal", radius: 2.32, tilt: [.8, .45, -.6], axis: new THREE.Vector3(1, 1, .5).normalize(), speed: .14 },
  ];
  const orbits: { pivot: THREE.Object3D; initial: THREE.Quaternion; particles: THREE.Object3D[]; definition: typeof orbitDefinitions[number] }[] = [];
  const turn = new THREE.Quaternion();
  let particleGlow: THREE.CanvasTexture | null = null;
  let horizonMaterial: THREE.ShaderMaterial | null = null;
  const principleRings: THREE.Mesh[] = [];
  let principleStage = initialStage;
  let principleProgress = 1;
  let principleWeights = [initialStage === 1 ? 1 : 0, initialStage === 2 ? 1 : 0];
  let principleFrom = [...principleWeights];
  let principleTarget = [...principleWeights];
  const applyPrincipleWeights = () => {
    principleRings.forEach((ring) => {
      if (!ring.morphTargetInfluences || !ring.morphTargetDictionary) return;
      ring.morphTargetInfluences[ring.morphTargetDictionary.Clarity] = principleWeights[0];
      ring.morphTargetInfluences[ring.morphTargetDictionary.Craft] = principleWeights[1];
    });
  };

  const updateOrbits = () => {
    orbits.forEach(({ pivot, initial, particles, definition }, i) => {
      // Rotate the plane itself around a different world axis for each orbit.
      turn.setFromAxisAngle(definition.axis, elapsed * definition.speed);
      pivot.quaternion.copy(initial).premultiply(turn);
      particles.forEach((particle, j) => {
        const angle = j * Math.PI / 2 + i * .42 + elapsed * (.42 - i * .065);
        particle.position.set(Math.cos(angle) * definition.radius, Math.sin(angle) * definition.radius, 0);
        // The opaque sphere's depth buffer hides only particles behind it.
      });
    });
  };

  const releaseObject = (root: THREE.Object3D) => {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material: THREE.Material) => {
        Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
        material.dispose();
      });
    });
  };
  const render = () => {
    if (!disposed && !failed && object) renderer.render(scene, camera);
  };
  const tick = (time: number) => {
    frame = 0;
    if (disposed || failed || !visible || document.hidden || !animated || !object) return;
    // At most 30 draws per second, independent of the display refresh rate.
    if (time - lastTime >= 1000 / 30) {
      const delta = Math.min((time - lastTime) / 1000, .05);
      elapsed += delta;
      lastTime = time;
      if (model === "gravity") {
        updateOrbits();
        if (horizonMaterial) horizonMaterial.uniforms.time.value = elapsed;
      } else if (model === "principles") {
        principleProgress = Math.min(1, principleProgress + delta / .9);
        const ease = 1 - Math.pow(1 - principleProgress, 3);
        principleWeights = principleFrom.map((from, i) => THREE.MathUtils.lerp(from, principleTarget[i], ease));
        applyPrincipleWeights();
      } else {
        const yaw = Math.sin(elapsed * .25) * .22 + pointerX * .12;
        object.rotation.y += (yaw - object.rotation.y) * .06;
        object.rotation.x += (pointerY * .07 - object.rotation.x) * .06;
        object.position.y = baseY + Math.sin(elapsed * .7) * .045;
      }
      render();
    }
    if (model !== "principles" || principleProgress < 1) frame = requestAnimationFrame(tick);
  };
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    lastTime = performance.now();
    if (visible && !document.hidden && animated && !failed && !disposed && object && (model !== "principles" || principleProgress < 1)) frame = requestAnimationFrame(tick);
  };
  const setPrincipleStage = (stage: number) => {
    principleStage = Math.max(0, Math.min(2, stage));
    principleFrom = [...principleWeights];
    principleTarget = [principleStage === 1 ? 1 : 0, principleStage === 2 ? 1 : 0];
    principleProgress = animated ? 0 : 1;
    if (!animated) {
      principleWeights = [...principleTarget];
      applyPrincipleWeights();
      render();
    }
    schedule();
  };
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height || disposed || failed) return;
    const aspect = width / height;
    const size = model === "gravity" ? 2.6 : 2.1;
    // Preserve the entire sculpture on narrow screens.
    const halfHeight = size / Math.min(1, aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) render();
    schedule();
  });
  visibilityObserver.observe(host);
  const move = (event: PointerEvent) => {
    if (!animated || event.pointerType !== "mouse") return;
    const bounds = host.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
  };
  const resetPointer = () => { pointerX = 0; pointerY = 0; };
  const contextLost = (event: Event) => {
    event.preventDefault();
    failed = true;
    cancelAnimationFrame(frame);
    onError();
  };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", resetPointer);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", schedule);
  resize();

  new GLTFLoader().load(`/models/studio/${model}.glb`, (gltf) => {
    if (disposed || failed) { releaseObject(gltf.scene); return; }
    object = gltf.scene;
    if (model === "principles") {
      object.traverse((child) => {
        if (child instanceof THREE.Mesh && child.morphTargetInfluences && child.morphTargetDictionary) principleRings.push(child);
      });
      principleWeights = [principleStage === 1 ? 1 : 0, principleStage === 2 ? 1 : 0];
      principleTarget = [...principleWeights];
      principleFrom = [...principleWeights];
      principleProgress = 1;
      applyPrincipleWeights();
    }
    if (model === "gravity") {
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = glowCanvas.height = 32;
      const context = glowCanvas.getContext("2d");
      if (context) {
        const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, "rgba(230,120,66,.38)");
        gradient.addColorStop(.35, "rgba(201,78,41,.14)");
        gradient.addColorStop(1, "rgba(201,78,41,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 32, 32);
        particleGlow = new THREE.CanvasTexture(glowCanvas);
      }
      // Unlit colors preserve the fine sage paths and terracotta particles.
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const previous = Array.isArray(child.material) ? child.material : [child.material];
        previous.forEach((material) => {
          Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
          material.dispose();
        });
        if (child.name === "Horizon_light") {
          horizonMaterial = createHorizonMaterial();
          child.material = horizonMaterial;
          return;
        }
        child.material = new THREE.MeshBasicMaterial({
          color: child.name.startsWith("Path_") ? 0x7e866e : child.name.startsWith("Particle_") ? 0xc94e29 : 0x10130d,
          transparent: child.name.startsWith("Path_"),
          opacity: child.name.startsWith("Path_") ? .76 : 1,
          depthWrite: !child.name.startsWith("Path_"),
          depthTest: true,
          toneMapped: false,
        });
      });
      orbitDefinitions.forEach((definition, i) => {
        const pivot = object!.getObjectByName(`Orbit_${definition.name}`);
        if (!pivot) return;
        const particles = Array.from({ length: 4 }, (_, j) => object!.getObjectByName(`Particle_${i}_${j}`)).filter((item): item is THREE.Object3D => !!item);
        particles.forEach((particle) => {
          if (!particleGlow) return;
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlow, transparent: true, depthTest: true, depthWrite: false, toneMapped: false }));
          glow.scale.set(.19, .19, 1);
          particle.add(glow);
        });
        const initial = new THREE.Quaternion().setFromEuler(new THREE.Euler(...definition.tilt as [number, number, number]));
        orbits.push({ pivot, initial, particles, definition });
      });
      updateOrbits();
    }
    const bounds = new THREE.Box3().setFromObject(object);
    const center = bounds.getCenter(new THREE.Vector3());
    // Exports share a common scale; just centre the composition.
    if (model !== "gravity" && model !== "principles") object.position.sub(center);
    baseY = object.position.y;
    scene.add(object);
    resize();
    onReady();
    schedule();
  }, undefined, () => { if (!disposed) { failed = true; onError(); } });

  return {
    setMotion(enabled: boolean) {
      animated = enabled;
      if (!enabled && model === "principles") {
        principleWeights = [...principleTarget];
        principleProgress = 1;
        applyPrincipleWeights();
        render();
      }
      schedule();
    },
    setStage(stage: number) { if (model === "principles") setPrincipleStage(stage); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", schedule);
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", resetPointer);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      if (object) releaseObject(object);
      orbits.forEach(({ particles }) => particles.forEach((particle) => particle.children.forEach((child) => {
        if (child instanceof THREE.Sprite) child.material.dispose();
      })));
      particleGlow?.dispose();
      environmentMap?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
