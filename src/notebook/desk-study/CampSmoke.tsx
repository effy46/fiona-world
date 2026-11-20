import {useEffect,useMemo} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard} from '@react-three/drei';
import * as THREE from 'three';

// Layered, tapered paper-world wisps. Real geometry keeps their silhouette legible
// against the textured mountain without relying on a faint particle alpha map.
export function CampSmoke({visible,reduced}:{visible:boolean;reduced:boolean}) {
  const ribbons=useMemo(()=>Array.from({length:6},(_,i)=>({
    geometry:new THREE.PlaneGeometry(1,1,1,32),
    strand:Math.floor(i/3),layer:i%3,
  })),[]);
  useEffect(()=>()=>ribbons.forEach(ribbon=>ribbon.geometry.dispose()),[ribbons]);
  useFrame(({clock})=>{
    if(!visible)return;
    const time=reduced?0:clock.elapsedTime;
    ribbons.forEach(({geometry,strand,layer})=>{
      const positions=geometry.attributes.position as THREE.BufferAttribute;
      const height=strand===0?.56:.70;
      const spread=[2.6,1.55,1][layer];
      for(let row=0;row<=32;row++){
        const u=1-row/32;
        const x=.045*u+.032*u*Math.sin(u*10-time*.9+strand*2.5)+strand*.018;
        const width=.009*spread*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.8);
        positions.setXYZ(row*2,x-width,u*height,layer*.0003+strand*.0005);
        positions.setXYZ(row*2+1,x+width,u*height,layer*.0003+strand*.0005);
      }
      positions.needsUpdate=true;geometry.computeBoundingSphere();
    });
  });
  return <group visible={visible}><Billboard position={[1.49,.77,1.11]}>
    {ribbons.map(({geometry,layer},i)=><mesh key={i} geometry={geometry} renderOrder={layer+1}>
      <meshBasicMaterial color="#85847c" transparent opacity={(reduced?.45:1)*[.07,.17,.42][layer]}
        side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/>
    </mesh>)}
  </Billboard></group>;
}
