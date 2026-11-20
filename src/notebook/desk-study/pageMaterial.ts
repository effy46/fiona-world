import * as THREE from 'three';
import type {PageTexture} from './paper';

// Keep the paper physically lit, but print ink in the same colour space as live text.
export function makePageMaterial(){
  const material=new THREE.MeshStandardMaterial({roughness:.96,side:THREE.DoubleSide});
  const inkMap={value:null as THREE.Texture|null},inkVisible={value:0};
  material.userData.inkMap=inkMap;material.userData.inkVisible=inkVisible;
  material.onBeforeCompile=shader=>{
    shader.uniforms.pageInkMap=inkMap;shader.uniforms.pageInkVisible=inkVisible;
    shader.fragmentShader='uniform sampler2D pageInkMap;\nuniform float pageInkVisible;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
      #ifdef USE_MAP
        vec4 printedInk=texture2D(pageInkMap,vMapUv);
        gl_FragColor.rgb=mix(gl_FragColor.rgb,linearToOutputTexel(printedInk).rgb,printedInk.a*pageInkVisible);
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'notebook-paper-ink-v1';
  return material;
}
export function applyPageArtwork(material:THREE.MeshStandardMaterial,texture:PageTexture,printed:boolean){
  material.map=texture.userData.clean;
  material.userData.inkMap.value=texture;
  material.userData.inkVisible.value=printed?1:0;
  material.needsUpdate=true;
}
