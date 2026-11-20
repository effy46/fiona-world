import {planGridRoute,type GroundPoint} from '../routePlanner';
export type TravelPoint=GroundPoint;
export type TravelGround='desert'|'station';
const step=.1;
export function travelWalkable(scene:TravelGround,[x,z]:TravelPoint){
  if(x< -2.55||x>2.55)return false;
  if(scene==='station'){
    // Stay on the platform, in front of the fence and behind the train/rails.
    if(z<-.28||z>.93)return false;
    if(x> -2.45&&x< -1.20&&z>-.08&&z<.82)return false;
    if(x> -1.42&&x<.43&&z<-.12)return false;
    return [[-1.98,-.44,.24],[.99,-.44,.24],[2.1,-.5,.60],[2.68,.35,.42]].every(([cx,cz,r])=>Math.hypot(x-cx,z-cz)>=r);
  }
  if(z<-.5||z>3.05)return false;
  // Camper footprint in its rotated local frame, including foot clearance.
  const dx=x+.75,dz=z-1.3,c=Math.cos(-.8),s=Math.sin(-.8);
  if(Math.abs(c*dx-s*dz)<1.5&&Math.abs(s*dx+c*dz)<.88)return false;
  return [[-2.06,-.95,.60],[2.13,-.66,.58],[.28,-.98,.75],[1.27,.05,.55],[-2.35,1.97,.55],[2.35,1.97,.4],[1.5,2.8,.3],[-1.9,-.1,.32]]
    .every(([cx,cz,r])=>Math.hypot(x-cx,z-cz)>=r);
}
export function planTravelRoute(scene:TravelGround,start:TravelPoint,goal:TravelPoint):TravelPoint[]{
  const minX=-2.55,minZ=scene==='station'?-.28:-.5,maxZ=scene==='station'?.93:3.05;
  const columns=52,rows=Math.floor((maxZ-minZ)/step)+1;
  const points:TravelPoint[]=Array.from({length:columns*rows},(_,i)=>[minX+i%columns*step,minZ+Math.floor(i/columns)*step]);
  const open=points.map(p=>travelWalkable(scene,p));
  const clear=(a:TravelPoint,b:TravelPoint)=>{
    const count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/(step/3)));
    for(let i=0;i<=count;i++)if(!travelWalkable(scene,[a[0]+(b[0]-a[0])*i/count,a[1]+(b[1]-a[1])*i/count]))return false;
    return true;
  };
  return planGridRoute({points,open,columns,rows,walkable:point=>travelWalkable(scene,point),clear,preventCornerCutting:false},start,goal);
}
