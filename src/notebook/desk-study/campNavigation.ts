import {planGridRoute,type GroundPoint} from '../routePlanner';
export type CampPoint = GroundPoint;
const step=.025, minX=.46, maxX=2.86, minZ=-.16, maxZ=1.14;
const columns=Math.round((maxX-minX)/step)+1, rows=Math.round((maxZ-minZ)/step)+1;
const mountain:CampPoint[]=[[.83,-.24],[1.55,-.46],[2.29,-.24],[1.56,.10]];
const rectangles=[[1.62,2.66,.26,1.08],[.28,1.02,.73,.99]] as const;
const circles=[[.56,-.5,.29],[.44,.37,.25],[.45,.97,.21],[2.75,-.26,.31],[2.55,.10,.24],[1.16,.35,.30],[1.49,.80,.32]] as const;

function segmentDistance(p:CampPoint,a:CampPoint,b:CampPoint){
  const dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);
}
export function campWalkable([x,z]:CampPoint){
  if(x<minX||x>maxX||z<minZ||z>maxZ)return false;
  // Ground footprints include room for the cat's feet; scenery stays solid.
  for(const [left,right,back,front] of rectangles)if(x>left&&x<right&&z>back&&z<front)return false;
  for(const [cx,cz,r] of circles){
    if(Math.hypot(x-cx,z-cz)<r)return false;
  }
  let inside=false;
  for(let i=0,j=mountain.length-1;i<mountain.length;j=i++){
    const a=mountain[i],b=mountain[j];
    if(segmentDistance([x,z],a,b)<.10)return false;
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return !inside;
}
function segmentsCross(a:CampPoint,b:CampPoint,c:CampPoint,d:CampPoint){
  const cross=(p:CampPoint,q:CampPoint,r:CampPoint)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  return Math.max(a[0],b[0])>=Math.min(c[0],d[0])&&Math.max(c[0],d[0])>=Math.min(a[0],b[0])&&
    Math.max(a[1],b[1])>=Math.min(c[1],d[1])&&Math.max(c[1],d[1])>=Math.min(a[1],b[1])&&
    cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0;
}
function clearSegment(a:CampPoint,b:CampPoint){
  if(!campWalkable(a)||!campWalkable(b))return false;
  for(const [x,z,r] of circles)if(segmentDistance([x,z],a,b)<r)return false;
  for(const [left,right,back,front] of rectangles){
    const corners:CampPoint[]=[[left,back],[right,back],[right,front],[left,front]];
    for(let i=0;i<4;i++)if(segmentsCross(a,b,corners[i],corners[(i+1)%4]))return false;
  }
  for(let i=0;i<mountain.length;i++){
    const c=mountain[i],d=mountain[(i+1)%mountain.length];
    if(segmentsCross(a,b,c,d)||Math.min(segmentDistance(a,c,d),segmentDistance(b,c,d),segmentDistance(c,a,b),segmentDistance(d,a,b))<.10)return false;
  }
  return true;
}
const points:CampPoint[]=Array.from({length:columns*rows},(_,i)=>[Math.min(maxX,minX+(i%columns)*step),Math.min(maxZ,minZ+Math.floor(i/columns)*step)]);
const open=points.map(campWalkable);

// Pointer hits and the cat share notebook-root coordinates; GLB scenery has its own origin.
export function planCampRoute(start:CampPoint,goal:CampPoint,origin:CampPoint):CampPoint[]{
  return planGridRoute(
    {points,open,columns,rows,walkable:campWalkable,clear:clearSegment,preventCornerCutting:true},
    [start[0]-origin[0],start[1]-origin[1]],
    [goal[0]-origin[0],goal[1]-origin[1]]
  )
    .map(([x,z])=>[x+origin[0],z+origin[1]]);
}
