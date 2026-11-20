import { publicAsset } from '../lib/publicAsset';
import { createContext, useContext, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBox, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';

type Vec3 = [number, number, number];
const INK = '#242722';
const DECAL = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 } as const;

type Finish = 'paper' | 'metal' | 'leather' | 'plastic';
const Reflections = createContext<THREE.Texture | null>(null);

function Surface({ color, map, finish }: { color: string; map?: THREE.Texture; finish: Finish }) {
  const environment = useContext(Reflections);
  return <meshPhysicalMaterial color={color} map={map} envMap={environment}
    metalness={finish === 'metal' ? 0.86 : 0.02}
    roughness={finish === 'metal' ? 0.27 : finish === 'leather' ? 0.51 : finish === 'plastic' ? 0.29 : 0.9}
    bumpMap={finish === 'leather' ? map : undefined} bumpScale={0.014}
    clearcoat={finish === 'leather' ? 0.16 : finish === 'plastic' ? 0.3 : 0}
    clearcoatRoughness={0.4} envMapIntensity={finish === 'metal' ? 1.1 : 0.45} />;
}

function Block({ at, size, color, map, finish = 'paper' }: { at: Vec3; size: Vec3; color: string; map?: THREE.Texture; finish?: Finish }) {
  return <RoundedBox position={at} args={size} radius={Math.min(0.045, ...size.map(n => n * 0.23))} smoothness={3} castShadow receiveShadow>
    <Surface color={color} map={map} finish={finish} />
  </RoundedBox>;
}

function Drum({ at, radius, depth, color, front = false, map, finish = 'plastic' }: { at: Vec3; radius: number; depth: number; color: string; front?: boolean; map?: THREE.Texture; finish?: Finish }) {
  return <mesh position={at} rotation={front ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow receiveShadow>
    <cylinderGeometry args={[radius, radius, depth, 64]} /><Surface color={color} map={map} finish={finish} />
  </mesh>;
}

/** A real ribbon surface, with its broad face following the camera's fabric strap. */
function Strap({ points, width = 0.09 }: { points: Vec3[]; width?: number }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const vertices: number[] = [], indices: number[] = [];
    for (let i = 0; i <= 48; i++) {
      const p = curve.getPoint(i / 48);
      const tangent = curve.getTangent(i / 48);
      const across = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize().multiplyScalar(width / 2);
      vertices.push(p.x + across.x, p.y + across.y, p.z, p.x - across.x, p.y - across.y, p.z);
      if (i < 48) { const n = i * 2; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals(); return g;
  }, [points, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} castShadow><meshStandardMaterial color="#372a20" roughness={1} side={THREE.DoubleSide} /></mesh>;
}

function OldBook({ at, size, yaw = 0, upright = false, map, pages, spine }: { at: Vec3; size: Vec3; yaw?: number; upright?: boolean; map: THREE.Texture; pages: THREE.Texture; spine: THREE.Texture }) {
  const [w, h, d] = size;
  return <group position={[at[0], at[1] + (upright ? d / 2 : 0), at[2]]} rotation={[0, yaw, 0]}>
    <group rotation={[upright ? Math.PI / 2 : 0, 0, 0]}>
    <Block at={[0.025, h / 2, 0]} size={[w - 0.13, h - 0.09, d - 0.12]} color="#e5dbc1" map={pages} />
    {[0.024, h - 0.024].map(y => <group key={y}>
      <Block at={[0, y, 0]} size={[w, 0.048, d]} color="#ffffff" map={map} finish="leather" />
      <mesh position={[0, y + (y > h / 2 ? 0.025 : -0.025), 0]} rotation={[y > h / 2 ? -Math.PI / 2 : Math.PI / 2, 0, y > h / 2 ? 0 : Math.PI]}>
        <planeGeometry args={[w - 0.015, d - 0.015]} /><Surface color="#ffffff" map={map} finish="leather" />
      </mesh>
    </group>)}
    <mesh position={[-w / 2 + 0.045, h / 2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.085, 1, h / 2]} castShadow>
      <cylinderGeometry args={[1, 1, d, 32]} />
      <Surface color="#513020" map={map} finish="leather" />
    </mesh>
    {[-d * 0.36, -d * 0.30, d * 0.30, d * 0.36].map(z => <Block key={z} at={[-w / 2 - 0.045, h / 2, z]} size={[0.015, h * 0.91, 0.027]} color="#b69857" finish="metal" />)}
    {!upright && <mesh position={[0, h / 2, d / 2 + 0.002]}>
      <planeGeometry args={[w, h - 0.025]} /><Surface color="#ffffff" map={spine} finish="leather" />
    </mesh>}
    </group>
  </group>;
}

function PaperAlbum({ kraft }: { kraft: THREE.Texture }) {
  const sheets = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const g = new THREE.BoxGeometry(2.56, 0.009, 1.7, 20, 1, 15);
    const p = g.getAttribute('position');
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), z = p.getZ(j);
      p.setY(j, p.getY(j) + Math.sin(x * 10.7 + i * 2.3) * 0.0025 + Math.cos(z * 13.1 + i) * 0.0015);
      p.setX(j, x + Math.sin(z * 18.7 + i * 1.8) * 0.002);
    }
    g.computeVertexNormals(); return g;
  }), []);
  useEffect(() => () => sheets.forEach(g => g.dispose()), [sheets]);
  return <group position={[0.62, 0.51, -0.15]} rotation={[0, -0.07, 0]}>
    <Block at={[0, 0.015, 0]} size={[2.75, 0.03, 1.9]} map={kraft} color="#ffffff" />
    {sheets.map((g, i) => <mesh key={i} geometry={g} position={[0, 0.05 + i * 0.0124, 0]} castShadow receiveShadow><meshStandardMaterial color={i % 3 ? '#f0e5c8' : '#e1d4b4'} roughness={1} /></mesh>)}
    <Block at={[0, 0.48, 0]} size={[2.78, 0.032, 1.92]} map={kraft} color="#ffffff" />
    <Block at={[0.20, 0.503, 0]} size={[0.22, 0.018, 1.96]} map={kraft} color="#d7bd8a" />
    <Block at={[0.20, 0.26, 0.975]} size={[0.22, 0.5, 0.025]} map={kraft} color="#d7bd8a" />
    <Block at={[0.20, 0.514, 0.43]} size={[0.35, 0.015, 0.13]} color="#80613a" />
  </group>;
}

