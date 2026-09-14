import * as THREE from "three";

export type SeoRuntime = { update: (active: number | null, moving: boolean) => void; dispose: () => void };
type Point = [number, number, number];
type Stroke = { points: Point[]; radius?: number; smooth?: boolean };
type Node = { p: Point; s: Point; angle?: number };
type Layout = { strokes: Stroke[]; nodes: Node[] };
const v = (x:number,y:number,z=0):Point => [x,y,z];
const stroke = (points:Point[],radius=.045,smooth=false):Stroke => ({points,radius,smooth});
const node = (x:number,y:number,size=.12,z=0):Node => ({p:v(x,y,z),s:v(size,size,size)});
const arc = (cx:number,cy:number,r:number,start:number,end:number,z=0) => Array.from({length:41},(_,i)=>v(cx+Math.cos(start+(end-start)*i/40)*r,cy+Math.sin(start+(end-start)*i/40)*r,z));
const circle = (x:number,y:number,r:number,z=0) => arc(x,y,r,0,Math.PI*2,z);
const layouts:Layout[] = [
  { // A lens over a rising signal, at rest.
    strokes:[stroke(circle(-.12,.17,.78),.085),stroke([v(.43,-.38),v(1.01,-.96)],.11),...[-.49,-.14,.21].map((x,i)=>stroke([v(x,-.19,.06),v(x,-.01+i*.2,.06)],.065))],
    nodes:[node(.42,.72,.09,.03)],
  },
  { // Crawlable hierarchy: one entry point, two routes, four reachable pages.
    strokes:[stroke([v(0,.78),v(0,.36),v(-.77,.36),v(-.77,.04)]),stroke([v(0,.36),v(.77,.36),v(.77,.04)]),
      ...[-1,1].flatMap(side=>[stroke([v(side*.77,.04),v(side*.77,-.34),v(side*1.17,-.34),v(side*1.17,-.77)]),stroke([v(side*.77,-.34),v(side*.37,-.34),v(side*.37,-.77)])])],
    nodes:[node(0,.78,.17),node(-.77,.04,.14),node(.77,.04,.14),...[-1.17,-.37,.37,1.17].map(x=>node(x,-.77,.12))],
  },
  { // Editorial branches: a central stem supports connected clusters.
    strokes:[stroke([v(0,-1),v(-.04,-.3),v(.04,.4),v(0,.99)],.075,true),
      ...[-1,1].flatMap(side=>[stroke([v(0,-.45),v(side*.32,-.28,.06),v(side*.83,-.2,.04)],.05,true),stroke([v(0,.1),v(side*.24,.38,.03),v(side*.67,.62,.04)],.05,true)])],
    nodes:[{p:v(0,.92,.02),s:v(.16,.28,.09)},...[-1,1].flatMap(side=>[
      {p:v(side*.78,-.18,.04),s:v(.31,.14,.1),angle:side*.3},
      {p:v(side*.64,.61,.04),s:v(.29,.14,.1),angle:side*.62}])],
  },
  {
    strokes:[...[-.99,-.5,0,.5,.99].map((x,i)=>stroke([v(x,-.83),v(x,-.45+i*.28)],.105)),
      stroke([v(-1.28,-.94,-.05),v(1.3,-.94,-.05)],.035),
      stroke([v(-1.13,.01,.16),v(-.53,.22,.16),v(-.06,.17,.16),v(.52,.67,.16),v(1.12,.94,.16)],.045)],
    nodes:[node(-1.13,.01,.075,.16),node(-.53,.22,.075,.16),node(-.06,.17,.075,.16),node(.52,.67,.075,.16),node(1.12,.94,.11,.16)],
  },
  { // Approved sources converge into one answer, with visibility radiating out.
    strokes:[stroke([v(-.55,-.61),v(.47,-.61),v(.6,-.47),v(.6,.57),v(.47,.7),v(-.55,.7),v(-.68,.57),v(-.68,-.47),v(-.55,-.61)],.06),
      ...[-.65,0,.65].map(y=>stroke([v(-1.37,y,-.06),v(-1.08,y,-.06),v(-.87,.08,-.04),v(-.69,.08)],.028,true)),
      stroke([v(-.38,.34,.05),v(.3,.34,.05)],.047),stroke([v(-.38,.09,.05),v(.2,.09,.05)],.039),
      stroke(arc(.48,.05,.53,-.75,.75),.039),stroke(arc(.48,.05,.84,-.75,.75),.039)],
    nodes:[...[-.65,0,.65].map(y=>node(-1.37,y,.09,-.06)),node(-.09,-.29,.1,.07)],
  },
];

