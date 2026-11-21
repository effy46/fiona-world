import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';
import {PAGE_FONTS,COVER_TYPE} from './typography';
import {NOTEBOOK_SCALE} from './layout';

export type EntryPhase = 'closed' | 'opening' | 'open';
const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t*t*(3-2*t); };

export function NotebookEntry({ flap, leather, phase, reduced, canOpen, popup, onOpen, onOpened }: {
  flap: THREE.Group; leather: THREE.MeshStandardMaterial; phase: EntryPhase;
  reduced: boolean; canOpen: boolean; popup: MutableRefObject<number>;
  onOpen: () => void; onOpened: () => void;
}) {
  const { invalidate } = useThree();
  const strap = useRef<THREE.Group>(null!);
  const tip = useRef<THREE.Group>(null!);
  const elapsed = useRef(0);
  const finished = useRef(false);
  const materials = useMemo(() => {
    const hide = leather.clone();
    const canvas = document.createElement('canvas');canvas.width=1536;canvas.height=2048;
    const ctx=canvas.getContext('2d')!;
    ctx.scale(2,2);
    ctx.textAlign='center';ctx.fillStyle=COVER_TYPE.ink;
    ctx.font=`${COVER_TYPE.eyebrow/NOTEBOOK_SCALE}px ${PAGE_FONTS.hand.family}`;ctx.fillText('FIONA FENG',384,185);
    ctx.strokeStyle=COVER_TYPE.ink;
    ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(180,565);ctx.lineTo(588,565);ctx.stroke();
    ctx.font=`${COVER_TYPE.subtitle/NOTEBOOK_SCALE}px ${PAGE_FONTS.hand.family}`;ctx.fillText('A traveler’s notebook',384,640);
    ctx.font=`${COVER_TYPE.footer/NOTEBOOK_SCALE}px ${PAGE_FONTS.hand.family}`;ctx.fillText('FIELD NOTES · NO. 01',384,850);
    const title = new THREE.CanvasTexture(canvas);title.colorSpace=THREE.SRGBColorSpace;title.anisotropy=8;
    return {hide,title};
  }, [leather]);
  useEffect(()=>()=>{materials.hide.dispose();materials.title.dispose();},[materials]);
  useEffect(()=>{invalidate();},[phase,reduced,canOpen,invalidate]);
  useFrame((_,dt)=>{
    if(phase==='closed') {
      flap.rotation.z=-Math.PI;popup.current=0;
      strap.current.rotation.z=0;tip.current.rotation.z=0;
      return;
    }
    if(phase==='open')return;
    if(finished.current)return;
    elapsed.current+=Math.min(dt,.1);
    const t=reduced?3.2:elapsed.current;
    const unlatch=ease(t/.65);
    tip.current.rotation.z=-Math.PI/2*unlatch;
    strap.current.rotation.z=-Math.PI/2*unlatch;
    flap.rotation.z=-Math.PI*(1-ease((t-.65)/1.9));
    popup.current=ease((t-1.5)/1.65);
    if(t>=3.15) {
      flap.rotation.z=0;popup.current=1;finished.current=true;onOpened();
    } else invalidate();
  });
  return <>
    {/* One portal per flap: R3F uses the target UUID as the portal key. */}
    {createPortal(<><mesh visible={phase!=='open'} position={[-1.7,-.465,0]} rotation={[Math.PI/2,0,Math.PI]}>
      <planeGeometry args={[2.35,3.35]}/>
      <meshStandardMaterial map={materials.title} transparent depthWrite={false} roughness={.95}/>
    </mesh>
    <group visible={phase!=='open'} position={[-1.7,-.468,0]} rotation={[Math.PI/2,0,Math.PI]}>
      <Suspense fallback={null}>
        <Text position={[-.18,.28,.002]} font={PAGE_FONTS.serif.src} fontSize={COVER_TYPE.title/NOTEBOOK_SCALE}
          lineHeight={1.08} textAlign="center" anchorX="center" anchorY="middle"
          color={COVER_TYPE.ink} outlineWidth={COVER_TYPE.outline/NOTEBOOK_SCALE} outlineColor={COVER_TYPE.ink} sdfGlyphSize={128}
          depthOffset={-4} onSync={()=>invalidate()} material-toneMapped={false}>
          {'Fiona’s\nlittle world.'}
        </Text>
      </Suspense>
    </group></>,flap)}
    <group ref={strap} position={[3.4,.065,0]}>
      <mesh material={materials.hide} castShadow receiveShadow position={[0,.43,0]}>
        <boxGeometry args={[.045,.86,.38]}/>
      </mesh>
      <group ref={tip} position={[0,.86,0]}>
        <mesh material={materials.hide} castShadow receiveShadow position={[-.39,0,0]}>
          <boxGeometry args={[.78,.035,.38]}/>
        </mesh>
        <mesh position={[-.64,.035,0]} castShadow>
          <cylinderGeometry args={[.105,.105,.035,40]}/>
          <meshStandardMaterial color="#b18a4d" metalness={.65} roughness={.48}/>
        </mesh>
        <mesh position={[-.64,.056,0]}>
          <cylinderGeometry args={[.065,.065,.008,40]}/>
          <meshStandardMaterial color="#ad8c55" metalness={.4} roughness={.7}/>
        </mesh>
        {phase==='closed'&&<Html center position={[-.64,.08,0]} zIndexRange={[2,1]}>
          <button className="study-clasp" aria-label="Open notebook" disabled={!canOpen}
            onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onOpen();}}>
            <span className="study-screenreader">Open notebook</span>
            <span className="study-clasp-hint" aria-hidden="true">Click to open</span>
          </button>
        </Html>}
      </group>
    </group>
  </>;
}
