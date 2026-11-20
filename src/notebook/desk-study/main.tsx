import { publicAsset } from '../../lib/publicAsset';
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Environment, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { makePages, impressVisit, impressPostmark, spreads, chapters, chapterOf, type Pages, type Spread, type StampChapter } from './paper';
import { NotebookOpening } from '../NotebookOpening';
import { NotebookEntry, type EntryPhase } from './NotebookEntry';
import { CampSmoke } from './CampSmoke';
import {PageInk} from './PageInk';
import {makePageMaterial,applyPageArtwork} from './pageMaterial';
import {NOTEBOOK_SCALE} from './layout';
import {passportStamps} from './pageLayout';
import {WriterDeskProps} from '../WriterDeskProps';
import {ChapterInsert,ChapterPreload,PageLinks,type TravelActions} from './ChapterContent';
import type {Journey} from '../scenes/DesertScene';
import type {PostState} from '../scenes/StationScene';
import { NotebookCat, type CatPhase } from './NotebookCat';
import type {CampPoint} from './campNavigation';
import './study.css';

type View = 'desk' | 'read' | 'world';
type PageSide = 'left' | 'right';
type Turn = { from: Spread; to: Spread; id: number };

class StudyBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? (
      <div className="study-loading" role="alert">
        <h1>The notebook couldn’t open.</h1>
        <p>Try reloading, or return to Fiona’s world.</p>
        <button onClick={() => location.reload()}>Try again</button>
        <a href={import.meta.env.BASE_URL}>Fiona World</a>
      </div>
    ) : this.props.children;
  }
}

function CameraDirector({view,readSide,reduced,controls,entry,spread,turn,resetToken,onZoomChange,onReset}:{
  view:View;readSide:PageSide;reduced:boolean;controls:React.RefObject<OrbitControlsImpl>;
  entry:EntryPhase;spread:Spread;turn:Turn|null;resetToken:number;onZoomChange:(value:number)=>void;onReset:()=>void;
}){
  const {size,invalidate,camera,gl,scene}=useThree();
  const active=useRef(true),initialized=useRef(false);
  const zoom=useRef({level:0,baseDistance:0});
  const openingPush=useRef({started:false,done:false,elapsed:0,position:new THREE.Vector3(),target:new THREE.Vector3()});
  const targets=useMemo(()=>{
    const mobile=size.width<700;
    if(entry!=='open'){
      const distance=Math.max(22/(2*Math.tan(THREE.MathUtils.degToRad(37/2))*size.width/size.height),25);
      const target=new THREE.Vector3(3,.4,-1.5);
      return {target,position:target.clone().add(new THREE.Vector3(0,.82,.572).multiplyScalar(distance))};
    }
    const sceneX=spread==='start'?1.65:-1.65,readingX=readSide==='left'?-1.62:1.62;
    const target=new THREE.Vector3(0,.35,0);
    const distance=Math.max(7.8/(2*Math.tan(THREE.MathUtils.degToRad(37/2))*size.width/size.height),10.8);
    const position=target.clone().add(new THREE.Vector3(0,8.4,7).normalize().multiplyScalar(distance));
    if(view==='world'){
      target.set(sceneX,.65,mobile?.3:-.12);
      position.set(sceneX+(mobile?.75:1.25),mobile?8.4:4.3,mobile?8:4.8);
    }else if(view==='read'){
      target.set(mobile?readingX:0,.35,mobile?.6:0);
      position.set(mobile?readingX:0,mobile?10.6:7.6,mobile?4.8:4.5);
    }
    return {target:target.multiplyScalar(NOTEBOOK_SCALE),position:position.multiplyScalar(NOTEBOOK_SCALE)};
  },[entry,view,readSide,spread,size.width,size.height,resetToken]);
  const motion=useRef(targets);
  const raycaster=useMemo(()=>new THREE.Raycaster(),[]);
  useEffect(()=>{
    motion.current=targets;active.current=true;zoom.current={level:0,baseDistance:0};onZoomChange(0);invalidate();
  },[targets,onZoomChange,invalidate]);
  useEffect(()=>{invalidate();},[reduced,invalidate]);
  useEffect(()=>{
    const surface=gl.domElement.closest<HTMLElement>('.study-canvas');
    const orbit=controls.current;
    if(!surface||!orbit||entry!=='open'||turn)return;
    const beginOrbit=()=>{active.current=false;openingPush.current.done=true;};
    const changeZoom=(step:number,point:THREE.Vector2)=>{
      const orbit=controls.current;if(!orbit)return;
      const next=THREE.MathUtils.clamp(zoom.current.level+step,-.5,1);
      if(next===zoom.current.level)return;
      if(!zoom.current.baseDistance)zoom.current.baseDistance=orbit.getDistance();
      camera.updateMatrixWorld();scene.updateMatrixWorld(true);raycaster.setFromCamera(point,camera);
      const hit=raycaster.intersectObjects(scene.children,true).find(hit=>{
        let object:THREE.Object3D|null=hit.object;
        while(object){if(!object.visible)return false;object=object.parent;}
        return true;
      });
      const anchor=hit?.point??raycaster.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),orbit.target),new THREE.Vector3())!;
      const ratio=zoom.current.baseDistance*Math.pow(2,-next*1.5)/orbit.getDistance();
      // Scale eye and orbit target about the same world point: the viewing angle stays fixed.
      motion.current={position:camera.position.clone().sub(anchor).multiplyScalar(ratio).add(anchor),target:orbit.target.clone().sub(anchor).multiplyScalar(ratio).add(anchor)};
      zoom.current.level=next;openingPush.current.done=true;active.current=true;onZoomChange(next);invalidate();
    };
    const wheel=(event:WheelEvent)=>{
      if(event.ctrlKey||event.metaKey)return;
      event.preventDefault();const rect=gl.domElement.getBoundingClientRect();
      const point=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);
      const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?size.height:1);
      changeZoom(THREE.MathUtils.clamp(-pixels*.0018,-.25,.25),point);
    };
    const key=(event:KeyboardEvent)=>{
      if(event.ctrlKey||event.metaKey)return;
      if(event.key==='0'||event.key==='Escape'){event.preventDefault();onReset();}
      else if(['+','=','-'].includes(event.key)){event.preventDefault();changeZoom(event.key==='-'?-.2:.2,new THREE.Vector2());}
    };
    surface.addEventListener('wheel',wheel,{passive:false});window.addEventListener('keydown',key);orbit.addEventListener('start',beginOrbit);
    return()=>{surface.removeEventListener('wheel',wheel);window.removeEventListener('keydown',key);orbit.removeEventListener('start',beginOrbit);};
  },[entry,turn,gl,camera,scene,controls,raycaster,size.height,onZoomChange,onReset,invalidate]);
  useFrame((_,dt)=>{
    if(!active.current||!controls.current)return;
    const target=motion.current,push=openingPush.current;
    if(entry==='open'&&!push.done){
      if(view!=='desk')push.done=true;
      else{
        if(!push.started){push.started=true;push.position.copy(camera.position);push.target.copy(controls.current.target);}
        push.elapsed+=Math.min(dt,.1);const progress=reduced?1:Math.min(1,push.elapsed/2.6),eased=progress*progress*(3-2*progress);
        camera.position.lerpVectors(push.position,target.position,eased);controls.current.target.lerpVectors(push.target,target.target,eased);controls.current.update();
        if(progress===1){push.done=true;active.current=false;}else invalidate();return;
      }
    }
    const alpha=reduced||!initialized.current?1:1-Math.exp(-dt*4.3);initialized.current=true;
    camera.position.lerp(target.position,alpha);controls.current.target.lerp(target.target,alpha);controls.current.update();
    if(camera.position.distanceToSquared(target.position)<.000002&&controls.current.target.distanceToSquared(target.target)<.000002){
      camera.position.copy(target.position);controls.current.target.copy(target.target);controls.current.update();active.current=false;
    }else invalidate();
  });
  return null;
}

