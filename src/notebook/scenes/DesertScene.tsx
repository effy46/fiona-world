import { publicAsset } from '../../lib/publicAsset';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import {TravelCat} from './TravelCat';
import {useTravelWalk} from './useTravelWalk';
import {sandHeight} from './desertTerrain';
import { Billboard, Html, Line, RoundedBox, Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
const HAND = publicAsset('/fonts/Caveat-Medium.ttf');
const SERIF = publicAsset('/fonts/Lora-Regular.ttf');
const INK = '#74553b';
type Vec3 = [number, number, number];
export type Journey = 'ready' | 'walking' | 'rising' | 'collected';
const PaperTexture = createContext<THREE.Texture | null>(null);

function Paper({ color }: { color: string }) {
  const map = useContext(PaperTexture);
  return <meshStandardMaterial map={map} bumpMap={map} bumpScale={0.045} color={color} roughness={1} side={THREE.DoubleSide} />;
}

function Box({ at, size, color, rotation = [0, 0, 0] }: { at: Vec3; size: Vec3; color: string; rotation?: Vec3 }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow><boxGeometry args={size} /><Paper color={color} /></mesh>;
}

function Ink({ at, children, size = 0.2, flat = true, color = INK, serif = false }: { at: Vec3; children: string; size?: number; flat?: boolean; color?: string; serif?: boolean }) {
  return <Text position={at} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} font={serif ? SERIF : HAND} fontSize={size} color={color} anchorX="center" anchorY="middle" textAlign="center" depthOffset={-4}>{children}</Text>;
}

function Mountain({ z, heights, color }: { z: number; heights: number[]; color: string }) {
  const geometry = useMemo(() => {
    const outline = new THREE.Shape();
    const ridge = heights.map((y,i) => new THREE.Vector2(-2.91+i*5.82/(heights.length-1),y));
    outline.moveTo(-2.91,0); outline.lineTo(ridge[0].x,ridge[0].y);
    // Broad clipped shoulders and lightly rounded peaks resemble die-cut kraft scenery.
    for(let i=1;i<ridge.length-1;i++){
      const before=ridge[i].clone().lerp(ridge[i-1],0.16), after=ridge[i].clone().lerp(ridge[i+1],0.16);
      outline.lineTo(before.x,before.y);outline.quadraticCurveTo(ridge[i].x,ridge[i].y,after.x,after.y);
    }
    outline.lineTo(ridge.at(-1)!.x,ridge.at(-1)!.y);outline.lineTo(2.91,0);outline.closePath();
    for(const [column,cx] of [-2.4,-1.15,0.6,2.25].entries()){
      const index=Math.min(heights.length-2,Math.floor((cx+2.91)/5.82*(heights.length-1)));
      const top=Math.min(heights[index],heights[index+1])-0.25;
      for(let row=0;row<7;row++){
        const y=top-row*0.095;if(y<0.35)continue;
        const x=cx+row*0.022, width=0.16+(row%4)*0.027, angle=(column%2?0.24:-0.2);
        const slit=new THREE.Path();
        [[-width/2,-0.017],[-width/2,0.017],[width/2,0.017],[width/2,-0.017]].forEach(([px,py],i)=>{
          const sx=x+Math.cos(angle)*px-Math.sin(angle)*py,sy=y+Math.sin(angle)*px+Math.cos(angle)*py;
          if(i===0)slit.moveTo(sx,sy);else slit.lineTo(sx,sy);
        });slit.closePath();outline.holes.push(slit);
      }
      if(top>1.3 && column%2===0){
        const cut=new THREE.Path(), x=cx+0.22,y=top-0.8;
        cut.moveTo(x,y);cut.quadraticCurveTo(x+0.15,y+0.15,x+0.12,y+0.39);
        cut.quadraticCurveTo(x+0.28,y+0.13,x,y);cut.closePath();outline.holes.push(cut);
      }
    }
    const geometry=new THREE.ExtrudeGeometry(outline,{depth:0.04,bevelEnabled:false,curveSegments:8});
    const position=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    for(let i=0;i<position.count;i++) uv.setXY(i,(position.getX(i)+2.91)/3.3,position.getY(i)/3.3);
    geometry.computeVertexNormals();return geometry;
  },[heights]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <group position={[0,0.07,z]} rotation={[0,z < -2.4?0.025:z < -1.7?-0.025:0.035,0]}>
    <mesh geometry={geometry} castShadow receiveShadow><Paper color={color}/></mesh>
    {[-1.52,1.06].map((x,i)=><mesh key={x} position={[x,Math.min(...heights)*0.48,0.043]} castShadow receiveShadow>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array([0,0,0,0,0.4,0,(i?1:-1)*0.12,0.17,0.09]),3]}/>
        <bufferAttribute attach="attributes-normal" args={[new Float32Array([0.6,0,i?-0.8:0.8,0.6,0,i?-0.8:0.8,0.6,0,i?-0.8:0.8]),3]}/>
        <bufferAttribute attach="attributes-uv" args={[new Float32Array([0,0,0,0.15,0.05,0.06]),2]}/>
      </bufferGeometry>
      <Paper color={color}/>
    </mesh>)}
  </group>;
}

function PaperFlower({ at, size = 1 }: { at: Vec3; size?: number }) {
  return <group position={at} scale={size}>
    {Array.from({ length: 5 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI * 0.4) * 0.045, Math.sin(i * Math.PI * 0.4) * 0.045, i % 2 * 0.006]} rotation={[0.12, -0.08, i]} scale={[0.8, 1, 1]} castShadow><circleGeometry args={[0.044, 7]} /><Paper color={i % 2 ? '#e4aaa0' : '#d5958c'} /></mesh>)}
    <mesh position={[0, 0, 0.014]}><circleGeometry args={[0.026, 10]} /><Paper color="#dac279" /></mesh>
  </group>;
}

