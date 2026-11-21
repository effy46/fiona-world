import { publicAsset } from '../../lib/publicAsset';
import {Suspense,useEffect,useRef,type ReactNode} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Html,Text,useGLTF,useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {DesertPaper,DesertScene,type Journey} from '../scenes/DesertScene';
import {StationPaper,StationScene,type PostState} from '../scenes/StationScene';
import {publicLinks,isPendingHref} from '../../content/publicLinks';
import type {Spread} from './paper';
import {NOTEBOOK_CAT_SIZE,TRAVEL_INSERT_SCALE} from './layout';
import {contactLinks,contactLinkBox} from './pageLayout';

export type TravelActions={
  journey:Journey;post:PostState;
  startDesert:()=>void;setJourney:(phase:Journey)=>void;
  startPost:()=>void;delivered:()=>void;
  cancelPost:()=>void;
};
// Start after the desk is ready, while the cover/opening sequence gives these assets time to load.
export function ChapterPreload(){
  useEffect(()=>{
    useTexture.preload([publicAsset('/slow-post/autumn-maple.png'),publicAsset('/slow-post/forest-backdrop.png')]);
    useTexture.preload(publicAsset('/slow-post/sign-painted-oak.png'));
    useGLTF.preload(publicAsset('/slow-post/models/train-papercraft.glb'));
    useGLTF.preload(publicAsset('/slow-post/models/platform-papercraft.glb'));
  },[]);
  return <Suspense fallback={null}><Text visible={false} raycast={()=>null} font={publicAsset('/fonts/Caveat-Medium.ttf')}>Desert Detour Slow Post Station</Text></Suspense>;
}
export function ChapterInsert({spread,travel,reduced,turning}:{spread:Spread;travel:TravelActions;reduced:boolean;turning:boolean}){
  const {invalidate}=useThree();const root=useRef<THREE.Group>(null!);const fold=useRef(0);
  const busy=travel.post==='posting'||travel.journey==='walking'||travel.journey==='rising';
  useEffect(()=>{invalidate();},[busy,invalidate]);
  useFrame((_,dt)=>{
    const target=turning?0:1;fold.current=reduced?target:THREE.MathUtils.damp(fold.current,target,18,dt);
    root.current.scale.y=fold.current;root.current.position.y=.43*(1-fold.current);root.current.visible=fold.current>.02;
    if(Math.abs(fold.current-target)>.001||(!turning&&busy))invalidate();
  });
  return <group ref={root}>
    <group position={[-1.60,.415,-.25]} scale={TRAVEL_INSERT_SCALE}>
      {spread==='making'?<DesertPaper><DesertScene catSize={NOTEBOOK_CAT_SIZE/TRAVEL_INSERT_SCALE} paused={turning} journey={travel.journey} reducedMotion={reduced} onPhase={travel.setJourney} onStart={travel.startDesert}/></DesertPaper>
        :<StationPaper><StationScene catSize={NOTEBOOK_CAT_SIZE/TRAVEL_INSERT_SCALE} paused={turning} state={travel.post} reducedMotion={reduced} onPost={travel.startPost} onCancelPost={travel.cancelPost} onDelivered={travel.delivered}/>
          {!turning&&travel.post==='ready'&&<Html center position={[2.1,1.14,-.31]} zIndexRange={[2,1]}>
            <button className="study-clasp study-postbox-hint" aria-label="Post a letter" onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();travel.startPost();}}>
              <span className="study-clasp-hint" aria-hidden="true">Click to post</span>
            </button>
          </Html>}
        </StationPaper>}
    </group>
  </group>;
}

function PaperTarget({x,y,w,h,side='right',children}:{x:number;y:number;w:number;h:number;side?:'left'|'right';children:ReactNode}){
  return <Html transform center rotation={[-Math.PI/2,0,0]} position={[(side==='left'?-3.18:.012)+x/1024*3.168,.46,y/1536*4.58-2.29]} distanceFactor={3.168/1024*400} zIndexRange={[1,0]}>
    <div className="study-paper-target" style={{width:w,height:h}} onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}>{children}</div>
  </Html>;
}
// Button hotspots avoid the browser's URL preview over the paper scene.
function openPaperDestination(href:string){
  if(href.startsWith('mailto:'))window.location.href=href;
  else window.open(href,'_blank','noopener,noreferrer');
}
export function PageLinks({spread,travel,onSelect,onPreviewImage}:{spread:Spread;travel:TravelActions;onSelect:(spread:Spread)=>void;onPreviewImage:()=>void}){
  if(spread==='making')return <PaperTarget x={510} y={1350} w={800} h={104}><button aria-label="Open process notes" onClick={()=>onSelect('making-notes')}/></PaperTarget>;
  if(spread==='projects')return <>
    <PaperTarget side="left" x={512} y={730} w={816} h={510}><button onClick={onPreviewImage} aria-label="Enlarge PawPal image" aria-haspopup="dialog" style={{cursor:'zoom-in'}}/></PaperTarget>
    {!isPendingHref(publicLinks.pawPalHref)&&<PaperTarget side="left" x={512} y={1365} w={816} h={120}><button onClick={()=>openPaperDestination(publicLinks.pawPalHref)} aria-label="Open PawPal project"/></PaperTarget>}
  </>;
  if(spread!=='contact')return null;

  return <>
    <PaperTarget x={320} y={535} w={430} h={110}><button aria-label="Collect station postmark" disabled={travel.post!=='ready'} onClick={travel.startPost}/></PaperTarget>
    {contactLinks.filter(({href})=>!isPendingHref(href)).map(({ariaLabel,href,y})=><PaperTarget key={ariaLabel} x={contactLinkBox.x+contactLinkBox.width/2} y={y+contactLinkBox.targetOffsetY} w={contactLinkBox.width} h={contactLinkBox.height}><button onClick={()=>openPaperDestination(href)} aria-label={ariaLabel}/></PaperTarget>)}
  </>;
}
