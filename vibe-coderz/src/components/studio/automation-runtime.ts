import * as THREE from "three";

export type AutomationRuntime = { update: (active: number | null, moving: boolean) => void; dispose: () => void };

export function mountAutomation(host: HTMLElement): AutomationRuntime {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  camera.position.set(0, 0, 5.9);
  scene.add(new THREE.HemisphereLight(0xffffef, 0x414b30, 3));
  const key = new THREE.DirectionalLight(0xffffff, 5);
  key.position.set(-3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xe0e7bd, 4);
  rim.position.set(3, -1, 2); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x647346, 2);
  fill.position.set(0, 0, -4); scene.add(fill);
  const count = 180, sides = 10;
  const positions = new Float32Array((count + 1) * sides * 3);
  const indices: number[] = [];
  for (let i = 0; i < count; i++) for (let j = 0; j < sides; j++) {
    const a = i * sides + j, b = i * sides + (j + 1) % sides;
    indices.push(a, b, a + sides, b, b + sides, a + sides);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  const material = new THREE.MeshStandardMaterial({ color: 0x929e72, metalness: .52, roughness: .27, side: THREE.DoubleSide });
  const sculpture = new THREE.Mesh(geometry, material);
  sculpture.frustumCulled = false;
  scene.add(sculpture);
  const beadGeometry = new THREE.SphereGeometry(.075, 12, 8);
  const beadMaterial = new THREE.MeshStandardMaterial({ color: 0x3d482d, metalness: .5, roughness: .3 });
  const beads = Array.from({ length: 3 }, () => {
    const bead = new THREE.Mesh(beadGeometry, beadMaterial);
    sculpture.add(bead);
    return bead;
  });
  // Retrieval: three precise orbital paths around a shared knowledge core.
  const knowledge = new THREE.Group();
  sculpture.add(knowledge);
  const orbitPoints = Array.from({ length: 121 }, (_, i) => {
    const t = i / 120 * Math.PI * 2;
    return new THREE.Vector3(1.3 * Math.cos(t), .43 * Math.sin(t), .4 * Math.sin(t));
  });
  const orbitGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(orbitPoints.slice(0, -1), true), 120, .058, 8, true);
  for (const angle of [Math.PI / 3, -Math.PI / 3]) {
    const orbit = new THREE.Mesh(orbitGeometry, material);
    orbit.rotation.z = angle;
    knowledge.add(orbit);
  }
  const coreGeometry = new THREE.SphereGeometry(.18, 24, 16);
  const core = new THREE.Mesh(coreGeometry, beadMaterial);
  knowledge.add(core);
  let knowledgeMix = 0;
  // Every base state has the same topology: the original ribbon genuinely deforms.
  const conversation = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.25,.55,0), new THREE.Vector3(-.9,.82,.12),
    new THREE.Vector3(.95,.82,0), new THREE.Vector3(1.28,.5,-.1),
    new THREE.Vector3(1.28,-.35,0), new THREE.Vector3(.8,-.57,.1),
    new THREE.Vector3(-.25,-.57,0), new THREE.Vector3(-.83,-.92,.1),
    new THREE.Vector3(-.73,-.53,0), new THREE.Vector3(-1.25,-.3,-.1),
  ], true, "centripetal");
  const point = (i: number, mode: number, time: number) => {
    const u = i / count, t = u * Math.PI * 2;
    if (mode === 0) return new THREE.Vector3(1.4*Math.sin(t), .66*Math.sin(2*t), .32*Math.cos(t));
    if (mode === 1) {
      return new THREE.Vector3(1.3*Math.cos(t), .43*Math.sin(t), .4*Math.sin(t));
    }
    if (mode === 2) {
      const x = (u < .5 ? u*4-1 : 3-u*4) * 1.5;
      const wave = Math.sin(x*7-time*2.6)*(.12+.32*Math.exp(-x*x));
      return new THREE.Vector3(x, wave + (u < .5 ? .14 : -.14), (u < .5 ? 1 : -1)*.13);
    }
    if (mode === 3) return conversation.getPoint(u);
    const r = .9 + .24*Math.cos(3*t);
    return new THREE.Vector3(r*Math.cos(2*t), r*Math.sin(2*t)*.8, .43*Math.sin(3*t));
  };
  const current = Array.from({ length: count }, (_, i) => point(i, -1, 0));
  const tangent = new THREE.Vector3(), normal = new THREE.Vector3(), binormal = new THREE.Vector3();
  const axis = new THREE.Vector3(0, 0, 1);
  let active = -1, moving = true, visible = true, frame = 0, last = 0, time = 0, settling = 2;
  function draw(now: number) {
    frame = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now-last)/1000, .05) : 1/60;
    last = now;
    if (moving) time += dt;
    const blend = moving ? 1-Math.exp(-dt*5) : 1;
    knowledgeMix += ((active === 1 ? 1 : 0) - knowledgeMix) * blend;
    knowledge.visible = knowledgeMix > .01;
    knowledge.scale.setScalar(Math.max(.001, knowledgeMix));
    for (let i = 0; i < count; i++) current[i].lerp(point(i, active, time), blend);
    for (let i = 0; i <= count; i++) {
      const p = current[i % count];
      tangent.subVectors(current[(i+1)%count], current[(i+count-1)%count]).normalize();
      normal.crossVectors(tangent, axis).normalize();
      binormal.crossVectors(tangent, normal).normalize();
      for (let j = 0; j < sides; j++) {
        const a = j/sides*Math.PI*2;
        const twist = .35*Math.sin(i/count*Math.PI*4+time*.2);
        const wide = Math.cos(a)*(.115 - .057*knowledgeMix), thin = Math.sin(a)*(.052 + .006*knowledgeMix);
        const n = wide*Math.cos(twist)-thin*Math.sin(twist), b = wide*Math.sin(twist)+thin*Math.cos(twist);
        const k = (i*sides+j)*3;
        positions[k] = p.x+normal.x*n+binormal.x*b;
        positions[k+1] = p.y+normal.y*n+binormal.y*b;
        positions[k+2] = p.z+normal.z*n+binormal.z*b;
      }
    }
    beads.forEach((bead, i) => {
      bead.visible = active === 0 || (active === 1 && knowledgeMix > .9);
      if (active === 1) {
        const t = time * .65 + i * Math.PI * 2 / 3;
        bead.position.set(1.3*Math.cos(t), .43*Math.sin(t), .4*Math.sin(t));
        bead.position.applyAxisAngle(axis, [0, Math.PI/3, -Math.PI/3][i]);
        bead.scale.setScalar(.9 * knowledgeMix);
        return;
      }
      const progress = ((time * .17 + i / 3) % 1) * count;
      bead.position.copy(current[Math.floor(progress)]).lerp(current[(Math.floor(progress)+1)%count], progress%1);
      bead.scale.setScalar(1.25);
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    sculpture.rotation.set(.12+Math.sin(time*.3)*.055, Math.sin(time*.23)*.17, -.12);
    renderer.render(scene, camera);
    settling -= dt;
    if (moving || settling > 0) frame = requestAnimationFrame(draw);
  }
  function wake() { if (!frame) frame = requestAnimationFrame(draw); }
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height); camera.aspect = width/height;
    camera.updateProjectionMatrix(); settling = 1; wake();
  });
  resize.observe(host);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake(); });
  observer.observe(host);
  const visibility = () => { if (!document.hidden) wake(); };
  document.addEventListener("visibilitychange", visibility);
  host.append(renderer.domElement);
  wake();
  return {
    update(next, enabled) { active = next ?? -1; moving = enabled; settling = enabled ? 2 : 0; wake(); },
    dispose() {
      cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      geometry.dispose(); orbitGeometry.dispose(); coreGeometry.dispose(); material.dispose(); beadGeometry.dispose(); beadMaterial.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
