import {useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard,Html} from '@react-three/drei';
import * as THREE from 'three';
import type {TravelPose} from './useTravelWalk';
import {useCatAtlas,setCatAtlasPose} from '../useCatAtlas';

export function TravelCat({pose,label,onWalk,interactive=true,size=1.35}:{
  pose:MutableRefObject<TravelPose>;label:string;onWalk:()=>void;interactive?:boolean;size?:number;
}) {
  const button=useRef<HTMLButtonElement>(null);
  const map=useCatAtlas();
  useFrame(()=>{
    const current=pose.current;
    setCatAtlasPose(map,current.frame,current.mirrored);
    if(button.current){button.current.dataset.x=current.x.toFixed(3);button.current.dataset.z=current.z.toFixed(3);button.current.dataset.moving=String(current.moving);button.current.disabled=current.moving;}
  });
  return <Billboard lockX lockZ><mesh position={[0,size*(362/384-.5),0]}>
    <planeGeometry args={[size,size]}/><meshBasicMaterial map={map} transparent alphaTest={.08} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/>
  </mesh>{interactive&&<Html center position={[0,size*.6/1.35,0]} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
    <button ref={button} className="study-cat-target" aria-label={label} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onWalk();}}/>
  </Html>}</Billboard>;
}