function VintageCamera({ silver, leather }: { silver: THREE.Texture; leather: THREE.Texture }) {
  const environment = useContext(Reflections);
  const roof = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.58, 0); s.lineTo(-0.40, 0.43); s.lineTo(0.33, 0.43); s.lineTo(0.57, 0); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.59, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.022, bevelThickness: 0.022 });
  }, []);
  useEffect(() => () => roof.dispose(), [roof]);
  return <group position={[0.73, 0.97, -0.23]} rotation={[0, -0.12, 0]} scale={0.90}>
    <Strap width={0.12} points={[[-1.12, 0.7, 0], [-1.51, 0.43, -0.20], [-1.30, 0.08, -0.65], [0, 0.05, -0.90], [1.44, 0.18, -0.70], [1.55, 0.55, -0.15], [1.13, 0.73, 0]]} />
    <Block at={[0, 0.59, 0]} size={[2.26, 1.1, 0.77]} color="#ffffff" map={silver} finish="metal" />
    {[-0.84, 0.84].map(x => <group key={x}>
      <Block at={[x, 0.57, 0.405]} size={[0.55, 0.85, 0.036]} color="#ffffff" map={leather} finish="leather" />
      <Block at={[x, 0.57, -0.405]} size={[0.55, 0.85, 0.036]} color="#ffffff" map={leather} finish="leather" />
      <Block at={[Math.sign(x) * 1.14, 0.57, 0]} size={[0.025, 0.85, 0.76]} color="#ffffff" map={leather} finish="leather" />
      <Drum at={[x, 1.17, 0]} radius={0.22} depth={0.10} color="#b9b7a9" map={silver} finish="metal" />
      <Drum at={[x, 1.226, 0]} radius={0.14} depth={0.01} color="#44463d" />
      <Block at={[x, 0.49, 0.434]} size={[0.09, 0.19, 0.014]} color="#d6d5c5" />
    </group>)}
    <Block at={[0, 0.59, 0.427]} size={[1.14, 1.12, 0.055]} color="#e1ded0" map={silver} finish="metal" />
    <mesh geometry={roof} position={[0, 1.14, -0.31]} castShadow><Surface map={silver} color="#ffffff" finish="metal" /></mesh>
    {/* The cap sits proud of the prism: near-coplanar surfaces flicker while orbiting. */}
    <Block at={[-0.035, 1.607, -0.015]} size={[0.71, 0.045, 0.57]} color="#363933" />
    <Block at={[0, 1.39, 0.335]} size={[0.91, 0.19, 0.012]} color="#ced0ce" finish="metal" />
    <Text position={[0, 1.39, 0.348]} font={publicAsset('/fonts/SourceSerif4-Regular.ttf')} fontSize={0.125} color={INK} depthOffset={-4}>CAMERA</Text>
    <Drum at={[0, 0.59, 0.48]} radius={0.54} depth={0.10} color="#2a2d28" front />
    <Drum at={[0, 0.59, 0.56]} radius={0.50} depth={0.11} color="#c1c1b5" front map={silver} finish="metal" />
    <Drum at={[0, 0.59, 0.72]} radius={0.44} depth={0.25} color="#353933" front map={leather} finish="leather" />
    {Array.from({ length: 72 }, (_, i) => {
      const a = i * Math.PI / 36;
      return <mesh key={i} position={[Math.sin(a) * 0.444, 0.59 + Math.cos(a) * 0.444, 0.71]} rotation={[0, 0, -a]}><boxGeometry args={[0.009, 0.012, 0.22]} /><meshStandardMaterial color="#262829" roughness={0.4} metalness={0.45} /></mesh>;
    })}
    <Drum at={[0, 0.59, 0.87]} radius={0.45} depth={0.05} color="#1c1e20" front />
    <Drum at={[0, 0.59, 0.902]} radius={0.354} depth={0.015} color="#66696a" finish="metal" front />
    <Drum at={[0, 0.59, 0.914]} radius={0.330} depth={0.01} color="#10171c" front />
    <mesh position={[0, 0.59, 0.925]} scale={[0.315, 0.315, 0.065]}>
      <sphereGeometry args={[1, 48, 32]} />
      <meshPhysicalMaterial color="#152a33" metalness={0.05} roughness={0.065} transparent opacity={0.83} transmission={0.25} thickness={0.08} ior={1.52} clearcoat={1} clearcoatRoughness={0.035} envMap={environment} envMapIntensity={0.85} />
    </mesh>
    <Drum at={[0, 0.59, 0.918]} radius={0.135} depth={0.002} color="#071017" front />
    <Text position={[0, 0.966, 0.905]} font={publicAsset('/fonts/SourceSerif4-Regular.ttf')} fontSize={0.033} color="#d1d3cd" depthOffset={-4}>LENS  50mm  1:1.8</Text>
    <Text position={[0, 0.215, 0.905]} font={publicAsset('/fonts/SourceSerif4-Regular.ttf')} fontSize={0.032} color="#d1d3cd" depthOffset={-4}>MULTI COATED</Text>
    {[-0.49, 0.49].map(x => <group key={x}>
      <Drum at={[x, 0.13, 0.465]} radius={0.023} depth={0.012} color="#bbc0bf" front finish="metal" />
      <Block at={[x, 0.13, 0.474]} size={[0.025, 0.004, 0.003]} color="#353b3d" />
    </group>)}
    <Block at={[0.39, 1.08, 0.478]} size={[0.20, 0.10, 0.03]} color={INK} />
    <Drum at={[0.66, 1.25, 0.21]} radius={0.07} depth={0.05} color="#e0ddd0" />
  </group>;
}

