import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type DevelopmentRuntime = { update: (active: number | null, moving: boolean) => void; dispose: () => void };
type Part = { p: [number, number, number]; s: [number, number, number]; r?: number };
const hidden: Part = { p: [0, 0, 0], s: [.001, .001, .001] };

export function mountDevelopment(host: HTMLElement): DevelopmentRuntime {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 30);
  camera.position.z = 6.6;
  scene.add(new THREE.HemisphereLight(0xfff9ed, 0x554a3a, 3));
  for (const [color, intensity, x, y, z] of [[0xffffff, 5, -3, 4, 5], [0xffe5b9, 3, 4, 1, 3], [0x817660, 2, 0, -3, -2]]) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z); scene.add(light);
  }
  const metal = new THREE.MeshStandardMaterial({ color: 0xb1a28b, metalness: .65, roughness: .24 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x645b4b, metalness: .42, roughness: .32 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xb96543, metalness: .4, roughness: .3 });
  const sculpture = new THREE.Group(); scene.add(sculpture);
  const blockGeometry = new RoundedBoxGeometry(1, 1, 1, 3, .12);
  const parts = Array.from({ length: 18 }, (_, i) => {
    const mesh = new THREE.Mesh(blockGeometry, i === 17 ? accent : i > 11 ? dark : metal);
    mesh.scale.setScalar(.001); sculpture.add(mesh); return mesh;
  });
  const part = (x: number, y: number, z: number, w: number, h: number, d = .13, r = 0): Part => ({ p: [x,y,z], s: [w,h,d], r });
  // Shared components rearrange continuously; no replacement images or scene cuts.
  const layouts: Part[][] = [
    [part(-.63,0,0,.12,1.35,.22,-.6), part(.63,0,0,.12,1.35,.22,.6), part(0,0,.2,.12,1.05,.17,-.3), ...Array(14).fill(hidden), part(.55,-.66,.15,.18,.18,.18)],
    [part(0,.43,.03,2.28,.045,.08), part(-.61,-.04,.08,.73,.57,.12), part(.47,.1,.09,.83,.065,.09), part(.34,-.09,.09,.57,.055,.09), part(.23,-.28,.09,.35,.11,.11), part(-.94,.6,.03,.06,.06,.08),part(-.78,.6,.03,.06,.06,.08),part(-.62,.6,.03,.06,.06,.08), ...Array(9).fill(hidden), part(.98,.6,.06,.1,.1,.1)],
    [part(-1.12,.62,0,.57,.4,.25), part(1.12,.62,0,.57,.4,.25), part(-1.12,-.62,0,.57,.4,.25), part(1.12,-.62,0,.57,.4,.25), part(-.72,.32,-.03,.71,.04,.06,-.52), part(.72,.32,-.03,.71,.04,.06,.52), part(-.72,-.32,-.03,.71,.04,.06,.52), part(.72,-.32,-.03,.71,.04,.06,-.52), ...Array(9).fill(hidden), part(0,0,.15,.28,.28,.25)],
    [part(-.41,.77,.02,.095,.5,.15,-.07), part(.41,.77,.02,.095,.5,.15,.07), part(0,1.01,.02,.82,.095,.15), part(0,-.08,.05,.54,.45,.12), ...Array(13).fill(hidden), part(.04,-.05,.13,.18,.055,.06,-.72)],
    [part(-.36,.46,.01,1.71,.045,.08), part(-.76,.05,.08,.52,.51,.12), part(-.08,.16,.07,.55,.065,.1), part(-.17,-.04,.07,.37,.05,.08), part(-.36,-.71,0,.15,.27,.18),part(-.36,-.87,0,.72,.065,.25),
      part(.91,-.04,.28,.72,1.38,.17), part(.91,-.02,.39,.57,1.14,.04),part(.91,.44,.43,.22,.045,.04),part(.91,-.51,.43,.16,.035,.04), hidden,hidden,part(.91,.03,.43,.37,.48,.045),...Array(4).fill(hidden),part(.91,.06,.48,.14,.14,.06)],
  ];
  const N = 160, S = 8;
  const positions = new Float32Array((N+1)*S*3), indices: number[] = [];
  for (let i=0;i<N;i++) for (let j=0;j<S;j++) {
    const a=i*S+j,b=i*S+(j+1)%S; indices.push(a,b,a+S,b,b+S,a+S);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.BufferAttribute(positions,3)); geometry.setIndex(indices);
  const frameMesh = new THREE.Mesh(geometry,metal); frameMesh.frustumCulled=false; sculpture.add(frameMesh);
  function outline(mode: number) {
    const [w,h,cx,cy] = [[1.75,1.75,0,0],[2.48,1.6,0,0],[.73,.73,0,0],[1.62,1.5,0,-.2],[1.96,1.3,-.36,0]][mode];
    const r=.17, shape = new THREE.Shape();
    shape.moveTo(-w/2+r,-h/2); shape.lineTo(w/2-r,-h/2); shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
    shape.lineTo(w/2,h/2-r); shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
    shape.lineTo(-w/2+r,h/2); shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
    shape.lineTo(-w/2,-h/2+r); shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    return shape.getSpacedPoints(N).slice(0,N).map(p => new THREE.Vector3(p.x*(mode===3 ? 1-.12*(p.y/h+.5):1)+cx,p.y+cy,0));
  }
  const outlines=Array.from({length:5},(_,i)=>outline(i));
  const current=outlines[0].map(p=>p.clone());
  const tangent=new THREE.Vector3(), normal=new THREE.Vector3(), axis=new THREE.Vector3(0,0,1);
  const targetP=new THREE.Vector3(),targetS=new THREE.Vector3();
  let mode=0,moving=true,visible=true,raf=0,last=0,time=0,settling=2;
  function draw(now:number) {
    raf=0;
    if (!visible || document.hidden) {last=0;return;}
    const dt=last ? Math.min((now-last)/1000,.05):1/60; last=now;
    if(moving) time+=dt;
    const blend=moving ? 1-Math.exp(-dt*5):1;
    for(let i=0;i<N;i++) current[i].lerp(outlines[mode][i],blend);
    for(let i=0;i<=N;i++) {
      const p=current[i%N];
      tangent.subVectors(current[(i+1)%N],current[(i+N-1)%N]).normalize();
      normal.crossVectors(tangent,axis).normalize();
      for(let j=0;j<S;j++) {
        const a=j/S*Math.PI*2,k=(i*S+j)*3;
        positions[k]=p.x+normal.x*Math.cos(a)*.068;
        positions[k+1]=p.y+normal.y*Math.cos(a)*.068;
        positions[k+2]=Math.sin(a)*.095;
      }
    }
    geometry.attributes.position.needsUpdate=true; geometry.computeVertexNormals();
    parts.forEach((mesh,i)=>{
      const target=layouts[mode][i]??hidden;
      targetP.fromArray(target.p); targetS.fromArray(target.s);
      if(mode===2 && i<4) targetP.z+=Math.sin(time*1.2+i*Math.PI/2)*.055;
      mesh.position.lerp(targetP,blend);mesh.scale.lerp(targetS,blend);
      mesh.rotation.z+=((target.r??0)-mesh.rotation.z)*blend;
      mesh.visible=mesh.scale.length()>.01;
    });
    const tilt=mode===0 ? -.23 : -.075;
    sculpture.rotation.x+=(.14+Math.sin(time*.4)*.035-sculpture.rotation.x)*blend;
    sculpture.rotation.y+=( -.24+Math.sin(time*.3)*.09-sculpture.rotation.y)*blend;
    sculpture.rotation.z+=(tilt-sculpture.rotation.z)*blend;
    sculpture.position.y=Math.sin(time*.65)*.035;
    renderer.render(scene,camera);settling-=dt;
    if(moving || settling>0) raf=requestAnimationFrame(draw);
  }
  const wake=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(()=>{
    const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
    renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();settling=1;wake();
  });resize.observe(host);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();});observer.observe(host);
  const visibility=()=>{if(!document.hidden)wake();};document.addEventListener("visibilitychange",visibility);
  host.append(renderer.domElement);wake();
  return {
    update(active,enabled){mode=active===null?0:active+1;moving=enabled;settling=enabled?2:0;wake();},
    dispose(){cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener("visibilitychange",visibility);geometry.dispose();blockGeometry.dispose();metal.dispose();dark.dispose();accent.dispose();renderer.dispose();renderer.domElement.remove();},
  };
}
