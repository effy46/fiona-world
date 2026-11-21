import {useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame} from '@react-three/fiber';
import {Billboard,Html} from '@react-three/drei';
import * as THREE from 'three';
import type {TravelPose} from './useTravelWalk';
import {useCatAtlas,setCatAtlasPose} from '../useCatAtlas';

export function TravelCat({pose,label,onWalk,interactive=true,size=1.35,uprightDepth=false}:{
  pose:MutableRefObject<TravelPose>;label:string;onWalk:()=>void;interactive?:boolean;size?:number;uprightDepth?:boolean;
}) {
  const button=useRef<HTMLButtonElement>(null);
  const sprite=useRef<THREE.Mesh>(null);
  const depth=useMemo(()=>({origin:{value:new THREE.Vector3()},scale:{value:1},foot:{value:0},worldScale:new THREE.Vector3()}),[]);
  const map=useCatAtlas();
  useFrame(()=>{
    const current=pose.current;
    setCatAtlasPose(map,current.frame,current.mirrored);
    if(uprightDepth&&sprite.current){
      sprite.current.parent!.getWorldPosition(depth.origin.value);
      sprite.current.getWorldScale(depth.worldScale);depth.scale.value=depth.worldScale.y;
      depth.foot.value=size*(362/384-.5);
    }
    if(button.current){button.current.dataset.x=current.x.toFixed(3);button.current.dataset.z=current.z.toFixed(3);button.current.dataset.moving=String(current.moving);button.current.disabled=current.moving;}
  });
  return <Billboard><mesh ref={sprite} position={[0,size*(362/384-.5),0]}>
    <planeGeometry args={[size,size]}/><meshBasicMaterial map={map} transparent alphaTest={.08} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
      customProgramCacheKey={()=>uprightDepth?'cat-upright-depth':'cat-billboard-depth'}
      onBeforeCompile={shader=>{
        if(!uprightDepth)return;
        shader.uniforms.catDepthOrigin=depth.origin;shader.uniforms.catDepthScale=depth.scale;shader.uniforms.catDepthFoot=depth.foot;
        shader.vertexShader='uniform vec3 catDepthOrigin;\nuniform float catDepthScale;\nuniform float catDepthFoot;\n'+shader.vertexShader;
        // Keep the artwork facing the reader, but test occlusion at each body part's upright height.
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec3 uprightPoint = catDepthOrigin + vec3(0.0, (position.y + catDepthFoot) * catDepthScale, 0.0);
          vec4 uprightClip = projectionMatrix * viewMatrix * vec4(uprightPoint, 1.0);
          gl_Position.z = (uprightClip.z / uprightClip.w) * gl_Position.w;
        `);
      }}/>
  </mesh>{interactive&&<Html center position={[0,size*.6/1.35,0]} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
    <button ref={button} className="study-cat-target" aria-label={label} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onWalk();}}/>
  </Html>}</Billboard>;
}
