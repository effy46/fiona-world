import { publicAsset } from '../../lib/publicAsset';
import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import {TravelCat} from './TravelCat';
import {useTravelWalk} from './useTravelWalk';
import {TrainSteam} from './TrainSteam';
import { Billboard, Text, useGLTF, useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
const lampXs = [-1.98,.99] as const;
const HAND = publicAsset('/fonts/PatrickHand-Regular.ttf');
const SERIF = publicAsset('/fonts/Lora-Regular.ttf');
type Vec3 = [number, number, number];
export type PostState = 'ready' | 'posting' | 'sent';
const PaperTexture = createContext<THREE.Texture | null>(null);

function Paper({ color = '#eee0c0', glow = false }: { color?: string; glow?: boolean }) {
  const map = useContext(PaperTexture);
  return <meshStandardMaterial map={map} color={color} roughness={0.96} metalness={0} flatShading emissive={color} emissiveIntensity={glow ? 0.65 : 0.035} />;
}

function Block({ at, size, color, rotation = [0, 0, 0] }: { at: Vec3; size: Vec3; color: string; rotation?: Vec3 }) {
  return <mesh position={at} rotation={rotation} castShadow receiveShadow><boxGeometry args={size} /><Paper color={color} /></mesh>;
}

function Label({ at, children, size = 0.2, color = '#58432f', flat = false, hand = false, width = 5, font }: { at: Vec3; children: string; size?: number; color?: string; flat?: boolean; hand?: boolean; width?: number; font?: string }) {
  return <Text position={at} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} font={font ?? (hand ? HAND : SERIF)} fontSize={size} color={color} maxWidth={width} anchorX="center" anchorY="middle" textAlign="center" depthOffset={-4}>{children}</Text>;
}

function Envelope({ at, scale = 1, flat = false }: { at: Vec3; scale?: number; flat?: boolean }) {
  return (
    <group position={at} scale={scale} rotation={flat ? [-Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <Block at={[0, 0, 0]} size={[0.42, 0.27, 0.014]} color="#f4e7ca" />
      <Block at={[-0.095, 0.015, 0.01]} size={[0.23, 0.009, 0.005]} color="#987b54" rotation={[0, 0, -0.53]} />
      <Block at={[0.095, 0.015, 0.01]} size={[0.23, 0.009, 0.005]} color="#987b54" rotation={[0, 0, 0.53]} />
    </group>
  );
}

function Cutout({ texture, at, w, h, yaw = 0, tint = '#ffffff', grounded = true }: { texture: THREE.Texture; at: Vec3; w: number; h: number; yaw?: number; tint?: string; grounded?: boolean }) {
  return (
    <group position={at} rotation={[0, yaw, 0]}>
      <mesh position={[0.008, h / 2, -0.012]}><planeGeometry args={[w, h]} /><meshStandardMaterial map={texture} color="#bfa57b" alphaTest={0.4} roughness={1} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} color={tint} alphaTest={0.4} toneMapped={false} side={THREE.DoubleSide} />
        <meshDepthMaterial attach="customDepthMaterial" map={texture} alphaTest={0.4} depthPacking={THREE.RGBADepthPacking} />
      </mesh>
      {grounded && <Block at={[0, 0.015, 0.08]} size={[w * 0.28, 0.025, 0.16]} color="#c3ae86" />}
    </group>
  );
}

function StationNameboard({x=1.98}:{x?:number}) {
  const wood = useTexture(publicAsset('/slow-post/sign-painted-oak.png'));
  useEffect(() => { wood.colorSpace = THREE.SRGBColorSpace; wood.anisotropy = 8; }, [wood]);
  const [outline, face] = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.86, -0.27);
    shape.lineTo(0.86, -0.27); shape.lineTo(0.86, 0.22);
    shape.lineTo(0.57, 0.22); shape.quadraticCurveTo(0, 0.46, -0.57, 0.22);
    shape.lineTo(-0.86, 0.22); shape.closePath();
    const inner = shape.clone();
    const geometry = new THREE.ShapeGeometry(inner);
    geometry.scale(0.88, 0.76, 1);
    const positions = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i++) {
      uv.setXY(i, (positions.getX(i) + 0.757) / 1.514, (positions.getY(i) + 0.206) / 0.462);
    }
    return [shape, geometry] as const;
  }, []);
  useEffect(() => () => face.dispose(), [face]);
  return (
    <group position={[x, 0.3, -0.54]}>
      {[-0.59, 0.59].map((x) => <group key={x}>
        <mesh position={[x, 0.56, 0]} castShadow receiveShadow><boxGeometry args={[0.075, 1.12, 0.085]} /><meshStandardMaterial map={wood} color="#99704a" roughness={0.95} /></mesh>
        <Block at={[x, 0.06, 0.015]} size={[0.15, 0.075, 0.17]} color="#987b50" />
      </group>)}
      <group position={[0, 1.19, -0.045]}>
        <mesh castShadow receiveShadow>
          <extrudeGeometry args={[outline, { depth: 0.075, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 2 }]} />
          <meshStandardMaterial map={wood} color="#8b603e" roughness={0.97} />
        </mesh>
        <mesh geometry={face} position={[0, 0, 0.091]}>
          <meshStandardMaterial map={wood} roughness={0.96} bumpMap={wood} bumpScale={0.009} />
        </mesh>
        <Label at={[0, -0.005, 0.096]} size={0.185} color="#563e2a">SLOW POST</Label>
        {[-0.68, 0.68].map((x) => <mesh key={x} position={[x, -0.013, 0.102]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.015, 0.015, 0.008, 8]} /><meshStandardMaterial color="#826649" roughness={0.9} /></mesh>)}
      </group>
    </group>
  );
}

