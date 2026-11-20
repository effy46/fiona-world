import {useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

export function TrainSteam({active,reduced}:{active:boolean;reduced:boolean}){
  const root=useRef<THREE.Group>(null);
  const puffs=useRef<THREE.Mesh[]>([]),elapsed=useRef(0);
  const inverse=useMemo(()=>new THREE.Quaternion(),[]);
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
    const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(48,48,0,48,48,48);
    gradient.addColorStop(0,'#ffffffed');gradient.addColorStop(.35,'#ffffffbd');
    gradient.addColorStop(.7,'#ffffff38');gradient.addColorStop(1,'#ffffff00');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
  },[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame(({camera},dt)=>{
    if(!active||!root.current)return;
    if(!reduced)elapsed.current+=Math.min(dt,.1);
    const time=reduced?0:elapsed.current;
    root.current.getWorldQuaternion(inverse).invert();
    puffs.current.forEach((puff,i)=>{
      const life=(time*.18+i/9)%1;
      puff.position.set(life*.42+Math.sin(time*.7+i)*.10*life,.04+life*1.65,-life*.08);
      const width=.24+life*.66;puff.scale.set(width,width*(1.12+.12*Math.sin(i)),1);
      puff.quaternion.copy(inverse).multiply(camera.quaternion);
      (puff.material as THREE.MeshBasicMaterial).opacity=Math.sin(life*Math.PI)**1.1*.46;
    });
  });
  // Blender's funnel opening is (-1.98, 1.925, 0) in train-local coordinates.
  return <group ref={root} position={[-1.98,1.94,0]} visible={active}>
    {Array.from({length:9},(_,i)=><mesh key={i} ref={node=>{if(node)puffs.current[i]=node;}} raycast={()=>null}>
      <planeGeometry args={[1,1]}/><meshBasicMaterial map={texture} color="#dedbd2" transparent opacity={0} depthWrite={false} toneMapped={false}/>
    </mesh>)}
  </group>;
}