function Cactus({ at, height, color, kind = 'saguaro', yaw = 0 }: { at: Vec3; height: number; color: string; kind?: 'saguaro' | 'pear' | 'barrel'; yaw?: number }) {
  const paper = useContext(PaperTexture);
  const { geometry, print, creases } = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 640;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = kind === 'pear' ? color : '#f1efd8'; ctx.fillRect(0, 0, 384, 640);
    let seed = 193;
    for (let i = 0; i < 14500; i++) {
      seed = seed * 16807 % 2147483647; const x = seed % 384;
      seed = seed * 16807 % 2147483647; const y = seed % 640;
      ctx.strokeStyle = i % 3 ? 'rgba(74,76,38,0.14)' : 'rgba(255,255,240,0.45)';
      ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (i % 5) - 2, y + 2 + i % 7); ctx.stroke();
    }
    if (kind === 'saguaro') {
      ctx.strokeStyle = 'rgba(240,232,168,0.6)'; ctx.lineWidth = 2.5;
      for (let x = 25; x < 384; x += 26) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x - 4, 210, x + 5, 440, x, 640); ctx.stroke();
      }
    }
    const count = kind === 'pear' ? 0 : kind === 'barrel' ? 10 : 65;
    for (let i = 0; i < count; i++) {
      seed = seed * 16807 % 2147483647; const x = 25 + seed % 334;
      seed = seed * 16807 % 2147483647; const y = 28 + seed % 584;
      const r = kind === 'barrel' ? 18 + i % 4 * 2 : kind === 'pear' ? 6 : 4.5;
      ctx.fillStyle = kind === 'pear' ? '#84926a' : '#414d2b';
      ctx.beginPath(); ctx.arc(x, y, kind === 'barrel' ? r * 0.45 : 2.8, 0, Math.PI * 2); ctx.fill();
      if (kind === 'barrel' && i % 3 === 1) {
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
      }
      if (i % 3 !== 1) {
        ctx.strokeStyle = kind === 'pear' ? '#d2c58d' : '#4c5730';
        ctx.lineWidth = kind === 'barrel' ? 5 : 1.8;
        for (let ray = 0; ray < 3; ray++) {
          const a = ray * Math.PI / 3 + (i % 2) * 0.2;
          ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke();
        }
      }
    }
    if (kind === 'pear') {
      // Printed ivory, ochre and coral are separate inks, not green-tinted dots.
      const marks = [[-0.08,0.13],[0.1,0.2],[-0.19,0.28],[0.04,0.35],[-0.12,0.45],[0.18,0.5],[-0.16,0.61],[-0.42,0.66],[-0.49,0.76],[-0.32,0.76],[-0.16,0.82],[0.01,0.93],[-0.18,1.04],[-0.15,1.18],[-0.27,0.95],[0.22,0.69],[0.34,0.58],[0.29,0.47],[0.02,0.58],[-0.02,0.74]];
      marks.forEach(([x,y],i) => {
        const px=(x+0.65)/1.2*384, py=(1.38-y)/1.4*640;
        ctx.fillStyle=['#f6eed5','#c77958','#495137','#e4d9a9'][i%4];
        ctx.beginPath(); ctx.arc(px,py,i%3===0?4.3:3.4,0,Math.PI*2); ctx.fill();
        if (i%6===2) { ctx.globalCompositeOperation='destination-out'; ctx.beginPath(); ctx.arc(px,py,2.6,0,Math.PI*2); ctx.fill(); ctx.globalCompositeOperation='source-over'; }
      });
    }
    const print = new THREE.CanvasTexture(canvas); print.colorSpace = THREE.SRGBColorSpace; print.anisotropy = 8;
    let geometry: THREE.BufferGeometry;
    const creases: Vec3[][] = [];
    if (kind === 'barrel') {
      // A closed eight-panel folded shell replaces the intersecting rounded oval sheets.
      const profile = [[0, 0.21], [0.12, 0.32], [0.45, 0.41], [0.83, 0.37], [1.1, 0.25], [1.22, 0.22]];
      const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
      for (let panel = 0; panel < 8; panel++) {
        const a = panel * Math.PI / 4, b = a + Math.PI / 4;
        const first = positions.length / 3;
        const seam: Vec3[] = [];
        profile.forEach(([y, r]) => {
          for (const [side, angle] of [a, b].entries()) { positions.push(Math.cos(angle) * r, y, Math.sin(angle) * r); uvs.push(side, y / 1.22); }
          seam.push([Math.cos(a) * (r + 0.002), y, Math.sin(a) * (r + 0.002)]);
        });
        for (let j = 0; j < profile.length - 1; j++) { const v = first + j * 2; indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
        creases.push(seam);
      }
      geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices); geometry.computeVertexNormals();
    } else if (kind === 'pear') {
      const s = new THREE.Shape();
      s.moveTo(0,0); s.bezierCurveTo(-0.24,0.01,-0.33,0.32,-0.29,0.56);
      s.bezierCurveTo(-0.42,0.49,-0.6,0.57,-0.6,0.73); s.bezierCurveTo(-0.61,0.92,-0.39,0.94,-0.3,0.75);
      s.lineTo(-0.25,0.84); s.bezierCurveTo(-0.32,1.02,-0.34,1.16,-0.23,1.23);
      s.bezierCurveTo(-0.37,1.31,-0.26,1.43,-0.17,1.3); s.bezierCurveTo(-0.14,1.46,0.02,1.4,-0.03,1.27);
      s.bezierCurveTo(0.18,1.32,0.21,1.1,0.08,1.03); s.bezierCurveTo(0.01,0.99,0.03,0.91,0.01,0.86);
      s.bezierCurveTo(0.14,0.88,0.2,0.8,0.16,0.7); s.lineTo(0.2,0.65);
      s.bezierCurveTo(0.4,0.85,0.58,0.65,0.43,0.47); s.bezierCurveTo(0.38,0.4,0.28,0.38,0.23,0.4);
      s.bezierCurveTo(0.33,0.18,0.21,-0.01,0,0); s.closePath();
      geometry = new THREE.ExtrudeGeometry(s, { depth: 0.013, bevelEnabled: false });
    } else {
      const s = new THREE.Shape();
      s.moveTo(-0.13, 0); s.lineTo(0.13, 0); s.lineTo(0.13, 0.52); s.lineTo(0.33, 0.52);
      s.quadraticCurveTo(0.5, 0.52, 0.5, 0.7); s.lineTo(0.5, 1.03);
      s.bezierCurveTo(0.5, 1.18, 0.31, 1.18, 0.31, 1.03); s.lineTo(0.31, 0.76); s.lineTo(0.13, 0.76);
      s.lineTo(0.13, 1.34); s.bezierCurveTo(0.13, 1.55, -0.13, 1.55, -0.13, 1.34);
      s.lineTo(-0.13, 0.65); s.lineTo(-0.32, 0.65); s.lineTo(-0.32, 0.91);
      s.bezierCurveTo(-0.32, 1.06, -0.51, 1.06, -0.51, 0.91); s.lineTo(-0.51, 0.56);
      s.quadraticCurveTo(-0.51, 0.42, -0.34, 0.42); s.lineTo(-0.13, 0.42); s.closePath();
      geometry = new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: false });
    }
    if (kind !== 'barrel') {
      const pos = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) uv.setXY(i, kind === 'pear' ? (pos.getX(i) + 0.65) / 1.2 : (pos.getX(i) + 0.53) / 1.06, kind === 'pear' ? (pos.getY(i) + 0.02) / 1.4 : pos.getY(i) / 1.5);
    }
    return { geometry, print, creases };
  }, [kind, color]);
  useEffect(() => () => { geometry.dispose(); print.dispose(); }, [geometry, print]);
  const scale = height / (kind === 'saguaro' ? 1.5 : 1.3);
  const grounding = useMemo(() => {
    const dx=(sandHeight(at[0]+0.025,at[2])-sandHeight(at[0]-0.025,at[2]))/0.05;
    const dz=(sandHeight(at[0],at[2]+0.025)-sandHeight(at[0],at[2]-0.025))/0.05;
    const limit=Math.min(1,Math.tan(0.075)/Math.max(0.001,Math.hypot(dx,dz)));
    const normal=new THREE.Vector3(-dx*limit,1,-dz*limit).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw));
  },[at[0],at[2],yaw]);
  const base = useMemo(() => {
    // The thin mounting tab follows the sand independently; the printed plant stays upright.
    const vertices:number[]=[], indices:number[]=[];
    for(const lower of [false,true])for(const [x,z] of [[-0.16,-0.065],[0.16,-0.065],[0.16,0.115],[-0.16,0.115]]){
      const dx=(Math.cos(yaw)*x+Math.sin(yaw)*z)*scale,dz=(-Math.sin(yaw)*x+Math.cos(yaw)*z)*scale;
      vertices.push(dx,sandHeight(at[0]+dx,at[2]+dz)-at[1]+0.012-(lower?0.018*scale:0),dz);
    }
    indices.push(0,2,1,0,3,2,4,5,6,4,6,7);
    for(let i=0;i<4;i++){const j=(i+1)%4;indices.push(i,j,i+4,j,j+4,i+4);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  },[at[0],at[1],at[2],scale,yaw]);
  useEffect(()=>()=>base.dispose(),[base]);
  return <group position={at}><group quaternion={grounding} scale={scale}>
    {kind === 'pear' ? <>
      <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={print} bumpMap={paper} bumpScale={0.0015} color="#ffffff" roughness={1} alphaTest={0.5} side={THREE.DoubleSide} /><meshDepthMaterial attach="customDepthMaterial" map={print} alphaTest={0.5} depthPacking={THREE.RGBADepthPacking} /></mesh>
      <Line points={[[0.025,0.04,0.019],[0.04,0.32,0.019],[-0.04,0.61,0.019]]} color="#e0dcaf" transparent opacity={0.35} lineWidth={0.6} />
    </> : <>
      <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={print} bumpMap={paper} bumpScale={0.012} color={color} roughness={1} alphaTest={0.5} side={THREE.DoubleSide} /><meshDepthMaterial attach="customDepthMaterial" map={print} alphaTest={0.5} depthPacking={THREE.RGBADepthPacking} /></mesh>
      {kind === 'barrel' ? <>
        {creases.map((points, i) => <Line key={i} points={points} color="#c5c38a" transparent opacity={0.65} lineWidth={0.8} />)}
        <mesh position={[0, 1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.22, 8]} /><Paper color={color} /></mesh>
        <PaperFlower at={[0.02, 1.25, 0.08]} size={0.8} />
      </> : <>
        <Line points={[[0, 0.04, 0.032], [0, 1.39, 0.032]]} color="#d0ca92" transparent opacity={0.7} lineWidth={1.2} />
        <Line points={[[-0.4, 0.56, 0.033], [-0.4, 0.9, 0.033]]} color="#c1c58d" transparent opacity={0.65} lineWidth={0.9} />
        <Line points={[[0.4, 0.68, 0.033], [0.4, 1.02, 0.033]]} color="#c1c58d" transparent opacity={0.65} lineWidth={0.9} />
        <Box at={[0.022, 0.59, -0.055]} size={[0.026, 1.12, 0.15]} color={color} />
      </>}
    </>}
    </group>
    <mesh geometry={base} castShadow receiveShadow><meshStandardMaterial color="#c3b185" roughness={1} side={THREE.DoubleSide}/></mesh>
  </group>;
}