// GLB meshes carry the Blender-authored folded panels, cut edges and portable paper textures.
function BlenderModel({ src }: { src: string }) {
  const { scene } = useGLTF(src);
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
  }, [scene]);
  return <primitive object={scene} dispose={null} />;
}

function SteamTrain({active,reduced}:{active:boolean;reduced:boolean}) {
  return (
    <group position={[0, 0.0885, 2.4]}>
      <BlenderModel src={publicAsset('/slow-post/models/train-papercraft.glb')} />
      <TrainSteam active={active} reduced={reduced}/>
      <Label at={[-0.36, 0.91, 0.479]} size={0.17} color="#f4e4bc">31</Label>
      <group position={[-0.36, 0.91, -0.479]} rotation={[0, Math.PI, 0]}><Label at={[0, 0, 0]} size={0.17} color="#f4e4bc">31</Label></group>
      <group position={[-2.38, 1.01, 0]} rotation={[0, -Math.PI / 2, 0]}><Envelope at={[0, 0, 0]} scale={0.65} /></group>
    </group>
  );
}

function Lantern({ x }: { x: number }) {
  return (
    <group position={[x, 0.25, -0.44]}>
      <Block at={[0, 0.06, 0]} size={[0.27, 0.12, 0.24]} color="#514f3e" />
      <Block at={[0, 0.88, 0]} size={[0.055, 1.65, 0.055]} color="#595744" />
      <mesh position={[0, 1.85, 0]}><cylinderGeometry args={[0.1, 0.15, 0.3, 4]} /><Paper color="#efd28b" glow /></mesh>
      <mesh position={[0, 2.07, 0]} castShadow><coneGeometry args={[0.25, 0.17, 4]} /><Paper color="#555642" /></mesh>
      <Block at={[0, 1.65, 0]} size={[0.28, 0.05, 0.28]} color="#555642" />
      {[-1, 1].map((side) => <Block key={side} at={[side * 0.11, 1.85, 0.12]} size={[0.019, 0.33, 0.019]} color="#555642" />)}
    </group>
  );
}

function Postbox({x=-.76,onPost}:{x?:number;onPost?:()=>void}) {
  return (
    <group position={[x, 0.26, -0.5]} onClick={event=>{if(onPost){event.stopPropagation();onPost();}}}>
      <Block at={[0, 0.07, 0]} size={[0.59, 0.14, 0.55]} color="#944e39" />
      <Block at={[0, 0.65, 0]} size={[0.45, 1.15, 0.43]} color="#b96148" />
      <Block at={[0, 1.23, 0]} size={[0.6, 0.07, 0.55]} color="#cc7953" />
      <mesh position={[0, 1.33, 0]} rotation={[0, Math.PI / 4, 0]} castShadow><coneGeometry args={[0.4, 0.18, 4]} /><Paper color="#b95f43" /></mesh>
      <Block at={[0, 0.99, 0.222]} size={[0.29, 0.08, 0.012]} color="#4e3325" />
      <Label at={[0, 0.8, 0.229]} size={0.09} color="#f5e2b9">POST</Label>
      <Envelope at={[0, 0.51, 0.23]} scale={0.48} />
    </group>
  );
}

