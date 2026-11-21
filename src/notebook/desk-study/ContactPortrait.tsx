import {useEffect,useMemo} from 'react';
import {Billboard,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {publicAsset} from '../../lib/publicAsset';

export function ContactPortrait(){
  const source=useTexture(publicAsset('/character-portrait.png'));
  const texture=useMemo(()=>{
    const map=source.clone();
    // Frame the opaque figure, excluding the source's large transparent margins.
    map.repeat.set(298/1024,1082/1536);
    map.offset.set(358/1024,245/1536);
    map.colorSpace=THREE.SRGBColorSpace;
    map.anisotropy=8;map.needsUpdate=true;
    return map;
  },[source]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  return <group position={[2.3,.47,-.64]}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.002,0]} raycast={()=>null}>
      <circleGeometry args={[.23,40]}/><meshBasicMaterial color="#463f30" transparent opacity={.14} depthWrite={false}/>
    </mesh>
    <Billboard><mesh position={[0,.75,0]} raycast={()=>null}>
      <planeGeometry args={[1.5*298/1082,1.5]}/>
      {/* Solid cutout writes depth before translucent desk props; alpha only trims its silhouette. */}
      <meshBasicMaterial map={texture} alphaTest={.25} depthWrite toneMapped={false} side={THREE.DoubleSide}/>
    </mesh></Billboard>
  </group>;
}