function CamperWindow({ points, texture }: { points: Vec3[]; texture: THREE.Texture }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]); g.computeVertexNormals(); return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial map={texture} roughness={1} side={THREE.DoubleSide} /></mesh>;
}

function CamperWheel({ at, rotation = [0, 0, 0], spare = false }: { at: Vec3; rotation?: Vec3; spare?: boolean }) {
  return <group position={at} rotation={rotation}>
    <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.255, 0.255, 0.075, 32]} /><Paper color="#45463f" /></mesh>
    <mesh position={[0, 0, 0.044]}><ringGeometry args={[spare ? 0.203 : 0.145, spare ? 0.221 : 0.181, 40]} /><Paper color={spare ? '#85877d' : '#e8e4d7'} /></mesh>
    {!spare && <>
      <mesh position={[0, 0, 0.045]}><circleGeometry args={[0.142, 32]} /><Paper color="#f8f5e8" /></mesh>
      <mesh position={[0, 0, 0.048]}><circleGeometry args={[0.082, 28]} /><Paper color="#b8b9ae" /></mesh>
    </>}
  </group>;
}

function Camper({ reducedMotion }: { reducedMotion: boolean }) {
  const body = useRef<THREE.Group>(null);
  const exhaust = useRef<THREE.Group[]>([]);
  const exhaustMaterials = useRef<THREE.MeshBasicMaterial[]>([]);
  const engineTime = useRef(0);
  const { lower, upper, glass, smoke } = useMemo(() => {
    // Side silhouettes include real wheel cutouts and a folded, sloping front panel.
    const lower = new THREE.Shape();
    lower.moveTo(-1.12, 0.27); lower.lineTo(-1, 0.27);
    lower.absarc(-0.72, 0.27, 0.28, Math.PI, 0, true);
    lower.lineTo(0.44, 0.27); lower.absarc(0.72, 0.27, 0.28, Math.PI, 0, true);
    lower.lineTo(1.12, 0.27); lower.quadraticCurveTo(1.17, 0.27, 1.17, 0.35);
    lower.lineTo(1.16, 0.8); lower.lineTo(-1.14, 0.8); lower.lineTo(-1.14, 0.36); lower.quadraticCurveTo(-1.14, 0.29, -1.12, 0.27); lower.closePath();
    const upper = new THREE.Shape();
    upper.moveTo(-1.14, 0.8); upper.lineTo(1.16, 0.8); upper.lineTo(0.94, 1.23);
    upper.quadraticCurveTo(0.88, 1.35, 0.75, 1.35); upper.lineTo(-0.96, 1.35);
    upper.quadraticCurveTo(-1.14, 1.35, -1.14, 1.16); upper.closePath();
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const wash = ctx.createLinearGradient(0, 0, 60, 128); wash.addColorStop(0, '#62675f'); wash.addColorStop(1, '#89867a');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = 'rgba(232,224,201,0.16)'; ctx.beginPath(); ctx.moveTo(5, 5); ctx.lineTo(94, 5); ctx.lineTo(17, 119); ctx.lineTo(5, 119); ctx.fill();
    ctx.strokeStyle = '#565b54'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, 125, 125);
    const glass = new THREE.CanvasTexture(canvas); glass.colorSpace = THREE.SRGBColorSpace; glass.anisotropy = 8;
    const puff = document.createElement('canvas'); puff.width = puff.height = 64;
    const paint = puff.getContext('2d')!;
    const feather = paint.createRadialGradient(32,32,2,32,32,31);
    feather.addColorStop(0,'rgba(222,217,199,0.65)'); feather.addColorStop(0.45,'rgba(222,217,199,0.4)'); feather.addColorStop(1,'rgba(222,217,199,0)');
    paint.fillStyle=feather;paint.fillRect(0,0,64,64);
    const smoke=new THREE.CanvasTexture(puff);smoke.colorSpace=THREE.SRGBColorSpace;
    return { lower, upper, glass, smoke };
  }, []);
  useEffect(() => () => {glass.dispose();smoke.dispose();}, [glass,smoke]);
  useFrame((_,delta)=>{
    if(!reducedMotion)engineTime.current+=delta;
    const t=engineTime.current;
    if(body.current){
      body.current.position.y=reducedMotion?0:Math.sin(t*Math.PI*14)*0.008+Math.sin(t*Math.PI*22.6)*0.003;
      body.current.rotation.z=reducedMotion?0:Math.sin(t*Math.PI*11)*0.003;
    }
    exhaust.current.forEach((puff,i)=>{
      const age=((t-i*0.65)%2.8+2.8)%2.8,life=Math.min(1,age/1.8);
      puff.visible=!reducedMotion&&age<1.8;
      puff.position.set(-1.32-life*0.5,0.18+life*0.22,0.35+Math.sin(life*3+i)*0.025);
      puff.scale.setScalar(0.07+life*0.22);
      exhaustMaterials.current[i].opacity=Math.sin(life*Math.PI)*0.34;
    });
  });
  return <group position={[-0.75, sandHeight(-0.75,1.3), 1.3]} rotation={[0, -0.8, 0]}>
    <group ref={body}>
    <mesh position={[0, 0, -0.5]} castShadow receiveShadow><extrudeGeometry args={[lower, { depth: 1, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 1 }]} /><Paper color="#d65b4c" /></mesh>
    <mesh position={[0, 0, -0.5]} castShadow receiveShadow><extrudeGeometry args={[upper, { depth: 1, bevelEnabled: true, bevelSize: 0.016, bevelThickness: 0.018, bevelSegments: 1 }]} /><Paper color="#fffdf0" /></mesh>
    {/* A shallow folded roof cap, with softly clipped corners rather than a floating slab. */}
    <RoundedBox args={[1.99, 0.055, 1.065]} radius={0.02} smoothness={2} position={[-0.095, 1.363, 0]} castShadow><Paper color="#fffdf0" /></RoundedBox>
    {[-1, 1].map((side) => <group key={side}>
      <CamperWindow texture={glass} points={[[-1.03, 0.905, side * 0.525], [-0.48, 0.905, side * 0.525], [-0.48, 1.25, side * 0.525], [-1.03, 1.25, side * 0.525]]} />
      <CamperWindow texture={glass} points={[[-0.395, 0.905, side * 0.525], [0.2, 0.905, side * 0.525], [0.2, 1.25, side * 0.525], [-0.395, 1.25, side * 0.525]]} />
      <CamperWindow texture={glass} points={[[0.31, 0.905, side * 0.525], [1.025, 0.905, side * 0.525], [0.845, 1.25, side * 0.525], [0.31, 1.25, side * 0.525]]} />
      <Line points={[[0.26, 1.28, side * 0.529], [0.26, 0.59, side * 0.529], [0.4, 0.59, side * 0.529]]} color="#a99d86" transparent opacity={0.65} lineWidth={0.7} />
      <Box at={[0.4, 0.845, side * 0.535]} size={[0.14, 0.018, 0.018]} color="#a9a89a" />
      {Array.from({ length: 5 }, (_, i) => <Box key={i} at={[-1.01, 0.6 + i * 0.031, side * 0.525]} size={[0.13, 0.009, 0.008]} color="#a24a3e" />)}
      <Box at={[1.09, 1.01, side * 0.6]} size={[0.018, 0.045, 0.13]} color="#d1c8b1" />
      <Box at={[1.09, 1.06, side * 0.66]} size={[0.08, 0.12, 0.025]} color="#ccc7b7" />
    </group>)}
    {/* Windshield follows the actual x/y slope of the folded front of the cab. */}
    {[-1, 1].map((side) => <CamperWindow key={side} texture={glass} points={[[1.144, 0.925, side * 0.025], [1.144, 0.925, side * 0.438], [0.994, 1.218, side * 0.438], [0.994, 1.218, side * 0.025]]} />)}
    {[-1, 1].map((side) => <group key={side}>
      <Line points={[[1.146, 0.94, side * 0.13], [1.102, 1.025, side * 0.35]]} color="#42463f" lineWidth={1.2} />
      <group position={[1.204, 0.45, side * 0.37]} rotation={[0, Math.PI / 2, 0]}>
        <mesh><circleGeometry args={[0.089, 24]} /><Paper color="#dedccc" /></mesh>
        <mesh position={[0, 0, 0.003]}><circleGeometry args={[0.064, 24]} /><Paper color="#fff2c4" /></mesh>
      </group>
      <Box at={[1.184, 0.733, side * 0.36]} size={[0.012, 0.045, 0.18]} color="#e6bd78" />
      <Box at={[-1.167, 0.5, side * 0.4]} size={[0.014, 0.12, 0.065]} color="#9d4033" />
    </group>)}
    <CamperWheel at={[1.23, 0.535, 0]} rotation={[0, Math.PI / 2, 0]} spare />
    {[-1, 1].map((end) => <RoundedBox key={end} args={[0.085, 0.065, 1.15]} radius={0.018} smoothness={1} position={[end * 1.195, 0.225, 0]} castShadow><Paper color="#e2dfce" /></RoundedBox>)}
    <CamperWindow texture={glass} points={[[-1.168, 0.94, -0.39], [-1.168, 0.94, 0.39], [-1.168, 1.2, 0.39], [-1.168, 1.2, -0.39]]} />
    <Box at={[-1.17, 0.56, 0]} size={[0.014, 0.1, 0.28]} color="#f4ead2" />
    {/* Thin slats and rails leave daylight under the luggage instead of a thick timber tray. */}
    {[-0.64, 0.48].map((x) => <Box key={x} at={[x, 1.423, 0]} size={[0.045, 0.075, 0.84]} color="#a88c60" />)}
    {[-0.3, 0, 0.3].map((z) => <Box key={z} at={[-0.1, 1.463, z]} size={[1.47, 0.025, 0.06]} color="#d6c6a4" />)}
    {[-0.43, 0.43].map((z) => <Box key={z} at={[-0.1, 1.5, z]} size={[1.5, 0.075, 0.023]} color="#d9c9a7" />)}
    <RoundedBox args={[0.62, 0.21, 0.5]} radius={0.022} smoothness={1} position={[-0.42, 1.58, -0.03]} castShadow><Paper color="#d18a55" /></RoundedBox>
    <Line points={[[-0.737, 1.6, 0.227], [-0.105, 1.6, 0.227]]} color="#a9663f" lineWidth={0.8} />
    {[-0.57, -0.25].map((x) => <Box key={x} at={[x, 1.58, 0.226]} size={[0.035, 0.185, 0.008]} color="#ae764b" />)}
    <Box at={[-0.42, 1.625, 0.24]} size={[0.12, 0.027, 0.025]} color="#946440" />
    <RoundedBox args={[0.61, 0.1, 0.54]} radius={0.015} smoothness={1} position={[0.25, 1.527, 0.02]} castShadow><Paper color="#e5dcc3" /></RoundedBox>
    {[1.51, 1.54].map((y) => <Box key={y} at={[0.25, y, 0.297]} size={[0.58, 0.007, 0.009]} color="#b4b6a5" />)}
    </group>
    {[-1,1].map(side=>[-0.72,0.72].map(x=><CamperWheel key={`${side}-${x}`} at={[x,0.255,side*0.525]} rotation={[0,side>0?0:Math.PI,0]}/>))}
    <mesh position={[-1.22,0.18,0.35]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[0.022,0.022,0.18,12]}/><Paper color="#777568"/></mesh>
    {[0,1,2,3].map(i=><group key={i} ref={group=>{if(group)exhaust.current[i]=group;}}>
      <Billboard follow><mesh raycast={()=>null}>
        <planeGeometry args={[1,1]}/><meshBasicMaterial ref={material=>{if(material)exhaustMaterials.current[i]=material;}} map={smoke} transparent depthWrite={false} toneMapped={false} opacity={0}/>
      </mesh></Billboard>
    </group>)}
  </group>;
}