export function StationScene({ state, reducedMotion, onDelivered, onPost, paused, onCancelPost, catSize }: {
  state: PostState; reducedMotion: boolean; onDelivered: () => void; onPost: () => void; paused: boolean; onCancelPost: () => void; catSize: number;
}) {
  const postboxX=2.1;
  const [tree, backdrop] = useTexture([publicAsset('/slow-post/autumn-maple.png'), publicAsset('/slow-post/forest-backdrop.png')]);
  useEffect(() => { [tree, backdrop].forEach((tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; }); }, [tree, backdrop]);
  useEffect(() => {
    // The generated panorama has transparent margins. Map its artwork bounds to the card
    // so the printed baseline sits on the page rather than hovering above it.
    backdrop.repeat.set(1822 / 1837, 649 / 856);
    backdrop.offset.set(8 / 1837, 110 / 856);
    backdrop.needsUpdate = true;
  }, [backdrop]);
  const catGroup = useRef<THREE.Group>(null);
  const walkRoot=useRef<THREE.Group>(null);
  const walk=useTravelWalk({enabled:!paused,root:walkRoot,cat:catGroup,scene:'station',height:()=>.3,reduced:reducedMotion,onFreeWalk:()=>onCancelPost()});
  const postingReady=useRef(false);
  const letter = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const catTarget=postboxX-.64;
  const postStandZ=-.28;
  useEffect(() => {
    progress.current = state === 'sent' ? 1 : 0;postingReady.current=false;
    if(letter.current)letter.current.visible=false;
    if(!paused&&state==='posting')walk.moveTo([catTarget,postStandZ],()=>{postingReady.current=true;progress.current=.6;});
  }, [state,paused,catTarget]);
  useFrame((_, dt) => {
    if (state !== 'posting'||!postingReady.current) return;
    progress.current = Math.min(1, progress.current + Math.min(dt, 0.08) / (reducedMotion ? 0.15 : 4.2));
    const t = progress.current;
    if (letter.current) {
      // Hold the full envelope briefly, then shrink only as it enters the slot.
      const post = THREE.MathUtils.clamp((t - 0.7) / 0.25, 0, 1);
      letter.current.position.set(catTarget+.03+post*(postboxX-catTarget-.03), THREE.MathUtils.lerp(.3+.74*catSize/1.35,1.25,post) + Math.sin(post * Math.PI) * 0.15, THREE.MathUtils.lerp(postStandZ+.17,-.26,post));
      letter.current.scale.setScalar(1 - THREE.MathUtils.clamp((post-.8)/.2,0,1)*.7);
      letter.current.visible = t > 0.56 && post < 0.98;
    }
    if (t === 1) onDelivered();
  });
  return (
    <group ref={walkRoot} position={[0, 0.08, -0.05]} onClick={walk.onClick}>
      <Block at={[0, 0, 0.15]} size={[5.9, 0.075, 6.45]} color="#c7b48e" />
      <Block at={[0, 0.05, 2.15]} size={[5.78, 0.04, 1.57]} color="#b2aa92" />
      {/* A continuous illustrated horizon matches the miniature reference; close trees stay separate standees. */}
      <Cutout texture={backdrop} at={[0, 0.07, -2.7]} w={5.8} h={3.0} grounded={false} />
      {[
        [-2.03, -1.61, 1.92, 2.7, 0.03], [-0.45, -1.73, 1.9, 2.4, -0.04],
        [1.1, -1.67, 1.88, 2.5, 0.05], [2.08, -1.45, 1.52, 2.85, -0.13],
        [-2.6, -0.7, 1.12, 2.36, 0.21], [2.68, 0.35, 0.72, 1.64, -0.25],
      ].map(([x, z, w, h, yaw], i) => <Cutout key={i} texture={tree} at={[x, 0.08, z]} w={w} h={h} yaw={yaw} tint={i % 2 ? '#f4d9ac' : '#ffffff'} />)}
      {/* Railway sleepers and two continuous rails sit ahead of the platform. */}
      {Array.from({ length: 23 }, (_, i) => <Block key={i} at={[-2.76 + i * 0.25, 0.11, 2.41]} size={[0.13, 0.065, 1.31]} color={i % 3 ? '#88704d' : '#9f855a'} />)}
      {[1.91, 2.89].map((z) => <Block key={z} at={[0, 0.166, z]} size={[5.78, 0.045, 0.04]} color="#a99e7e" />)}
      <BlenderModel src={publicAsset('/slow-post/models/platform-papercraft.glb')} />
      {Array.from({ length: 7 }, (_, i) => <Block key={i} at={[-2.66 + i * 0.88, 0.68, -0.72]} size={[0.07, 0.85, 0.08]} color="#775b39" />)}
      {[0.49, 0.96].map((y) => <Block key={y} at={[0, y, -0.72]} size={[5.4, 0.065, 0.06]} color="#886542" />)}
      {[-2.2, -1.32, -0.44, 0.44, 1.32, 2.2].map((x) => <group key={x}>{[-1, 1].map((dir) => <Block key={dir} at={[x, 0.71, -0.68]} size={[0.88, 0.04, 0.035]} color="#896641" rotation={[0, 0, dir * 0.49]} />)}</group>)}
      {lampXs.map(x=><Lantern key={x} x={x}/>)}
      <Postbox x={postboxX} onPost={onPost}/>
      <group position={[-1.85, 0.3, 0.3]}>
        {[0, 0.13, 0.26].map((z) => <Block key={z} at={[0, 0.25, z]} size={[0.85, 0.045, 0.105]} color="#ba8b50" />)}
        {[0.37, 0.54].map((y) => <Block key={y} at={[0, y, -0.06]} size={[0.85, 0.11, 0.04]} color="#c19459" />)}
        {[-0.32, 0.32].map((x) => <Block key={x} at={[x, 0.13, 0.12]} size={[0.055, 0.25, 0.3]} color="#66563c" />)}
      </group>
      <StationNameboard x={(lampXs[0]+lampXs[1])/2}/>
      <group ref={catGroup} position={[.45, .3, -.18]}>
        <TravelCat uprightDepth size={catSize} pose={walk.pose} interactive={!paused} label="Walk with station cat" onWalk={()=>{onCancelPost();walk.moveTo([.1,.1]);}}/>
      </group>
      <group ref={letter} visible={false}><Billboard><Envelope at={[0, 0, 0]} scale={1.5} /></Billboard></group>
      <SteamTrain active={!paused} reduced={reducedMotion}/>
      {Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-2.7 + (i * 1.37) % 5.4, 0.19, 2.86 + (i % 3) * 0.12]} rotation={[-Math.PI / 2, 0, i * 0.91]}><circleGeometry args={[0.055 + (i % 3) * 0.013, 5]} /><Paper color={['#bf7140', '#a64a32', '#d4a34f'][i % 3]} /></mesh>)}
      <Label at={[0, 0.105, 3.23]} size={0.15} flat hand>Slow Post Station</Label>
    </group>
  );
}


function makePaperTexture(){
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#faf3e3'; ctx.fillRect(0, 0, 512, 512);
    let seed = 71;
    for (let i = 0; i < 11000; i++) {
      seed = (seed * 16807) % 2147483647; const x = (seed % 512);
      seed = (seed * 16807) % 2147483647; const y = (seed % 512);
      ctx.fillStyle = i % 2 ? 'rgba(105,80,45,0.055)' : 'rgba(255,255,245,0.3)';
      ctx.fillRect(x, y, 1, i % 4 === 0 ? 3 : 1);
    }
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    return map;
}

export function StationPaper({children}:{children:React.ReactNode}){
  const texture=useMemo(makePaperTexture,[]);
  useEffect(()=>()=>texture?.dispose(),[texture]);
  return <PaperTexture.Provider value={texture}>{children}</PaperTexture.Provider>;
}