function Passport({ visible, disabled, onStamp }: {
  visible: boolean; disabled: boolean; onStamp: (chapter: StampChapter) => void;
}) {
  const { size } = useThree();
  if (!visible) return null;
  return <group>{passportStamps.map(({label:chapter, x, y}) => <Html key={chapter} center
    position={[-3.18 + x/1024*3.168, .445, y/1536*4.58-2.29]}
    zIndexRange={[1, 0]}>
    <button className="study-stamp-target" style={{width: size.width < 700 ? 60 : 76}}
      aria-label={`${chapter} passport stamp`} title={`Open ${chapter}`} disabled={disabled}
      onPointerDown={event => event.stopPropagation()}
      onClick={event => { event.stopPropagation(); onStamp(chapter); }}>
      <span className="study-screenreader">{chapter}</span>
    </button>
  </Html>)}</group>;
}

function DeskModel({ entry, canOpen, onOpen, onOpened, travel, pages, spread, turn, reduced, catRequest, catDestination, onCatPhase, onCatRequest, onReady, onTurned, onCampClick, onSelect, onStamp, passportVisible }: {
  travel:TravelActions; entry: EntryPhase; canOpen: boolean; onOpen: () => void; onOpened: () => void;
  pages: Pages; spread: Spread; turn: Turn | null; reduced: boolean; catRequest: number; catDestination:CampPoint|null; onCatPhase: (phase: CatPhase) => void; onCatRequest: () => void;
  onReady: () => void; onTurned: (spread: Spread) => void;
  onCampClick: (point:CampPoint) => void; onSelect: (spread: Spread) => void;
  onStamp: (chapter: StampChapter) => void; passportVisible: boolean;
}) {
  const { scene: source } = useGLTF(publicAsset('/desk-study/desk-scene.glb'));
  const [turnHalf,setTurnHalf]=useState(false);
  const forwardTurn=turn?spreads.indexOf(turn.to)>spreads.indexOf(turn.from):true;
  const leftSpread=turn?(forwardTurn?turn.from:turn.to):spread;
  const rightSpread=turn?(forwardTurn?turn.to:turn.from):spread;
  const nextSpread=spreads[spreads.indexOf(spread)+1];
  const coveredSide=turn?(turnHalf?(forwardTurn?'left':'right'):(forwardTurn?'right':'left')):undefined;
  const { invalidate } = useThree();
  const model = useMemo(() => {
    const scene = source.clone(true);
    const mesh = (name: string) => {
      const node = scene.getObjectByName(name);
      if (!(node instanceof THREE.Mesh)) throw new Error(`Missing study mesh: ${name}`);
      return node as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
    };
    scene.traverse(node => {
      if (node instanceof THREE.Mesh) {
        // Leave a clear corridor between the rear fir and the cat's standing plane.
        if (node.name.startsWith('Fir0')) node.position.z -= .30;
        node.castShadow = node.name !== 'Desktop';
        node.receiveShadow = true;
        for (const texture of [node.material.map, node.material.normalMap, node.material.roughnessMap]) {
          if (texture) texture.anisotropy = 8;
        }
        if (node.name === 'Desktop') {
          // The portrait overview sees farther across the desk; keep wood filling the frame.
          node.scale.x *= 2;
          node.scale.z *= 2;
          node.geometry = node.geometry.clone();
          const uv = node.geometry.attributes.uv;
          for (let i=0;i<uv.count;i++) uv.setXY(i,uv.getX(i)*2,uv.getY(i)*2);
          node.material = node.material.clone();
          node.material.color.set('#a2917e');
          node.material.roughness = .84;
        }
      }
    });
    const campChair=scene.getObjectByName('CampChair');
    if(campChair) campChair.position.z-=.12;
    for(const name of ['CeramicCup','FountainPen','BrassStamp']){const old=scene.getObjectByName(name);if(old)old.visible=false;}
    const left = mesh('PageLeft'), right = mesh('PageRight'), leaf = mesh('TurningLeaf');
    // The imported asset is cached; own only the geometry/materials we animate.
    for (const page of [left, right, leaf]) {
      page.material = makePageMaterial();
      page.castShadow = page === leaf;
    }
    leaf.geometry = leaf.geometry.clone();
    leaf.visible = false;
    const baseUV = Float32Array.from(leaf.geometry.attributes.uv.array);
    function setLeafArtwork(texture: Pages[Spread]['left'], mirrored: boolean) {
      applyPageArtwork(leaf.material,texture,true);
      const uv = leaf.geometry.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, mirrored ? 1-baseUV[i*2] : baseUV[i*2]);
      uv.needsUpdate = true;
    }
    const world = scene.getObjectByName('PaperWorld');
    if (!world) throw new Error('Missing study node: PaperWorld');
    const clouds=[0,1].map(index=>{
      const node=mesh(`PaperCloud${index}`),base=node.position.clone().add(new THREE.Vector3(0,.45,.10));
      node.position.copy(base);
      return {node,base};
    });
    const flap=new THREE.Group();flap.name='OpeningFlap';flap.position.y=.45;scene.add(flap);
    for(const name of ['LeatherCoverLeft','PageBlockLeft','PageLeft','CoverStitches-1']) {
      const node=scene.getObjectByName(name);
      if(!node)throw new Error(`Missing opening mesh: ${name}`);
      flap.attach(node);
    }
    flap.rotation.z=-Math.PI;
    let leather: THREE.MeshStandardMaterial | undefined;
    scene.traverse(node=>{if(node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial && node.material.name==='Cognac leather')leather=node.material;});
    if(!leather)throw new Error('Missing opening leather material');
    const originalLeather = leather;
    leather = originalLeather.clone();
    const leatherMaps: THREE.Texture[] = [];
    // The source scan has a broad central crease; sample its uninterrupted leather panel.
    for (const key of ['map','normalMap','roughnessMap'] as const) {
      const sourceMap = originalLeather[key];
      if (!sourceMap) continue;
      const texture = sourceMap.clone();
      texture.repeat.x = .36;
      texture.offset.x = .04;
      texture.needsUpdate = true;
      leather[key] = texture;
      leatherMaps.push(texture);
    }
    scene.traverse(node=>{
      if (!(node instanceof THREE.Mesh)) return;
      if (Array.isArray(node.material)) node.material=node.material.map(material=>material===originalLeather?leather!:material);
      else if (node.material===originalLeather) node.material=leather!;
    });
    const worldOrigin=world.getWorldPosition(new THREE.Vector3());
    const campOrigin:CampPoint=[worldOrigin.x,worldOrigin.z];
    const desktop=mesh('Desktop');desktop.removeFromParent();
    return { scene, flap, leather, leatherMaps, left, right, leaf, world, clouds, campOrigin, desktop, setLeafArtwork, base: Float32Array.from(leaf.geometry.attributes.position.array) };
  }, [source]);
  const animation = useRef<{ started: number | null; turn: Turn | null; flipped: boolean }>({ started: null, turn: null, flipped: false });
  const fold = useRef(0);
  const entryPopup=useRef(0);
  const cloudTime=useRef(0);



  useEffect(() => { onReady(); }, [onReady]);
  useEffect(() => {
    applyPageArtwork(model.left.material,pages[leftSpread].left,entry!=='open'||coveredSide==='left');
    applyPageArtwork(model.right.material,pages[rightSpread].right,entry!=='open'||coveredSide==='right');
    invalidate();
  }, [model, pages, leftSpread, rightSpread, coveredSide, entry, invalidate]);
  useEffect(() => {
    animation.current = { started: null, turn, flipped: false };
    setTurnHalf(false);
    if (turn) {
      const forward = spreads.indexOf(turn.to)>spreads.indexOf(turn.from);
      model.setLeafArtwork(pages[turn.from][forward ? 'right' : 'left'], !forward);
      invalidate();
    }
  }, [turn, model, pages, invalidate]);
  useEffect(() => () => {
    model.leaf.geometry.dispose();
    model.desktop.geometry.dispose();
    model.leather.dispose();
    for (const texture of model.leatherMaps) texture.dispose();
    for (const page of [model.left, model.right, model.leaf]) page.material.dispose();
  }, [model]);

  useFrame(({ clock }, dt) => {
    const current = animation.current;
    const showWorld = spread === 'start' && !turn;
    const foldTarget = entry==='open' ? (showWorld?1:.015) : Math.max(.015,entryPopup.current);
    fold.current = reduced ? foldTarget : THREE.MathUtils.damp(fold.current, foldTarget, 9, dt);
    // Fold the miniature down onto the sheet before the turning leaf carries it away.
    model.world.visible = entry==='closed' ? false : fold.current > (entry==='opening' ? .001 : .025);
    model.world.scale.y = fold.current;
    model.world.position.y = .445 * (1 - fold.current);
    if(entry==='open'&&showWorld&&!reduced)cloudTime.current+=Math.min(dt,.1);
    model.clouds.forEach(({node,base},index)=>{
      const phase=cloudTime.current*Math.PI*2/(14+index*4);
      node.position.x=base.x+(reduced?0:Math.sin(phase+index*1.6)*(.22-index*.04));
      node.position.y=base.y+(reduced?0:Math.sin(phase*.8+index)*.018);
    });
    if (Math.abs(fold.current - foldTarget) > .001) invalidate();
    if (!current.turn) return;
    if (current.started === null) current.started = clock.elapsedTime;
    const p = reduced ? 1 : Math.min(1, (clock.elapsedTime - current.started) / 1.65);
    const eased = p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
    const angle = eased * Math.PI;
    const forward = spreads.indexOf(current.turn.to)>spreads.indexOf(current.turn.from);
    const attr = model.leaf.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < attr.count; i++) {
      const x = model.base[i*3];
      const y = model.base[i*3+1];
      const z = model.base[i*3+2];
      const u = x / 3.18;
      const bend = Math.sin(Math.PI*p) * .23 * u;
      const theta = forward ? angle-bend : Math.PI-angle+bend;
      attr.setXYZ(i, x*Math.cos(theta), .332+(y-.332)*Math.cos(theta)+x*Math.sin(theta), z);
    }
    attr.needsUpdate = true;
    model.leaf.geometry.computeVertexNormals();
    // Bounds from the resting flat sheet would incorrectly cull the raised page.
    model.leaf.frustumCulled = false;
    model.leaf.visible = p < 1;
    if (p >= .5 && !current.flipped) {
      current.flipped = true;
      setTurnHalf(true);
      // Once the sheet crosses the spine its reverse face carries the new spread.
      // A sheet on the left has reflected X, so its UVs need the opposite orientation.
      model.setLeafArtwork(pages[current.turn.to][forward ? 'left' : 'right'], forward);
    }
    if (p === 1) {
      const next = current.turn.to;
      current.turn = null;
      onTurned(next);
    } else invalidate();
  });

  return (
    <>
      <primitive object={model.desktop}/>
      <group scale={.55} position={[0,.084,0]}><WriterDeskProps upperOffsetZ={-2.4} reduced={reduced}/></group>
      <group scale={NOTEBOOK_SCALE}>
      <primitive object={model.scene} onClick={(event: { stopPropagation: () => void; object: THREE.Object3D; delta: number; point:THREE.Vector3 }) => {
        // Orbit drags can release over a scene object; only a click enters it.
        if (event.delta > 4) return;
        event.stopPropagation();
        if (turn || entry!=='open') return;
        if (event.object.name === 'StartTab' || event.object.name === 'StartLettering') onSelect('start');
        else if (event.object.name === 'MakingTab' || event.object.name === 'MakingLettering') onSelect('making');
        else if (event.object.name === 'ProjectsTab' || event.object.name === 'ProjectsLettering') onSelect('projects');
        else if (event.object.name === 'ContactTab' || event.object.name === 'ContactLettering') onSelect('contact');
        else {
          let object: THREE.Object3D | null = event.object;
          while (object && object !== model.world) object = object.parent;
          if (object === model.world && spread === 'start') {
            const point=model.scene.worldToLocal(event.point.clone());
            onCampClick([point.x,point.z]);
          }
        }
      }} />
      {entry==='open'&&<Suspense fallback={null}><PageInk pages={pages} leftSpread={leftSpread} rightSpread={rightSpread} hiddenSide={coveredSide}/></Suspense>}
      {entry==='open'&&(spread==='making'||spread==='contact')&&<Suspense fallback={<Html position={[-1.6,.6,0]} center><span className="study-unfolding">Unfolding…</span></Html>}><ChapterInsert key={spread} spread={spread} travel={travel} reduced={reduced} turning={Boolean(turn)}/></Suspense>}
      {entry==='open'&&!turn&&<PageLinks spread={spread} travel={travel} onSelect={onSelect}/>}
      {entry==='open'&&!turn&&nextSpread&&<Html transform center rotation={[-Math.PI/2,0,0]} position={[2.98,.48,2.08]} distanceFactor={3.168/1024*400} zIndexRange={[1,0]} style={{pointerEvents:'none'}}>
        <button className="study-page-corner" aria-label="Next page" onPointerDown={event=>event.stopPropagation()}
          onClick={event=>{event.stopPropagation();onSelect(nextSpread);}}/>
      </Html>}
      <NotebookEntry flap={model.flap} leather={model.leather} phase={entry} reduced={reduced} canOpen={canOpen} popup={entryPopup} onOpen={onOpen} onOpened={onOpened}/>
      <CampSmoke visible={entry==='open' && spread==='start' && !turn} reduced={reduced}/>
      <Passport visible={entry==='open' && passportVisible && spread === 'start' && !turn} disabled={Boolean(turn)} onStamp={onStamp} />
      <NotebookCat visible={entry==='open' && spread === 'start' && !turn} reduced={reduced} request={catRequest} destination={catDestination} origin={model.campOrigin} onPhase={onCatPhase} onRequest={onCatRequest} />
      </group>
    </>
  );
}