function FilmStrip({ at, yaw, length = 1.65, printedFrame }: { at: Vec3; yaw: number; length?: number; printedFrame: THREE.Texture }) {
  const map = useMemo(() => {
    const texture = printedFrame.clone();
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, length / 0.4);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return texture;
  }, [printedFrame, length]);
  useEffect(() => () => map.dispose(), [map]);
  const geometry = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(-0.29, 0); s.lineTo(0.29, 0); s.lineTo(0.29, length); s.lineTo(-0.29, length); s.closePath();
    for (let i = 0; i < Math.floor(length / 0.16); i++) for (const x of [-0.235, 0.235]) {
      const h = new THREE.Path(); h.absellipse(x, 0.08 + i * 0.16, 0.032, 0.043, 0, Math.PI * 2, true, 0); s.holes.push(h);
    }
    const g = new THREE.ShapeGeometry(s); const p = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, (p.getX(i) + 0.29) / 0.58, p.getY(i) / length);
      p.setZ(i, Math.pow(p.getY(i) / length, 4) * 0.025 * Math.min(length / 1.65, 1));
    }
    g.computeVertexNormals(); return g;
  }, [length]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={at} rotation={[-Math.PI / 2, 0, yaw]}>
    {/* Print shares the curled surface; draw translucent film after the photo decals. */}
    <mesh geometry={geometry} castShadow renderOrder={2}>
      <meshStandardMaterial map={map} transparent opacity={0.84} depthWrite={false} roughness={0.78} side={THREE.DoubleSide} />
    </mesh>
  </group>;
}

function FilmRoll({ at, lying = false, label }: { at: Vec3; lying?: boolean; label: THREE.Texture }) {
  return <group position={at} rotation={lying ? [Math.PI / 2, 0, -0.18] : [0, 0, -0.05]}>
    <Drum at={[0, 0.30, 0]} radius={0.20} depth={0.59} color="#242923" />
    <mesh position={[0, 0.30, 0]}><cylinderGeometry args={[0.204, 0.204, 0.45, 24, 1, true]} /><meshStandardMaterial map={label} roughness={0.94} /></mesh>
    {[0.035, 0.575].map(y => <Drum key={y} at={[0, y, 0]} radius={0.22} depth={0.06} color="#2c3029" />)}
    <Drum at={[0, 0.62, 0]} radius={0.09} depth={0.08} color="#32352e" />
  </group>;
}

