import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const out = 'output/playwright/station-depth';
await mkdir(out, {recursive: true});
// Isolate the production station component so its geometry can be inspected at exact angles.
await writeFile(`${out}/fixture.html`, '<div id="root"></div><script type="module" src="./fixture.jsx"></script>');
await writeFile(`${out}/fixture.jsx`, `
import React, {Suspense,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {StationPaper,StationScene} from '/src/notebook/scenes/StationScene.tsx';
function Probe(){
  const state=useThree();
  useEffect(()=>{window.stationProbe=state;},[state]);
  return null;
}
const noop=()=>{};
createRoot(document.getElementById('root')).render(<Canvas camera={{position:[1,7,9],fov:37}}>
  <color attach="background" args={['#e6ddc9']}/>
  <ambientLight intensity={2}/><directionalLight position={[-4,8,5]} intensity={2}/>
  <Suspense fallback={null}><StationPaper><StationScene state="ready" reducedMotion paused={false} catSize={1.608695652} onDelivered={noop} onPost={noop} onCancelPost={noop}/></StationPaper><Probe/></Suspense>
</Canvas>);
document.body.style.cssText='margin:0;width:100vw;height:100vh';
document.getElementById('root').style.cssText='width:100%;height:100%';
window.THREE=THREE;
`);
const browser = await chromium.launch({channel: 'chrome'});
const checks = [], measurements = [];
try {
  const page = await browser.newPage({viewport: {width: 1200, height: 1000}});
  await page.goto(`http://127.0.0.1:5201/${out}/fixture.html`);
  await page.waitForFunction(() => window.stationProbe && document.querySelector('[aria-label="Walk with station cat"]'), null, {timeout: 45000});
  for (const [label, polar, yaw] of [['front', .9, 0], ['overhead', .28, 0], ['overhead-left', .28, -.8], ['overhead-right', .28, .8], ['overhead-far-left', .28, -Math.PI/2], ['overhead-far-right', .28, Math.PI/2]]) {
    const measurement = await page.evaluate(({polar, yaw}) => {
      const {camera, scene} = window.stationProbe, THREE = window.THREE;
      const target = new THREE.Vector3(0,.7,0);
      camera.position.setFromSpherical(new THREE.Spherical(10,polar,yaw)).add(target);
      camera.lookAt(target);camera.updateMatrixWorld();
      const button=document.querySelector('[aria-label="Walk with station cat"]');
      // The sprite is the textured plane in the same billboard as this cat's Html target.
      let sprite;
      scene.traverse(object=>{if(object.isMesh&&object.material.map?.image?.src?.includes('/cat-motion/poses.png'))sprite=object;});
      window.stationCat=sprite;
      return {found:Boolean(sprite),x:button.dataset.x,z:button.dataset.z};
    }, {polar, yaw});
    assert(measurement.found, 'production station cat sprite not found');
    await page.waitForTimeout(600);
    const orientation = await page.evaluate(() => {
      const normal=new window.THREE.Vector3(0,0,1).applyQuaternion(window.stationCat.getWorldQuaternion(new window.THREE.Quaternion()));
      const direction=window.stationProbe.camera.position.clone().sub(window.stationCat.getWorldPosition(new window.THREE.Vector3())).setY(0).normalize();
      return {normalY:normal.y,alignment:normal.dot(direction)};
    });
    await page.screenshot({path: `${out}/${label}.png`});
    measurements.push({label, ...orientation});
    assert(Math.abs(orientation.normalY) < .001, `${label}: cat tilts into station props (plane normal.y ${orientation.normalY.toFixed(3)})`);
    assert(orientation.alignment > .999, `${label}: cat does not face the observer horizontally (alignment ${orientation.alignment.toFixed(3)})`);
    checks.push(`${label}: actual cat plane stays upright and faces the observer horizontally`);
  }
  await writeFile(`${out}/verification.json`, JSON.stringify({checks, measurements}, null, 2) + '\n');
  console.log(JSON.stringify({checks, measurements}));
} finally {
  await browser.close();
}
