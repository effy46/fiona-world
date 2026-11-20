import {Text} from '@react-three/drei';
import {useThree} from '@react-three/fiber';
import type {Pages,Spread} from './paper';
import {PAGE_FONTS,PAGE_TYPE,PAGE_OUTLINE} from './typography';

// The same collected type runs render on every spread and its turning-page texture.
export function PageInk({pages,leftSpread,rightSpread,hiddenSide}:{pages:Pages;leftSpread:Spread;rightSpread:Spread;hiddenSide?:'left'|'right'}){
  const {invalidate}=useThree();
  return <group>{(['left','right'] as const).flatMap(side=>side===hiddenSide?[]:pages[side==='left'?leftSpread:rightSpread][side].userData.textRuns.map((run,index)=>run.hideWhenCollected&&pages[side==='left'?leftSpread:rightSpread][side].userData.collected?null:<Text
    key={`${side}-${index}`} font={PAGE_FONTS[PAGE_TYPE[run.role].font].src}
    position={[(side==='left'?-3.18:.012)+run.x/1024*3.168,.465,run.y/1536*4.58-2.29]}
    rotation={[-Math.PI/2,0,run.angle]} fontSize={run.size/1536*4.58} scale={[1.03755,1,1]}
    anchorX={run.center?'center':'left'} anchorY="bottom-baseline" color={run.color}
    outlineWidth={PAGE_OUTLINE} outlineColor={run.color} depthOffset={-4} sdfGlyphSize={128}
    onSync={()=>invalidate()} raycast={()=>{}} material-toneMapped={false}>
    {run.copy}
  </Text>))}</group>;
}
