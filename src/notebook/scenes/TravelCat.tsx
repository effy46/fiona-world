import {useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard,Html} from '@react-three/drei';
import * as THREE from 'three';
import type {TravelPose} from './useTravelWalk';
import {useCatAtlas,setCatAtlasPose} from '../useCatAtlas';

export function TravelCat({pose,label,onWalk,interactive=true,size=1.35,upright=false}:{
  pose:MutableRefObject<TravelPose>;label:string;onWalk:()=>void;interactive?:boolean;size?:number;upright?:boolean;
}) {
  const button=useRef<HTMLButtonElement>(null);
  const billboard=useRef<THREE.Group>(null);
  const cameraPosition=useMemo(()=>new THREE.Vector3(),[]);
  const map=useCatAtlas(upright?8:1);
  useFrame(({camera})=>{
    const current=pose.current;
    setCatAtlasPose(map,current.frame,current.mirrored);
    if(upright&&billboard.current){
      camera.getWorldPosition(cameraPosition);
      billboard.current.parent!.worldToLocal(cameraPosition);
      cameraPosition.sub(billboard.current.position);
      billboard.current.rotation.set(0,Math.atan2(cameraPosition.x,cameraPosition.z),0);
    }
    if(button.current){button.current.dataset.x=current.x.toFixed(3);button.current.dataset.z=current.z.toFixed(3);button.current.dataset.moving=String(current.moving);button.current.disabled=current.moving;}
  });
  // Station props have real height: keep the cat's visible plane and depth geometry upright.
  return <Billboard ref={billboard} follow={!upright}><mesh position={[0,size*(362/384-.5),0]}>
    <planeGeometry args={[size,size]}/><meshBasicMaterial map={map} transparent alphaTest={.08} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/>
  </mesh>{interactive&&<Html center position={[0,size*.6/1.35,0]} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
    <button ref={button} className="study-cat-target" aria-label={label} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onWalk();}}/>
  </Html>}</Billboard>;
}
