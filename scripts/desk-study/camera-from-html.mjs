import * as THREE from 'three';
// Drei's CSS camera matrix mirrors Y for DOM coordinates; undo that to read the live camera.
export async function cameraFromHtml(page,width,height,selector='.study-page-corner'){
 const values=await page.locator(selector).first().evaluate(el=>{
  for(let node=el;node;node=node.parentElement){const css=node.style.transform;if(css.includes('translateZ(')&&css.includes('matrix3d('))return Array.from(new DOMMatrix(css.match(/matrix3d\([^)]+\)/)[0]).toFloat64Array());}
  throw Error('No transformed paper camera found');
 });
 const signs=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1];
 const view=new THREE.Matrix4().fromArray(values.map((v,i)=>v*signs[i]));
 const camera=new THREE.PerspectiveCamera(37,width/height,.1,200);view.invert().decompose(camera.position,camera.quaternion,camera.scale);camera.updateMatrixWorld();return camera;
}
