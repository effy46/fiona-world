import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Billboard,Html,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {publicAsset} from '../../lib/publicAsset';
import {planCampRoute,type CampPoint} from './campNavigation';
import {NOTEBOOK_SCALE,NOTEBOOK_CAT_SIZE} from './layout';
import {catTurnDuration,catTurnPose,catWalkFrame,catSettleFrame,CAT_SETTLE_SECONDS,CAT_REST_FRAME} from '../catMotion';
import {useCatAtlas,setCatAtlasPose} from '../useCatAtlas';

export type CatPhase='idle'|'turn'|'walk'|'settle'|'jump'|'sit'|'sleep';
type Journey={started:number|null;path:THREE.Vector3[];length:number;duration:number;mirrored:boolean;fromMirrored:boolean;fromFrame:number;toChair:boolean};
type Hop={started:number|null;from:THREE.Vector3;to:THREE.Vector3;up:boolean;goal:CampPoint|null};
const home=new THREE.Vector3(.78,.465,.61);
const clearing:CampPoint=[.76,.37];
const atRest=(phase:CatPhase)=>phase==='idle'||phase==='sit'||phase==='sleep';

export function NotebookCat({visible,reduced,request,destination,origin,chairSeat,chairRequest,onChairRequest,onPhase,onRequest}:{
  visible:boolean;reduced:boolean;request:number;destination:CampPoint|null;origin:CampPoint;
  chairSeat:THREE.Vector3;chairRequest:number;onChairRequest:()=>void;
  onPhase:(phase:CatPhase)=>void;onRequest:()=>void;
}){
  const texture=useCatAtlas(8);
  const source=useTexture(publicAsset('/desk-study/cat-motion/chair-poses-cream.png'));
  const restMaps=useMemo(()=>[[139,106,403,654],[1079,319,520,456]].map(([x,y,w,h])=>{
    const map=source.clone();map.colorSpace=THREE.SRGBColorSpace;
    map.repeat.set(w/1774,h/887);map.offset.set(x/1774,1-(y+h)/887);map.needsUpdate=true;
    return map;
  }),[source]);
  useEffect(()=>()=>restMaps.forEach(map=>map.dispose()),[restMaps]);
  const {invalidate,size}=useThree();
  const root=useRef<THREE.Group>(null!);
  const standing=useRef<THREE.Mesh>(null!),resting=useRef<THREE.Mesh>(null!);
  const marker=useRef<THREE.Mesh>(null!),shadow=useRef<THREE.Mesh>(null!);
  const journey=useRef<Journey|null>(null),hop=useRef<Hop|null>(null);
  const currentFrame=useRef(0),facing=useRef(false),consumed=useRef(0),consumedChair=useRef(0);
  const phase=useRef<CatPhase>('idle');
  const stance=useRef<'ground'|'sit'|'sleep'>('ground');
  const button=useRef<HTMLButtonElement>(null),chairButton=useRef<HTMLButtonElement>(null);
  const approach=useMemo(()=>new THREE.Vector3(chairSeat.x-.38,home.y,chairSeat.z-.22),[chairSeat]);
  function pose(frame:number,mirrored=false){currentFrame.current=frame;facing.current=mirrored;setCatAtlasPose(texture,frame,mirrored);}
  function report(next:CatPhase){
    if(phase.current===next)return;
    phase.current=next;if(button.current)button.current.disabled=!atRest(next);onPhase(next);
  }
  function rest(next:'ground'|'sit'|'sleep'){
    stance.current=next;
    if(button.current)button.current.style.pointerEvents=next==='ground'?'auto':'none';
    standing.current.visible=next==='ground';resting.current.visible=next!=='ground';
    if(next!=='ground'){
      const asleep=next==='sleep';
      (resting.current.material as THREE.MeshBasicMaterial).map=restMaps[asleep?1:0];
      // Match head size to the walking atlas; posture changes the silhouette's height.
      const height=NOTEBOOK_CAT_SIZE*(asleep?.62:.905),width=height*(asleep?520/456:403/654);
      resting.current.scale.set(width,height,1);
      // Seated hind paws project beyond the seat: anchor the rump, not the toes.
      resting.current.position.y=height*(asleep?.5:.4);
    }
  }
  function startHop(up:boolean,goal:CampPoint|null=null){
    journey.current=null;marker.current.visible=false;
    hop.current={started:null,from:root.current.position.clone(),to:(up?chairSeat:approach).clone(),up,goal};
    rest('ground');pose(CAT_REST_FRAME,true);report('jump');invalidate();
  }
  function startWalk(goal:CampPoint,toChair:boolean){
    rest('ground');const from=root.current.position;
    const path=planCampRoute([from.x,from.z],goal,origin).map(([x,z])=>new THREE.Vector3(x,home.y,z));
    let length=0;for(let i=1;i<path.length;i++)length+=path[i-1].distanceTo(path[i]);
    const target=path[path.length-1],mirrored=Math.abs(target.x-from.x)>.03?target.x>from.x:facing.current;
    if(reduced||length<.025){
      from.copy(target);pose(CAT_REST_FRAME,mirrored);journey.current=null;marker.current.visible=false;
      if(toChair){if(reduced){from.copy(chairSeat);rest('sit');report('sit');}else startHop(true);}
      else report('idle');
      invalidate();return;
    }
    marker.current.position.set(target.x,home.y+.01,target.z);marker.current.visible=!toChair;
    journey.current={started:null,path,length,duration:Math.max(.88,length/.65),mirrored,fromMirrored:facing.current,fromFrame:currentFrame.current,toChair};
    report('turn');invalidate();
  }
  function finishHop(){
    const current=hop.current;if(!current)return;
    root.current.position.copy(current.to);hop.current=null;
    if(current.up){rest('sit');report('sit');}
    else{rest('ground');startWalk(current.goal??clearing,false);}
  }
  useEffect(()=>{
    if(!visible){
      journey.current=null;hop.current=null;consumed.current=request;consumedChair.current=chairRequest;
      root.current.position.copy(home);marker.current.visible=false;rest('ground');pose(0);report('idle');return;
    }
    if(stance.current!=='ground'&&!hop.current&&!journey.current){root.current.position.copy(chairSeat);rest(stance.current);}
    if(reduced){
      if(hop.current)finishHop();
      const current=journey.current;
      if(current){journey.current=null;root.current.position.copy(current.path[current.path.length-1]);marker.current.visible=false;pose(CAT_REST_FRAME,current.mirrored);
        if(current.toChair){root.current.position.copy(chairSeat);rest('sit');report('sit');}else report('idle');}
    }
    if(chairRequest!==consumedChair.current){
      consumedChair.current=chairRequest;
      if(hop.current)return;
      if(stance.current!=='ground'){const next=stance.current==='sit'?'sleep':'sit';rest(next);report(next);}
      else startWalk([approach.x,approach.z],true);
      invalidate();return;
    }
    if(request===consumed.current){invalidate();return;}consumed.current=request;
    const from=root.current.position;
    const nearClearing=Math.hypot(from.x-clearing[0],from.z-clearing[1])<.06;
    const goal:CampPoint=destination??(nearClearing?[home.x,home.z]:clearing);
    if(stance.current!=='ground'||hop.current){
      if(reduced){hop.current=null;from.copy(approach);startWalk(goal,false);}else startHop(false,goal);
    }else startWalk(goal,false);
    invalidate();
  },[visible,reduced,request,destination,origin,chairRequest,chairSeat,approach,texture,restMaps,invalidate]);

  useFrame(({clock})=>{
    if(!visible)return;
    const jump=hop.current;
    if(jump){
      if(jump.started===null)jump.started=clock.elapsedTime;
      const t=Math.min(1,(clock.elapsedTime-jump.started)/.55),eased=t*t*(3-2*t);
      root.current.position.lerpVectors(jump.from,jump.to,eased);root.current.position.y+=Math.sin(t*Math.PI)*.18;
      if(t===1)finishHop();invalidate();
    }else{
      const current=journey.current;
      if(current){
        if(current.started===null)current.started=clock.elapsedTime;
        const elapsed=clock.elapsedTime-current.started,turnDuration=catTurnDuration(current.fromFrame,current.fromMirrored,current.mirrored);
        if(elapsed<turnDuration){const next=catTurnPose(elapsed,current.fromFrame,current.fromMirrored,current.mirrored);pose(next.frame,next.mirrored);}
        else{
          const travel=elapsed-turnDuration,walking=Math.min(1,travel/current.duration),settling=Math.max(0,Math.min(1,(travel-current.duration)/CAT_SETTLE_SECONDS));
          const mainTravel=current.duration/(current.duration+.28);
          let distance=current.length*(mainTravel*walking+(1-mainTravel)*(1-(1-settling)**2));
          for(let i=1;i<current.path.length;i++){
            const a=current.path[i-1],b=current.path[i],length=a.distanceTo(b);
            if(distance<=length||i===current.path.length-1){root.current.position.lerpVectors(a,b,Math.min(1,distance/length));break;}distance-=length;
          }
          if(travel<current.duration){report('walk');pose(catWalkFrame(travel),current.mirrored);}
          else{report('settle');pose(catSettleFrame(travel-current.duration),current.mirrored);}
          if(travel>=current.duration+CAT_SETTLE_SECONDS){
            root.current.position.copy(current.path[current.path.length-1]);journey.current=null;marker.current.visible=false;
            if(current.toChair)startHop(true);else report('idle');
          }
        }
        invalidate();
      }
    }
    shadow.current.visible=!hop.current;
    if(button.current){button.current.dataset.x=root.current.position.x.toFixed(3);button.current.dataset.z=root.current.position.z.toFixed(3);button.current.dataset.y=root.current.position.y.toFixed(4);button.current.dataset.pose=stance.current;}
    if(chairButton.current){chairButton.current.disabled=Boolean(hop.current);chairButton.current.dataset.pose=stance.current;}
  });
  return <>
    <mesh ref={marker} visible={false} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[.07,.09,32]}/><meshBasicMaterial color="#eee3bd" transparent opacity={.7} depthWrite={false}/>
    </mesh>
    {visible&&<Html center position={[chairSeat.x,chairSeat.y+.12,chairSeat.z]} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
      <button ref={chairButton} className="study-clasp study-chair-hint" aria-label="Rest by the fire" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onChairRequest();}}>
        <span className="study-clasp-hint" aria-hidden="true" hidden={!atRest(phase.current)}>{phase.current==='sit'?'Click to nap':phase.current==='sleep'?'Click to wake':'Click to rest'}</span>
      </button>
    </Html>}
    <group ref={root} visible={visible} position={[home.x,home.y,home.z]}>
      <mesh ref={shadow} rotation={[-Math.PI/2,0,0]} position={[0,.004,0]} raycast={()=>null}><circleGeometry args={[.13,32]}/><meshBasicMaterial color="#463f30" transparent opacity={.14} depthWrite={false}/></mesh>
      <Billboard>
        <mesh ref={standing} position={[0,NOTEBOOK_CAT_SIZE*(362/384-.5),0]}><planeGeometry args={[NOTEBOOK_CAT_SIZE,NOTEBOOK_CAT_SIZE]}/><meshBasicMaterial map={texture} transparent alphaTest={.08} toneMapped={false} side={THREE.DoubleSide} depthWrite={false}/></mesh>
        {/* Camera-facing artwork stays in front of its physical chair backrest. */}
        <mesh ref={resting} visible={false} renderOrder={4} raycast={()=>null}><planeGeometry args={[1,1]}/><meshBasicMaterial map={restMaps[0]} transparent alphaTest={.12} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} depthTest={false}/></mesh>
        {visible&&<Html center position={[0,.34,0]} distanceFactor={size.height*.008*NOTEBOOK_SCALE} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
          <button ref={button} className="study-cat-target" aria-label="Walk with the cat" onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();if(atRest(phase.current))onRequest();}}>
            <span className="study-screenreader">Walk with the cat</span>
          </button>
        </Html>}
      </Billboard>
    </group>
  </>;
}