export function mountSeo(host:HTMLElement):SeoRuntime {
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.setClearColor(0,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(32,1,.1,30);camera.position.z=6.4;
  scene.add(new THREE.HemisphereLight(0xfafee8,0x354334,3));
  for(const [color,intensity,x,y,z] of [[0xffffff,5,-3,4,5],[0xe4edc1,3,4,1,3],[0x667850,2,0,-3,-2]]) {
    const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);
  }
  const metal=new THREE.MeshStandardMaterial({color:0x8c9a67,metalness:.58,roughness:.25});
  const dark=new THREE.MeshStandardMaterial({color:0x4c603d,metalness:.4,roughness:.3});
  const accent=new THREE.MeshStandardMaterial({color:0xb69a51,metalness:.5,roughness:.25});
  const sculpture=new THREE.Group();scene.add(sculpture);
  const N=80,S=8,total=9;
  const absent=stroke([v(0,0),v(.001,.001)],.001);
  function sample(s:Stroke) {
    const points=s.points.map(p=>new THREE.Vector3(...p));
    if(s.smooth)return new THREE.CatmullRomCurve3(points).getPoints(N);
    const path=new THREE.CurvePath<THREE.Vector3>();
    for(let i=1;i<points.length;i++)path.add(new THREE.LineCurve3(points[i-1],points[i]));
    return Array.from({length:N+1},(_,i)=>path.getPoint(i/N));
  }
  const samples=layouts.map(l=>Array.from({length:total},(_,i)=>sample(l.strokes[i]??absent)));
  const strands=Array.from({length:total},(_,index)=>{
    const data=new Float32Array((N+1)*S*3),indices:number[]=[];
    for(let i=0;i<N;i++)for(let j=0;j<S;j++){const a=i*S+j,b=i*S+(j+1)%S;indices.push(a,b,a+S,b,b+S,a+S);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.BufferAttribute(data,3));geometry.setIndex(indices);
    const mesh=new THREE.Mesh(geometry,metal);mesh.frustumCulled=false;sculpture.add(mesh);
    return {mesh,geometry,data,points:samples[0][index].map(p=>p.clone()),radius:layouts[0].strokes[index]?.radius??.001};
  });
  const sphere=new THREE.SphereGeometry(1,20,12);
  const nodes=Array.from({length:7},(_,i)=>{const mesh=new THREE.Mesh(sphere,i===0?accent:dark);mesh.scale.setScalar(.001);sculpture.add(mesh);return mesh;});
  const tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3(),axis=new THREE.Vector3(0,0,1);
  const targetP=new THREE.Vector3(),targetS=new THREE.Vector3();
  let mode=0,moving=true,visible=true,raf=0,last=0,time=0,settling=2;
  function draw(now:number) {
    raf=0;if(!visible||document.hidden){last=0;return;}
    const dt=last?Math.min((now-last)/1000,.05):1/60;last=now;if(moving)time+=dt;
    const blend=moving?1-Math.exp(-dt*5):1;
    strands.forEach((strand,index)=>{
      const spec=layouts[mode].strokes[index]??absent;
      strand.radius+=((spec.radius??.045)-strand.radius)*blend;
      strand.mesh.visible=strand.radius>.003;
      for(let i=0;i<=N;i++)strand.points[i].lerp(samples[mode][index][i],blend);
      if(!strand.mesh.visible)return;
      for(let i=0;i<=N;i++) {
        const p=strand.points[i];tangent.subVectors(strand.points[Math.min(N,i+1)],strand.points[Math.max(0,i-1)]).normalize();
        normal.crossVectors(tangent,axis).normalize();binormal.crossVectors(tangent,normal).normalize();
        for(let j=0;j<S;j++) {
          const a=j/S*Math.PI*2,c=Math.cos(a)*strand.radius,s=Math.sin(a)*strand.radius,k=(i*S+j)*3;
          strand.data[k]=p.x+normal.x*c+binormal.x*s;strand.data[k+1]=p.y+normal.y*c+binormal.y*s;strand.data[k+2]=p.z+normal.z*c+binormal.z*s;
        }
      }
      strand.geometry.attributes.position.needsUpdate=true;strand.geometry.computeVertexNormals();
    });
    nodes.forEach((mesh,i)=>{
      const target=layouts[mode].nodes[i];targetP.fromArray(target?.p??v(0,0));targetS.fromArray(target?.s??v(.001,.001,.001));
      if(target && mode===2)targetS.multiplyScalar(1+Math.sin(time*.9+i*.7)*.035);
      mesh.position.lerp(targetP,blend);mesh.scale.lerp(targetS,blend);mesh.rotation.z+=((target?.angle??0)-mesh.rotation.z)*blend;
      mesh.visible=mesh.scale.length()>.01;
    });
    sculpture.rotation.set(.12+Math.sin(time*.35)*.035,-.2+Math.sin(time*.27)*.09,-.055);
    sculpture.position.y=Math.sin(time*.6)*.028;
    renderer.render(scene,camera);settling-=dt;if(moving||settling>0)raf=requestAnimationFrame(draw);
  }
  const wake=()=>{if(!raf)raf=requestAnimationFrame(draw);};
  const resize=new ResizeObserver(()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();settling=1;wake();});resize.observe(host);
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)wake();});observer.observe(host);
  const visibility=()=>{if(!document.hidden)wake();};document.addEventListener("visibilitychange",visibility);
  host.append(renderer.domElement);wake();
  return {
    update(active,enabled){mode=active===null?0:active+1;moving=enabled;settling=enabled?2:0;wake();},
    dispose(){cancelAnimationFrame(raf);resize.disconnect();observer.disconnect();document.removeEventListener("visibilitychange",visibility);strands.forEach(s=>s.geometry.dispose());sphere.dispose();metal.dispose();dark.dispose();accent.dispose();renderer.dispose();renderer.domElement.remove();},
  };
}
