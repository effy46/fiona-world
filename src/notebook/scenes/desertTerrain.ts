import {MathUtils} from 'three';

// One shared ground surface owns the sand mesh, vehicle turnout, plant bases and cat landings.
export function sandHeight(x: number, z: number) {
  const edge = MathUtils.smoothstep(Math.min((2.9-Math.abs(x))/0.55,(3.05-Math.abs(z))/0.5),0,1);
  const dunes = 0.72*Math.exp(-((x-1.9)**2/1.1+(z+0.15)**2/2.8))
    +0.48*Math.exp(-((x+1.7)**2/1.2+(z+1.8)**2/1.5))
    +0.4*Math.exp(-((x-0.5)**2/1.8+(z-2.5)**2/0.8))
    +0.28*Math.exp(-((x+2.1)**2/0.8+(z-0.4)**2/2));
  const dx=x+0.75, dz=z-1.3, a=-0.8;
  const along=Math.cos(a)*dx-Math.sin(a)*dz, across=Math.sin(a)*dx+Math.cos(a)*dz;
  // A gently packed turnout keeps all four wheels on the same surface.
  const turnout=MathUtils.smoothstep(Math.max(Math.abs(along)/1.32,Math.abs(across)/0.64),1,1.6);
  const shaped=0.11*(1-turnout)+(0.075+dunes)*turnout;
  const tracks=along < -0.9 && along > -2.8 ? 0.014*Math.exp(-(((Math.abs(across)-0.525)/0.045)**2))*MathUtils.smoothstep(-along,0.9,1.25) : 0;
  return 0.065+(shaped-0.065-tracks)*edge;
}
