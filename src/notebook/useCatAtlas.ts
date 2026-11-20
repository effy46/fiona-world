import {useEffect, useMemo} from 'react';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
import {publicAsset} from '../lib/publicAsset';

export function setCatAtlasPose(texture: THREE.Texture, frame: number, mirrored = false) {
  texture.repeat.set(mirrored ? -.25 : .25, .25);
  texture.offset.set((frame % 4 + (mirrored ? 1 : 0)) / 4, 1 - (Math.floor(frame / 4) + 1) / 4);
}

export function useCatAtlas(anisotropy = 1) {
  const source = useTexture(publicAsset('/desk-study/cat-motion/poses.png'));
  const texture = useMemo(() => {
    const copy = source.clone();
    copy.colorSpace = THREE.SRGBColorSpace;
    copy.anisotropy = anisotropy;
    setCatAtlasPose(copy, 0);
    copy.needsUpdate = true;
    return copy;
  }, [source, anisotropy]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