function HoneycombBalloon() {
  const lattice = useMemo(() => {
    // Open hexagonal paper walls follow the balloon envelope; there is no solid sphere underneath.
    const vertices: number[] = [];
    const indices: number[] = [];
    const columns = 22, bands = 15, height = 2.08;
    const cell = height / ((bands - 1) * 1.5), width = Math.sqrt(3) * cell;
    const edges = new Set<string>();
    for (let row = 0; row < bands; row++) {
      for (let column = 0; column < columns; column++) {
        const cx = (column + (row % 2) / 2) * width, cy = row * cell * 1.5;
        for (let edge = 0; edge < 6; edge++) {
          const a = Math.PI / 6 + edge * Math.PI / 3, b = a + Math.PI / 3;
          const points = [[cx + Math.cos(a) * cell, cy + Math.sin(a) * cell], [cx + Math.cos(b) * cell, cy + Math.sin(b) * cell]];
          const key = points.map(([x, y]) => `${Math.round(x * 10000)},${Math.round(y * 10000)}`).sort().join(':');
          if (edges.has(key)) continue;
          edges.add(key);
          const start = vertices.length / 3;
          for (const [x, y] of points) {
            const t = THREE.MathUtils.clamp(y / height, 0, 1);
            const radius = 0.045 + Math.sin(Math.PI * t) ** 0.82 * (0.62 + t * 0.29);
            const theta = x / (columns * width) * Math.PI * 2;
            for (const inset of [1, 0.78]) vertices.push(Math.cos(theta) * radius * inset, t * height, Math.sin(theta) * radius * inset);
          }
          indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
        }
      }
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => lattice.dispose(), [lattice]);
  return <group>
    <mesh geometry={lattice} position={[0, 0.55, 0]} castShadow receiveShadow><Paper color="#90c7b1" /></mesh>
    {[-1, 1].map((side) => <Line key={side} points={[[side * 0.11, 0.56, 0], [side * 0.17, 0.13, 0]]} color="#a78d63" lineWidth={1.3} />)}
    <Box at={[0, 0.07, 0]} size={[0.38, 0.26, 0.28]} color="#b49a6f" />
    <Box at={[0, 0.22, 0]} size={[0.42, 0.04, 0.32]} color="#cfb68a" />
  </group>;
}


function DesertSand() {
  const { surface, skirt, texture, treads } = useMemo(() => {
    const surface=new THREE.PlaneGeometry(5.8,6.1,112,112); surface.rotateX(-Math.PI/2);
    const pos=surface.getAttribute('position');
    for(let i=0;i<pos.count;i++) pos.setY(i,sandHeight(pos.getX(i),pos.getZ(i)));
    surface.computeVertexNormals();
    const outline: Vec3[]=[[-2.9,0,-3.05],[2.9,0,-3.05],[2.9,0,3.05],[-2.9,0,3.05],[-2.9,0,-3.05]];
    const skirtVertices:number[]=[], skirtIndices:number[]=[];
    outline.forEach(([x,,z],i)=> {skirtVertices.push(x,0,z,x,sandHeight(x,z),z); if(i<4){const v=i*2;skirtIndices.push(v,v+1,v+2,v+1,v+3,v+2);}});
    const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(skirtVertices,3));skirt.setIndex(skirtIndices);skirt.computeVertexNormals();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
    const ctx=canvas.getContext('2d')!;
    let seed=472;
    const pixels=ctx.createImageData(1024,1024);
    for(let i=0;i<pixels.data.length;i+=4){seed=seed*16807%2147483647;const n=seed%25-12;pixels.data[i]=219+n;pixels.data[i+1]=190+n;pixels.data[i+2]=140+n;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);
    // Loose sand reads through grains and broad, soft tonal drift, without ruled bands.
    for(let patch=0;patch<90;patch++){
      seed=seed*16807%2147483647;const x=seed%1024;
      seed=seed*16807%2147483647;const y=seed%1024;
      const radius=40+seed%125;
      const wash=ctx.createRadialGradient(x,y,0,x,y,radius);
      wash.addColorStop(0,patch%2?'rgba(155,117,62,0.045)':'rgba(255,241,201,0.08)');
      wash.addColorStop(1,'rgba(220,190,140,0)');
      ctx.fillStyle=wash;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
    }
    for(let i=0;i<80000;i++){seed=seed*16807%2147483647;const x=seed%1024;seed=seed*16807%2147483647;const y=seed%1024;ctx.fillStyle=i%3?'rgba(118,89,49,0.18)':'rgba(255,247,218,0.55)';ctx.fillRect(x,y,i%7===0?1.3:0.6,0.7);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
    const treadVertices:number[]=[];
    for(const side of [-1,1])for(let i=0;i<32;i++){
      const along=-1.1-i*0.046;
      for(const across of [side*0.525-0.028,side*0.525+0.028]){
        const x=-0.75+Math.cos(-0.8)*along+Math.sin(-0.8)*across,z=1.3-Math.sin(-0.8)*along+Math.cos(-0.8)*across;
        treadVertices.push(x,sandHeight(x,z)+0.003,z);
      }
    }
    const treads=new THREE.BufferGeometry();treads.setAttribute('position',new THREE.Float32BufferAttribute(treadVertices,3));
    return {surface,skirt,texture,treads};
  },[]);
  useEffect(()=>()=>{surface.dispose();skirt.dispose();texture.dispose();treads.dispose();},[surface,skirt,texture,treads]);
  return <group>
    <mesh geometry={surface} receiveShadow castShadow><meshStandardMaterial map={texture} bumpMap={texture} bumpScale={0.014} roughness={1} /></mesh>
    <mesh geometry={skirt} receiveShadow><meshStandardMaterial color="#c3a271" roughness={1} side={THREE.DoubleSide}/></mesh>
    <lineSegments geometry={treads}><lineBasicMaterial color="#9d7e50" transparent opacity={0.24}/></lineSegments>
  </group>;
}

function AirmailEnvelope() {
  return <group>
    <Box at={[0,0,0]} size={[.42,.29,.018]} color="#f6e9cc"/>
    <Line points={[[-.20,.135,.011],[0,-.015,.011],[.20,.135,.011]]} color="#a48b65" lineWidth={1}/>
    <Line points={[[-.20,-.135,.011],[-.065,-.04,.011]]} color="#b59b75" lineWidth={.8}/>
    <Line points={[[.20,-.135,.011],[.065,-.04,.011]]} color="#b59b75" lineWidth={.8}/>
    <group position={[0,0,-.012]} rotation={[0,Math.PI,0]}>
      <mesh position={[.105,.025,0]}><ringGeometry args={[.064,.071,32]}/><meshBasicMaterial color="#9a6347" side={THREE.DoubleSide}/></mesh>
      <Line points={[[.08,.025,.001],[.074,.054,.001],[.088,.073,.001],[.114,.073,.001],[.128,.054,.001],[.121,.025,.001],[.08,.025,.001],[.092,.008,.001],[.111,.008,.001],[.121,.025,.001]]} color="#9a6347" lineWidth={1}/>
      <Line points={[[.092,.008,.001],[.092,-.012,.001],[.111,-.012,.001],[.111,.008,.001]]} color="#9a6347" lineWidth={1}/>
      <Line points={[[-.15,-.05,0],[-.035,-.05,0]]} color="#b59b75" lineWidth={1}/>
      <Line points={[[-.15,-.085,0],[-.065,-.085,0]]} color="#b59b75" lineWidth={1}/>
    </group>
  </group>;
}

export function DesertScene({ journey, reducedMotion, onPhase, onStart, paused, catSize }: {
  journey: Journey; reducedMotion: boolean; onPhase: (phase: Journey) => void; onStart: () => void; paused: boolean; catSize: number;
}) {
  const {invalidate}=useThree();
  const catGroup = useRef<THREE.Group>(null);
  const walkRoot=useRef<THREE.Group>(null);
  const arrived=useRef(false);
  const walk=useTravelWalk({enabled:!paused&&journey!=='rising',root:walkRoot,cat:catGroup,scene:'desert',height:(x,z)=>sandHeight(x,z)+.025,reduced:reducedMotion,onFreeWalk:()=>{if(journey==='walking')onPhase('ready');}});
  useEffect(()=>{if(!paused&&journey==='walking'){arrived.current=false;walk.moveTo([1.3,1.95],()=>{arrived.current=true;});}},[paused,journey]);
  const balloon = useRef<THREE.Group>(null);
  const balloonFloat = useRef<THREE.Group>(null);
  const floatTime = useRef(0);
  const elapsed = useRef(0);
  const letter=useRef<THREE.Group>(null),letterFlip=useRef<THREE.Group>(null),paws=useRef<THREE.Group>(null);
  const deliveryButton=useRef<HTMLButtonElement>(null);
  const flightFrom=useRef(new THREE.Vector3(.6,1.22,-1.66));
  useEffect(() => {
    elapsed.current = 0;
    if(balloon.current&&journey==='walking')flightFrom.current.copy(balloon.current.position).add(new THREE.Vector3(0,balloonFloat.current?.position.y??0,0));
    if(journey==='ready'||journey==='collected'){
      balloon.current?.position.set(.6,journey==='collected'?1.84:1.22,-1.66);
      if(letter.current)letter.current.visible=false;
      if(catGroup.current)catGroup.current.rotation.z=0;
    }
  }, [journey]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  useFrame((_, delta) => {
    if(paused)return;
    if (!reducedMotion) floatTime.current += delta;
    if (balloonFloat.current) {
      balloonFloat.current.position.y = reducedMotion||journey==='walking'||journey==='rising' ? 0 : Math.sin(floatTime.current * Math.PI * 2 / 6.8) * 0.25;
    }
    if(journey!=='walking'&&journey!=='rising')return;
    elapsed.current+=Math.min(delta,.08);
    const smooth=(n:number)=>THREE.MathUtils.smoothstep(n,0,1);
    const t=elapsed.current/(reducedMotion ? .1 : 1);
    if(journey==='walking'){
      const f=smooth(t/1.4);
      balloon.current!.position.set(THREE.MathUtils.lerp(flightFrom.current.x,1.9,f),THREE.MathUtils.lerp(flightFrom.current.y,.72,f)+(reducedMotion?0:Math.sin(f*Math.PI)*.9),THREE.MathUtils.lerp(flightFrom.current.z,1.25,f));
      if(deliveryButton.current)deliveryButton.current.dataset.airmailPhase='approaching';
      if(arrived.current&&f===1)onPhase('rising');
    }else if(catGroup.current&&letter.current){
      const cat=catGroup.current;
      const reach=smooth((t-.65)/.8),depart=smooth((t-2.25)/1.2),putAway=smooth((t-3.85)/.55);
      walk.pose.current.frame=t<.65?1:0;walk.pose.current.mirrored=t<.65;
      cat.rotation.z=reducedMotion?0:-.075*Math.sin(smooth(t/1.45)*Math.PI);
      letter.current.visible=t<4.4;
      letter.current.position.set(THREE.MathUtils.lerp(1.9,cat.position.x+.1,reach),THREE.MathUtils.lerp(.97,cat.position.y+catSize*.65/1.35,reach)+(reducedMotion?0:Math.sin(reach*Math.PI)*.1)-putAway*.18,THREE.MathUtils.lerp(1.45,cat.position.z+.12,reach));
      letter.current.scale.setScalar(1-putAway*.95);
      if(letterFlip.current)letterFlip.current.rotation.y=Math.PI*smooth((t-1.5)/.65);
      if(paws.current)paws.current.visible=reach>.6&&putAway<.9;
      balloon.current!.position.set(THREE.MathUtils.lerp(1.9,.6,depart),THREE.MathUtils.lerp(.72,1.84,depart)+(reducedMotion?0:Math.sin(depart*Math.PI)*.8),THREE.MathUtils.lerp(1.25,-1.66,depart));
      if(deliveryButton.current)deliveryButton.current.dataset.airmailPhase=t<.65?'inspecting':t<1.5?'receiving':t<2.25?'postmark':t<3.85?'departing':'holding';
      if(t>=4.4){letter.current.visible=false;cat.rotation.z=0;onPhase('collected');}
    }
    invalidate();
  });
  return <group ref={walkRoot} position={[0, 0.08, 0]} onClick={walk.onClick}>
    <hemisphereLight args={['#fff8e8', '#ae9670', 0.45]} />
    <DesertSand />
    <Mountain z={-2.64} heights={[2.05, 2.68, 2.27, 2.92, 2.35, 2.57, 2.18, 2.7, 2.18]} color="#d4ba91" />
    <Mountain z={-2.03} heights={[1.72, 2.14, 1.91, 2.38, 1.7, 2.16, 1.84, 2.2, 1.65]} color="#c4a477" />
    <Mountain z={-1.31} heights={[0.67, 1.04, 0.89, 1.3, 0.79, 1.04, 0.87, 1.23, 0.64]} color="#d6b68b" />
    <Cactus at={[-2.06, sandHeight(-2.06,-0.95)+0.005, -0.95]} height={2.85} color="#697d4c" yaw={0.12} />
    <Cactus at={[2.13, sandHeight(2.13,-0.66)+0.005, -0.66]} height={2.45} color="#9ba764" yaw={-0.2} />
    <Cactus at={[0.28, sandHeight(0.28,-0.98)+0.005, -0.98]} height={1.93} color="#477c62" kind="pear" yaw={-0.2} />
    <Cactus at={[1.27, sandHeight(1.27,0.05)+0.005, 0.05]} height={1.3} color="#86a675" kind="pear" />
    <Cactus at={[-2.35, sandHeight(-2.35,1.97)+0.005, 1.97]} height={1.22} color="#b8c58b" kind="pear" yaw={0.15} />
    <Cactus at={[2.35, sandHeight(2.35,1.97)+0.005, 1.97]} height={1.05} color="#a2ad6b" kind="barrel" />
    <Cactus at={[1.5, sandHeight(1.5,2.8)+0.005, 2.8]} height={0.61} color="#587c61" kind="barrel" />
    <Cactus at={[-1.9, sandHeight(-1.9,-0.1)+0.005, -0.1]} height={0.72} color="#a6b077" kind="barrel" />
    <group ref={balloon} position={[0.6, journey === 'collected' ? 1.84 : 1.22, -1.66]} onClick={event=>{if(event.delta>4)return;event.stopPropagation();if(journey==='ready'&&!paused)onStart();}}>
      <group ref={balloonFloat}><HoneycombBalloon /></group>
      {!paused&&<Html center position={[0,.25,.18]} zIndexRange={[2,1]}>
        <button ref={deliveryButton} className="study-clasp study-airmail-hint" aria-label="Receive airmail" data-airmail-phase={journey} disabled={journey!=='ready'} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onStart();}}><span className="study-clasp-hint" aria-hidden="true">Click to receive</span></button>
      </Html>}
    </group>
    <group ref={letter} visible={false}><Billboard lockX lockZ><group ref={letterFlip}><AirmailEnvelope/></group><group ref={paws} visible={false}>{[-1,1].map(side=><mesh key={side} position={[side*.22,-.035,.04]} scale={[.8,1,.6]} castShadow><sphereGeometry args={[.065,8,6]}/><Paper color="#eee0c6"/></mesh>)}</group></Billboard></group>
    <Camper reducedMotion={reducedMotion} />
    <group ref={catGroup} position={[1.7, sandHeight(1.7,2.18)+.025, 2.18]}>
      <TravelCat size={catSize} pose={walk.pose} interactive={!paused&&journey!=='rising'} label="Walk with desert cat" onWalk={()=>{if(journey==='walking')onPhase('ready');walk.moveTo([1.95,1.15]);}}/>
    </group>
    <Ink at={[0.3, 0.09, 3.44]} size={0.16}>Desert Detour</Ink>
  </group>;
}


function makePaperTexture(){
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    let seed = 97;
    const pixels = ctx.createImageData(1024, 1024);
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = seed * 16807 % 2147483647;
      const grain = seed % 31 - 15;
      pixels.data[i] = 242 + grain; pixels.data[i + 1] = 234 + grain; pixels.data[i + 2] = 215 + grain; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    // Irregular pulp clouds and long loose fibers survive minification better than isolated pixel dots.
    for (let i = 0; i < 170; i++) {
      seed = seed * 16807 % 2147483647; const x = seed % 1024;
      seed = seed * 16807 % 2147483647; const y = seed % 1024;
      const r = 25 + seed % 100;
      const cloud = ctx.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, i % 2 ? 'rgba(122,94,51,0.065)' : 'rgba(255,255,245,0.15)'); cloud.addColorStop(1, 'rgba(160,135,90,0)');
      ctx.fillStyle = cloud; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 16500; i++) {
      seed = seed * 16807 % 2147483647; const x = seed % 1024;
      seed = seed * 16807 % 2147483647; const y = seed % 1024;
      const length = 3 + seed % 15, angle = (seed % 628) / 100;
      ctx.strokeStyle = i % 3 ? 'rgba(104,82,45,0.13)' : 'rgba(255,255,246,0.58)';
      ctx.lineWidth = i % 5 ? 0.55 : 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(angle) * length / 2 + 1.2, y + Math.sin(angle) * length / 2, x + Math.cos(angle) * length, y + Math.sin(angle) * length); ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return map;
}

export function DesertPaper({children}:{children:React.ReactNode}){
  const texture=useMemo(makePaperTexture,[]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  return <PaperTexture.Provider value={texture}>{children}</PaperTexture.Provider>;
}
