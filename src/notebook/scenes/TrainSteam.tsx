import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

export function TrainSteam({active,reduced}:{active:boolean;reduced:boolean}){
  const root=useRef<THREE.Group>(null);
  const puffs=useRef<THREE.Mesh[]>([]),elapsed=useRef(0);
  const inverse=useMemo(()=>new THREE.Quaternion(),[]);
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,0,64,64,64);
    // A hollow center and soft rim keep each expanding puff readable as a smoke ring.
    gradient.addColorStop(0,'#ffffff00');gradient.addColorStop(.4,'#ffffff00');
    gradient.addColorStop(.54,'#ffffffb8');gradient.addColorStop(.64,'#ffffffed');
    gradient.addColorStop(.76,'#ffffff68');gradient.addColorStop(.9,'#ffffff00');
    gradient.addColorStop(1,'#ffffff00');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame(({camera},dt)=>{
    if(!active||!root.current)return;
    if(!reduced)elapsed.current+=Math.min(dt,.1);
    const time=reduced?0:elapsed.current;
    root.current.getWorldQuaternion(inverse).invert();
    puffs.current.forEach((puff,i)=>{
      const life=(time*.22+i/6)%1;
      puff.position.set(life*.3+Math.sin(time*.7+i)*.06*life,.025+life*1.9,-life*.08);
      const width=.18+life*1.05;puff.scale.set(width,width*.65,1);
      puff.quaternion.copy(inverse).multiply(camera.quaternion);
      (puff.material as THREE.MeshBasicMaterial).opacity=Math.min(1,life/.06)*(1-life)**.8*.85;
    });
  });
  // Blender's funnel opening is (-1.98, 1.925, 0) in train-local coordinates.
  return <group ref={root} position={[-1.98,1.94,0]} visible={active}>
    {Array.from({length:6},(_,i)=><mesh key={i} ref={node=>{if(node)puffs.current[i]=node;}} raycast={()=>null}>
      <planeGeometry args={[1,1]}/><meshBasicMaterial map={texture} color="#f1eee4" transparent opacity={0} depthWrite={false} toneMapped={false}/>
    </mesh>)}
  </group>;
}
