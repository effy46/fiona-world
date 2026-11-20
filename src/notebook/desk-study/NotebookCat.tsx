import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';
import {planCampRoute,type CampPoint} from './campNavigation';
import {NOTEBOOK_SCALE,NOTEBOOK_CAT_SIZE} from './layout';
import {catTurnDuration,catTurnPose,catWalkFrame,catSettleFrame,CAT_SETTLE_SECONDS} from '../catMotion';
import {useCatAtlas,setCatAtlasPose} from '../useCatAtlas';

export type CatPhase = 'idle' | 'turn' | 'walk' | 'settle';
type Journey = {started:number|null;path:THREE.Vector3[];length:number;duration:number;mirrored:boolean;fromMirrored:boolean;fromFront:boolean};
const home = new THREE.Vector3(.78, .465, .61);
const clearing:CampPoint = [.76,.37];

export function NotebookCat({ visible, reduced, request, destination, origin, onPhase, onRequest }: {
  visible:boolean;reduced:boolean;request:number;destination:CampPoint|null;origin:CampPoint;
  onPhase:(phase:CatPhase)=>void;onRequest:()=>void;
}) {
  const texture=useCatAtlas(8);
  const {invalidate,size}=useThree();
  const root=useRef<THREE.Group>(null!);
  const marker=useRef<THREE.Mesh>(null!);
  const journey=useRef<Journey|null>(null);
  const turnedOnce=useRef(false),facing=useRef(false),consumed=useRef(0);
  const phase=useRef<CatPhase>('idle');
  const button=useRef<HTMLButtonElement>(null);
  function pose(frame:number,mirrored=false){
    setCatAtlasPose(texture,frame,mirrored);
  }
  function report(next:CatPhase){
    if(phase.current===next)return;phase.current=next;
    if(button.current)button.current.disabled=next!=='idle';onPhase(next);
  }
  useEffect(()=>{
    if(!visible){
      journey.current=null;turnedOnce.current=false;facing.current=false;
      root.current.position.copy(home);marker.current.visible=false;pose(0);report('idle');return;
    }
    if(reduced&&journey.current){
      const current=journey.current;root.current.position.copy(current.path[current.path.length-1]);
      facing.current=current.mirrored;turnedOnce.current=true;pose(15,current.mirrored);
      journey.current=null;marker.current.visible=false;report('idle');invalidate();
    }
    if(request===consumed.current)return;consumed.current=request;
    const from=root.current.position;
    const nearClearing=Math.hypot(from.x-clearing[0],from.z-clearing[1])<.06;
    const goal=destination??(nearClearing?[home.x,home.z]:clearing);
    const path=planCampRoute([from.x,from.z],goal,origin).map(([x,z])=>new THREE.Vector3(x,home.y,z));
    const target=path[path.length-1];let length=0;
    for(let i=1;i<path.length;i++)length+=path[i-1].distanceTo(path[i]);
    if(length<.025){journey.current=null;marker.current.visible=false;pose(15,facing.current);turnedOnce.current=true;report('idle');invalidate();return;}
    const mirrored=Math.abs(target.x-from.x)>.03?target.x>from.x:facing.current;
    marker.current.position.set(target.x,home.y+.01,target.z);marker.current.visible=!reduced;
    if(reduced){
      from.copy(target);facing.current=mirrored;turnedOnce.current=true;pose(15,mirrored);report('idle');
    }else{
      journey.current={started:null,path,length,duration:Math.max(.88,length/.65),mirrored,fromMirrored:facing.current,fromFront:!turnedOnce.current};
      report('turn');
    }
    invalidate();
  },[visible,reduced,request,destination,origin,texture,invalidate]);

  useFrame(({clock})=>{
    if(!visible)return;
    const current=journey.current;
    if(current){
      if(current.started===null)current.started=clock.elapsedTime;
      const elapsed=clock.elapsedTime-current.started;
      const turnDuration=catTurnDuration(current.fromFront,current.fromMirrored,current.mirrored);
      if(elapsed<turnDuration){
        const next=catTurnPose(elapsed,current.fromFront,current.fromMirrored,current.mirrored);
        pose(next.frame,next.mirrored);
      }else{
        const travel=elapsed-turnDuration;
        const walking=Math.min(1,travel/current.duration),settling=Math.max(0,Math.min(1,(travel-current.duration)/CAT_SETTLE_SECONDS));
        const mainTravel=current.duration/(current.duration+.28);
        let distance=current.length*(mainTravel*walking+(1-mainTravel)*(1-(1-settling)**2));
        for(let i=1;i<current.path.length;i++){
          const a=current.path[i-1],b=current.path[i],length=a.distanceTo(b);
          if(distance<=length||i===current.path.length-1){root.current.position.lerpVectors(a,b,Math.min(1,distance/length));break;}
          distance-=length;
        }
        facing.current=current.mirrored;turnedOnce.current=true;
        if(travel<current.duration){report('walk');pose(catWalkFrame(travel),current.mirrored);}
        else {report('settle');pose(catSettleFrame(travel-current.duration),current.mirrored);}
        if(travel>=current.duration+CAT_SETTLE_SECONDS){
          root.current.position.copy(current.path[current.path.length-1]);journey.current=null;marker.current.visible=false;report('idle');
        }
      }
      invalidate();
    }
    if(button.current){button.current.dataset.x=root.current.position.x.toFixed(3);button.current.dataset.z=root.current.position.z.toFixed(3);}
  });
  return <>
    <mesh ref={marker} visible={false} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.07,.09,32]}/><meshBasicMaterial color="#eee3bd" transparent opacity={.7} depthWrite={false}/>
    </mesh>
    <group ref={root} visible={visible} position={[home.x,home.y,home.z]}>
      <mesh rotation={[-Math.PI/2,0,0]} position={[0,.004,0]}><circleGeometry args={[.13,32]}/><meshBasicMaterial color="#463f30" transparent opacity={.14} depthWrite={false}/></mesh>
      <Billboard lockX lockZ>
        <mesh position={[0,NOTEBOOK_CAT_SIZE*(362/384-.5),0]}><planeGeometry args={[NOTEBOOK_CAT_SIZE,NOTEBOOK_CAT_SIZE]}/><meshBasicMaterial map={texture} transparent alphaTest={.08} toneMapped={false} side={THREE.DoubleSide} depthWrite={false}/></mesh>
        {visible&&<Html center position={[0,.34,0]} distanceFactor={size.height*.008*NOTEBOOK_SCALE} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
          <button ref={button} className="study-cat-target" aria-label="Walk with the cat" title="Walk with the cat"
            onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();if(phase.current==='idle')onRequest();}}>
            <span className="study-screenreader">Walk with the cat</span>
          </button>
        </Html>}
      </Billboard>
    </group>
  </>;
}
