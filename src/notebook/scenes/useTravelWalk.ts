import {useRef,type RefObject} from 'react';
import {useFrame,useThree,type ThreeEvent} from '@react-three/fiber';
import * as THREE from 'three';
import {planTravelRoute,type TravelGround,type TravelPoint} from './travelNavigation';
import {catTurnDuration,catTurnPose,catWalkFrame,catSettleFrame,CAT_SETTLE_SECONDS,CAT_REST_FRAME} from '../catMotion';
import {pathLength,pointAtDistance} from '../pathMotion';
export type TravelPose={frame:number;mirrored:boolean;x:number;z:number;moving:boolean};
type Route={path:TravelPoint[];distance:number;length:number;elapsed:number;settling:number;turn:number;fromFrame:number;fromMirrored:boolean;mirrored:boolean;arrive?:()=>void};

export function useTravelWalk({enabled,root,cat,scene,height,reduced,onFreeWalk}:{enabled:boolean;root:RefObject<THREE.Group>;cat:RefObject<THREE.Group>;scene:TravelGround;height:(x:number,z:number)=>number;reduced:boolean;onFreeWalk:()=>void}){
  const {invalidate}=useThree();const route=useRef<Route|null>(null);
  const pose=useRef<TravelPose>({frame:0,mirrored:false,x:0,z:0,moving:false});
  function moveTo(goal:TravelPoint,arrive?:()=>void){
    if(!enabled||!cat.current)return;
    const from:TravelPoint=[cat.current.position.x,cat.current.position.z],path=planTravelRoute(scene,from,goal),end=path.at(-1)!;
    const length=pathLength(path);
    const mirrored=Math.abs(end[0]-from[0])>.03?end[0]>from[0]:pose.current.mirrored;
    if(reduced||length<.025){cat.current.position.set(end[0],height(...end),end[1]);route.current=null;pose.current={frame:CAT_REST_FRAME,mirrored,x:end[0],z:end[1],moving:false};arrive?.();}
    else{const fromFrame=pose.current.frame;route.current={path,distance:0,length,elapsed:0,settling:0,turn:catTurnDuration(fromFrame,pose.current.mirrored,mirrored),fromFrame,fromMirrored:pose.current.mirrored,mirrored,arrive};pose.current.moving=true;}
    invalidate();
  }
  useFrame((_,dt)=>{
    if(!enabled||!cat.current)return;
    const current=route.current,p=pose.current;
    if(current){
      current.elapsed+=Math.min(dt,.1);const t=current.elapsed;
      if(!reduced&&t<current.turn){Object.assign(p,catTurnPose(t,current.fromFrame,current.fromMirrored,current.mirrored));}
      else{
        current.distance=reduced?current.length:Math.min(current.length,current.distance+Math.min(dt,.1)*1.4);
        const [x,z]=pointAtDistance(current.path,current.distance);
        cat.current.position.set(x,height(x,z),z);
        p.mirrored=current.mirrored;p.frame=catWalkFrame(t-current.turn);
        if(current.distance>=current.length){
          current.settling+=Math.min(dt,.1);p.frame=catSettleFrame(current.settling);
          if(reduced||current.settling>=CAT_SETTLE_SECONDS){p.frame=CAT_REST_FRAME;p.moving=false;route.current=null;current.arrive?.();}
        }
      }
      invalidate();
    }
    p.x=cat.current.position.x;p.z=cat.current.position.z;
  });
  function onClick(event:ThreeEvent<MouseEvent>){
    if(!enabled||event.delta>4||!root.current)return;
    event.stopPropagation();onFreeWalk();const point=root.current.worldToLocal(event.point.clone());moveTo([point.x,point.z]);
  }
  return {pose,moveTo,onClick};
}
