import type {GroundPoint} from './routePlanner';

export function pathLength(path:readonly GroundPoint[]):number{
  let length=0;
  for(let i=1;i<path.length;i++)length+=Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]);
  return length;
}

// Routes include their starting point; a one-point route stays at that point.
export function pointAtDistance(path:readonly GroundPoint[],distance:number):GroundPoint{
  let remaining=Math.max(0,distance);
  for(let i=1;i<path.length;i++){
    const a=path[i-1],b=path[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(length===0)continue;
    if(remaining<=length){
      const fraction=remaining/length;
      return [a[0]+(b[0]-a[0])*fraction,a[1]+(b[1]-a[1])*fraction];
    }
    remaining-=length;
  }
  return path[path.length-1];
}