function Snapshot({ at, yaw, texture, crop }: { at: Vec3; yaw: number; texture: THREE.Texture; crop: readonly [number, number, number, number] }) {
  const [x, y, cropWidth, cropHeight] = crop;
  // Each source already includes its paper border; exclude the transparent margin and baked shadow.
  const { width: imageWidth, height: imageHeight } = texture.image as HTMLImageElement;
  const width = 0.85 * cropWidth / imageWidth;
  const depth = 0.98 * cropHeight / imageHeight;
  const map = useMemo(() => {
    const cropped = texture.clone();
    cropped.colorSpace = THREE.SRGBColorSpace;
    cropped.anisotropy = 8;
    cropped.repeat.set(cropWidth / imageWidth, cropHeight / imageHeight);
    cropped.offset.set(x / imageWidth, 1 - (y + cropHeight) / imageHeight);
    cropped.needsUpdate = true;
    return cropped;
  }, [texture, x, y, cropWidth, cropHeight, imageWidth, imageHeight]);
  useEffect(() => () => map.dispose(), [map]);
  return <group position={at} rotation={[0, yaw, 0]}>
    <Block at={[0, 0, 0]} size={[width, 0.018, depth]} color="#e8e3d3" />
    <mesh position={[0, 0.0098, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[width, depth]} /><meshStandardMaterial map={map} {...DECAL} roughness={1} color="#c3bd9e" /></mesh>
  </group>;
}

/** Vintage camera and leather-bound travel mementos, staged behind the notebook at the desk's upper left. */
export function CameraStillLife() {
  const [kraft, leather, silver, book, label, photo1, photo2, pages, spine, film] = useTexture([
    publicAsset('/desk-camera/kraft.png'), publicAsset('/desk-camera/leather.png'), publicAsset('/desk-camera/silver.png'), publicAsset('/desk-camera/book.png'), publicAsset('/desk-camera/film-label.png'), publicAsset('/desk-props/polaroid.png'), publicAsset('/desk-props/polaroid2.png'), publicAsset('/desk-camera/pages.png'), publicAsset('/desk-camera/spine.png'), publicAsset('/desk-camera/film-strip.png'),
  ]);
  const gl = useThree(state => state.gl);
  const reflections = useMemo(() => {
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const target = generator.fromScene(room, 0.04);
    generator.dispose(); room.dispose();
    return target;
  }, [gl]);
  useEffect(() => () => reflections.dispose(), [reflections]);
  useEffect(() => {
    for (const texture of [kraft, leather, silver, book, label, photo1, photo2, pages, spine, film]) { texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; }
  }, [kraft, leather, silver, book, label, photo1, photo2, pages, spine, film]);
  return <Reflections.Provider value={reflections.texture}><group name="camera-still-life" position={[-5.7, -0.18, -12.9]} rotation={[0, 0.08, 0]} scale={2}>
    <OldBook at={[-2.05, 0, -0.90]} size={[1.55, 0.50, 2.70]} upright yaw={1.32} map={book} pages={pages} spine={spine} />
    <OldBook at={[-1.55, 0, -0.50]} size={[1.50, 0.42, 2.40]} upright yaw={1.16} map={book} pages={pages} spine={spine} />
    <OldBook at={[0.60, 0, -0.18]} size={[2.77, 0.50, 1.94]} yaw={-0.04} map={book} pages={pages} spine={spine} />
    <PaperAlbum kraft={kraft} />
    <VintageCamera silver={silver} leather={leather} />
    <group position={[-1.05, 0.365, 0.85]} rotation={[Math.PI / 2, 0, -0.2]}>
      <Drum at={[0, 0, 0]} radius={0.36} depth={0.48} color="#333831" map={leather} finish="leather" />
      <Drum at={[0, 0.25, 0]} radius={0.32} depth={0.03} color="#63695c" />
      <Drum at={[0, 0.27, 0]} radius={0.25} depth={0.018} color="#262e29" />
      <Drum at={[0, -0.03, 0]} radius={0.365} depth={0.025} color="#b2b4a4" />
    </group>
    <FilmRoll at={[-1.95, 0.01, 1.30]} label={label} />
    <FilmRoll at={[-0.72, 0.22, 1.40]} lying label={label} />
    <FilmStrip printedFrame={film} at={[-0.62, 0.0015, 1.90]} yaw={-0.10} length={0.86} />
    <Snapshot at={[0.43, 0.009, 1.78]} yaw={-0.28} texture={photo1} crop={[119, 66, 907, 1214]} />
    <Snapshot at={[1.08, 0.027, 1.84]} yaw={0.16} texture={photo2} crop={[104, 85, 935, 1189]} />
    <FilmStrip printedFrame={film} at={[1.72, 0.0015, 1.62]} yaw={-0.70} />
  </group></Reflections.Provider>;
}