// One cadence for ambient motion across the desk and the current chapter.
// Interaction animations still request their own frames while moving.
function AmbientAnimation({active}:{active:boolean}) {
  const {invalidate}=useThree();
  useEffect(()=>{
    invalidate();
    if(!active)return;
    const timer=window.setInterval(()=>{if(!document.hidden)invalidate();},90);
    return()=>window.clearInterval(timer);
  },[active,invalidate]);
  return null;
}

function Scene({ entry, canOpen, onOpen, onOpened, travel, pages, spread, view, readSide, turn, reduced, resetToken, onZoomChange, onReset, catRequest, catDestination, onCatPhase, onCatRequest, onReady, onTurned, onCampClick, onSelect, onStamp, passportVisible }: {
  travel:TravelActions; entry: EntryPhase; canOpen: boolean; onOpen: () => void; onOpened: () => void;
  resetToken:number;onZoomChange:(value:number)=>void;onReset:()=>void; pages: Pages; spread: Spread; view: View; readSide: PageSide; turn: Turn | null; reduced: boolean;
  catRequest: number; catDestination:CampPoint|null; onCatPhase: (phase: CatPhase) => void; onCatRequest: () => void;
  onReady: () => void; onTurned: (spread: Spread) => void; onCampClick: (point:CampPoint) => void; onSelect: (spread: Spread) => void;
  onStamp: (chapter: StampChapter) => void; passportVisible: boolean;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  return <Canvas frameloop="demand" dpr={[1, 2]} shadows="soft" camera={{ position: [1.5, 10.5, 9], fov: 37, near: .1, far: 200 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <AmbientAnimation active={entry==='open'&&!turn&&!reduced}/>
      <color attach="background" args={['#6d5037']} />
      <hemisphereLight args={['#fff7e9', '#685a4b', 1.2]} />
      <directionalLight position={[-3.8, 7, -2.7]} intensity={1.85} color="#fff3da" castShadow
        shadow-mapSize={[2048, 2048]} shadow-normalBias={.012} shadow-bias={-.00008}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={7} shadow-camera-bottom={-7}
        shadow-camera-near={.5} shadow-camera-far={22} />
      <directionalLight position={[4, 4, 4]} intensity={.3} color="#e3ede8" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.5} color="#fff5df" position={[-4, 5, 2]} rotation={[0, -.5, -Math.PI / 4]} scale={[5, 7, 1]} />
        <Lightformer form="rect" intensity={.7} color="#d9e3ee" position={[4, 3, -4]} rotation={[0, Math.PI*.75, 0]} scale={[4, 5, 1]} />
      </Environment>
      <DeskModel {...{ travel, entry, canOpen, onOpen, onOpened, pages, spread, turn, reduced, catRequest, catDestination, onCatPhase, onCatRequest, onReady, onTurned, onCampClick, onSelect, onStamp, passportVisible }} />
      {canOpen&&<ChapterPreload/>}
      <OrbitControls ref={controls} makeDefault enablePan={false} enableZoom={false} enableDamping
        minPolarAngle={.28} maxPolarAngle={1.25} minAzimuthAngle={-Math.PI/2} maxAzimuthAngle={Math.PI/2}
        enabled={!turn && entry==='open'} target={[0, .16, 0]} />
      <CameraDirector {...{ view, readSide, reduced, controls, entry, spread, turn, resetToken, onZoomChange, onReset }} />
    </Canvas>;
}

function Study() {
  const [pages, setPages] = useState<Pages | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [entry,setEntry]=useState<EntryPhase>('closed');
  const [canOpen,setCanOpen]=useState(false);
  const [spread, setSpread] = useState<Spread>('start');
  const [view, setView] = useState<View>('desk');
  const [notebookZoom,setNotebookZoom]=useState(0);
  const [resetToken,setResetToken]=useState(0);
  const [readSide, setReadSide] = useState<PageSide>('left');
  const [turn, setTurn] = useState<Turn | null>(null);
  const [visited,setVisited]=useState<Spread[]>(['start']);
  const makingVisited=visited.includes('making');
  const [journey,setJourney]=useState<Journey>('ready');
  const [post,setPost]=useState<PostState>('ready');
  const [catRequest, setCatRequest] = useState(0);
  const [catDestination,setCatDestination]=useState<CampPoint|null>(null);
  const [catPhase, setCatPhase] = useState<CatPhase>('idle');
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const turnSequence = useRef(0);
  const turnLock = useRef(false);
  const closerButton = useRef<HTMLButtonElement>(null);
  const chapterButton = useRef<HTMLButtonElement>(null);
  const makingButton = useRef<HTMLButtonElement>(null);
  const chapterFocus = useRef(false);
  const walkFocus = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    let live = true;
    let owned: Pages | null = null;
    makePages().then(result => {
      owned = result;
      if (live) setPages(result);
      else for (const pair of Object.values(result)) { pair.left.userData.clean.dispose();pair.right.userData.clean.dispose();pair.left.dispose();pair.right.dispose(); }
    }).catch(() => { if (live) setFailed(true); });
    return () => {
      live = false;
      media.removeEventListener('change', change);
      if (owned) for (const pair of Object.values(owned)) { pair.left.userData.clean.dispose();pair.right.userData.clean.dispose();pair.left.dispose();pair.right.dispose(); }
    };
  }, []);

  useEffect(()=>{
    if(!ready)return;
    const timer=window.setTimeout(()=>setCanOpen(true),1000);
    return()=>clearTimeout(timer);
  },[ready]);
  function openBook(){if(ready&&canOpen&&entry==='closed')setEntry('opening');}
  function finishEntry(){
    setEntry('open');
    setCatRequest(value=>value+1);
  }
  useEffect(()=>{if(entry==='open')chapterButton.current?.focus({preventScroll:true});},[entry]);
  function select(next: Spread) {
    if (!ready || entry!=='open' || turnLock.current || next === spread) return;
    turnLock.current = true;
    if(journey!=='collected')setJourney('ready');
    if(post!=='sent')setPost('ready');
    setNotebookZoom(0);setResetToken(value=>value+1);
    setReadSide(next==='making'||next==='contact'?'right':'left');
    setView('desk');
    setTurn({ from: spread, to: next, id: ++turnSequence.current });
  }
  function moveCat(point:CampPoint){
    if(!ready||entry!=='open'||turnLock.current||spread!=='start')return;
    setCatDestination(point);setCatRequest(value=>value+1);
  }
  function walkCat() {
    if (!ready || entry!=='open' || turnLock.current || catPhase !== 'idle') return;
    walkFocus.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
    setCatDestination(null);
    setCatRequest(value => value + 1);
  }
  useEffect(() => {
    if (catPhase !== 'idle' || !walkFocus.current) return;
    const target = walkFocus.current;
    walkFocus.current = null;
    if (target.isConnected && !target.disabled) target.focus({preventScroll: true});
  }, [catPhase]);
  function chooseStamp(chapter: StampChapter) {
    if (!ready || entry!=='open' || turnLock.current) return;
    if (chapter === 'Making') select('making');
    else if(chapter==='Projects')select('projects');
    else if(chapter==='Contact')select('contact');
    else if (chapter === 'Start') returnToDesk();
  }
  function finishTurn(next: Spread) {
    chapterFocus.current = true;
    setSpread(next);
    setTurn(null);
    turnLock.current = false;
    if(pages&&!visited.includes(next)){
      impressVisit(pages,chapterOf(next));setPages({...pages});setVisited(current=>[...current,next]);
    }
  }
  function finishJourney(phase:Journey){
    setJourney(phase);
    if(phase==='collected'&&pages){impressPostmark(pages,'balloon');setPages({...pages});}
  }
  function delivered(){setPost('sent');if(pages){impressPostmark(pages,'station');setPages({...pages});}}
  const travel:TravelActions={journey,post,setJourney:finishJourney,delivered,
    cancelPost:()=>setPost(value=>value==='posting'?'ready':value),
    startDesert:()=>{if(!turn&&journey==='ready')setJourney('walking');},
    startPost:()=>{if(!turn&&post==='ready')setPost('posting');},
  };

  const returnToDesk=useCallback(()=>{
    setNotebookZoom(0);setResetToken(value=>value+1);
    restoreFocus.current = true;
    setView('desk');
  },[]);
  useEffect(() => {
    if (view === 'desk' && restoreFocus.current) {
      (closerButton.current ?? document.querySelector<HTMLButtonElement>(`.study-chapters button[data-chapter="${chapterOf(spread)}"]`))?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [view,spread,resetToken]);
  useEffect(() => {
    if (!turn && chapterFocus.current) {
      chapterFocus.current = false;
      document.querySelector<HTMLButtonElement>(`.study-chapters button[data-chapter="${chapterOf(spread)}"]`)?.focus({preventScroll:true});
    }
  }, [spread, turn]);

  return (
    <main className="desk-study" data-spread={spread} data-view={view} data-notebook-zoom={notebookZoom.toFixed(3)} data-turning={Boolean(turn)} data-ready={ready && entry==='open'} data-loaded={ready} data-opening={entry} data-making-visited={makingVisited} data-cat-phase={catPhase} data-cat-request={catRequest} data-desert-state={journey} data-post-state={post}>
      <a href="#study-controls" className="study-skip">Skip to notebook controls</a>
      <div className="study-canvas" role="group" aria-label={spread === 'start'
        ? 'An open leather notebook on a wooden desk. A traveler’s passport on the left; paper mountains, clouds, staggered folded fir trees, a tent, campfire, Wander sign and cat on the right. A folding chair faces the fire. A ceramic coffee cup, fountain pen and brass stamp surround the book.'
        : spread==='making'?'Desert paper scene on the left; References, Build together, Refine on the right.':spread==='contact'?'Autumn railway station and postbox on the left; Fiona’s portrait, email, résumé and links on the right.':spread==='projects'?'PawPal photo scrapbook on the left; space for future personal projects on the right.':'Layout overview and actual before-and-after screenshots.'}>
          <Suspense fallback={null}>
            {pages && <Scene {...{ entry, canOpen, travel, pages, spread, view, readSide, turn, reduced, resetToken }} onZoomChange={setNotebookZoom} onReset={returnToDesk} onReady={() => setReady(true)} onOpen={openBook} onOpened={finishEntry}
              catRequest={catRequest} catDestination={catDestination} onCatPhase={setCatPhase} onCatRequest={walkCat} onTurned={finishTurn}
              onCampClick={moveCat} onSelect={select}
              onStamp={chooseStamp} passportVisible={view === 'desk' || (view === 'read' && readSide === 'left')} />}
          </Suspense>
      </div>
      <NotebookOpening active={!pages || !ready}/>
      {failed && <div className="study-loading" role="alert"><p>The paper couldn’t load.</p><button onClick={() => location.reload()}>Try again</button></div>}
      <div className={`study-caption${view === 'world' ? ' study-caption--close' : ''}`}>
        {entry==='open'&&view==='desk'?<span className="study-zoom-hint">{notebookZoom>.95?'Scroll back to zoom out':'Scroll to look closer'}</span>:<>
        <p>{entry==='closed'?'A notebook, waiting to be opened.':entry==='opening'?'Opening…':view === 'world' ? (spread==='start'?'The campsite':spread==='making'?'Desert Detour':'Slow Post Station') : spread === 'start' ? 'A small world. A little room to wander.' : spread==='making'?'Making · References, Build together, Refine':spread==='making-notes'?'Making · Process notes':spread==='projects'?'Projects · PawPal':'Contact · Slow Post Station'}</p>
        <span className="study-hint-desktop">{entry==='closed' ? 'Click the brass clasp to open.' : entry==='opening' ? ' ' : view === 'world' ? (spread==='start'?'Click anywhere in the campsite to move the cat.':spread==='making'?'Click the ground to walk; the balloon to receive a letter.':'Click the ground to walk; the postbox to collect a postmark.')+' Escape returns to the desk.' : spread === 'start' ? 'Click the campsite to move the cat. Choose a passport stamp to turn pages.' : 'Drag gently to change your point of view.'}</span>
        <span className="study-hint-mobile">{entry==='closed' ? 'Click the brass clasp to open.' : entry==='opening' ? ' ' : view === 'world' ? (spread==='start'?'Click anywhere in the campsite to move the cat.':spread==='making'?'Click the ground to walk; the balloon to receive a letter.':'Click the ground to walk; the postbox to collect a postmark.')+' Escape returns to the desk.' : spread === 'start' ? 'Tap the campsite to move the cat. Read the pages to choose a stamp.' : 'Drag gently to change your point of view.'}</span>
        </>}
      </div>
      <nav id="study-controls" className="study-controls" aria-label="Notebook controls">
        <div className="study-chapters" aria-label="Chapters">
          {chapters.map(chapter=><button key={chapter} data-chapter={chapter} ref={chapter==='start'?chapterButton:chapter==='making'?makingButton:undefined}
            aria-current={chapterOf(spread)===chapter?'page':undefined} disabled={!ready||entry!=='open'||Boolean(turn)} onClick={()=>select(chapter)}>{chapter[0].toUpperCase()+chapter.slice(1)}</button>)}
          {view === 'read' && <button className="study-other-page" aria-label={readSide === 'left' ? 'Read right page' : 'Read left page'}
            onClick={() => setReadSide(side => side === 'left' ? 'right' : 'left')}>
            {readSide === 'left' ? 'Right page →' : '← Left page'}
          </button>}
        </div>
        <div className="study-actions">
          {spread === 'start' && view === 'world' && <button disabled={!ready || entry!=='open' || Boolean(turn) || catPhase !== 'idle'} onClick={walkCat} aria-label="Walk with the cat">{catPhase === 'idle' ? 'Walk with the cat' : 'Walking…'}</button>}
          {spread==='making'&&<button onClick={()=>select('making-notes')} disabled={Boolean(turn)}>Process notes →</button>}
          {spread==='making-notes'&&<button onClick={()=>select('making')} disabled={Boolean(turn)}>← Making</button>}
          {spread==='making'&&view==='world'&&<button className="study-primary" onClick={travel.startDesert} disabled={Boolean(turn)||journey!=='ready'}>{journey==='collected'?'Airmail received':journey==='ready'?'Receive airmail':'Receiving…'}</button>}
          {spread==='contact'&&<button className="study-primary" onClick={travel.startPost} disabled={Boolean(turn)||post!=='ready'}>{post==='sent'?'Postmark collected':post==='ready'?'Collect postmark':'Posting…'}</button>}
          {view !== 'desk' && <button onClick={returnToDesk} disabled={entry!=='open' || Boolean(turn)}>← Back to desk</button>}
          {view === 'desk' && <button onClick={() => { setNotebookZoom(0);setResetToken(value=>value+1);setReadSide(spread==='making'||spread==='contact'?'right':'left'); setView('read'); }} disabled={!ready || entry!=='open' || Boolean(turn)}>Read the pages</button>}
          {(spread==='making'||spread==='contact') && view !== 'world' && <button className="study-primary" ref={closerButton} disabled={!ready || entry!=='open' || Boolean(turn)} onClick={() => {setNotebookZoom(0);setResetToken(value=>value+1);setView('world');}}>{spread==='making'?'Explore the desert':'Explore the station'} <span aria-hidden="true">↗</span></button>}
        </div>
      </nav>
      <div className="study-screenreader" role="status" aria-live="polite">
        {entry!=='open' ? (entry==='closed'?'Notebook closed. Use Open notebook to begin.':'Opening the notebook.') : catPhase !== 'idle' ? `Cat ${catPhase === 'turn' ? 'turning' : catPhase === 'walk' ? 'walking' : 'stopping'}.` : turn ? 'Turning the page.' : `${chapterOf(spread)} chapter. ${view === 'world' ? 'Exploring the paper world. Press Escape to return.' : view === 'read' ? 'Reading view. Press Escape to return.' : 'Desk view.'}`}
      </div>
      <section className="study-screenreader" aria-label="Notebook text">
        <h1>Fiona’s little world</h1>
        {spread==='start'?<><h2>Traveler’s passport</h2><p>Start, Making, Projects, Contact.</p><p>Scroll or use + and - to zoom. Press 0 to see the whole notebook. Click the campsite to choose where the cat walks.</p></>:spread==='making'?<><h2>Desert Detour / Making</h2><p>References: desk photos and paper-craft references; explore the look through prototypes. Build together: created with AI, Blender and Three.js; connect the notebook, scenes and cat. Refine: review screenshots and test in-browser; adjust the paper, movement and details.</p></>:spread==='making-notes'?<><h2>Process notes</h2><p>A layout overview and actual before-and-after screenshots of this website.</p></>:spread==='projects'?<><h2>PawPal</h2><p>A personal desktop companion that shows agent activity.</p></>:<><h2>About Fiona</h2><p>I work with data and build small tools. Email fionabfeng@gmail.com. Use the postbox to collect a station postmark.</p></>}

      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<StudyBoundary><Study /></StudyBoundary>);
