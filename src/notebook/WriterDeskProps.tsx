import { publicAsset } from '../lib/publicAsset';
import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Candle, MugSteam } from './DeskProps';
import { CameraStillLife } from './CameraStillLife';

type Vec3 = [number, number, number];

function DeskModel({ name, position, scale = 1, yaw = 0 }: { name: string; position: Vec3; scale?: number; yaw?: number }) {
  const { scene } = useGLTF(publicAsset(`/desk-writer/${name}.glb`));
  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        // Clear lenses and printed ink should not create solid shadow discs or raised lettering.
        object.castShadow = !materials.some(material => material.name.startsWith('WD_glasses_clear lens') || material.name.startsWith('WD_printed ink'));
        object.receiveShadow = true;
      }
    });
  }, [scene]);
  return <group position={position} rotation={[0, yaw, 0]} scale={scale}><primitive object={scene} dispose={null} /></group>;
}

/** World-space staging. The typewriter body is 9.9u wide vs the notebook's ~12.4u. */
export function WriterDeskProps({ upperOffsetZ = 0, reduced }: { upperOffsetZ?: number; reduced: boolean }) {
  return (
    <group>
      <group position={[0, 0, upperOffsetZ]}>
      <CameraStillLife />
      <DeskModel name="typewriter" position={[12.8, -0.18, -8]} scale={3} yaw={-0.1} />
      <group position={[-8.1, -0.18, -5.3]} scale={1.25} rotation={[0, -0.4, 0]}>
        <DeskModel name="coffee" position={[0, 0, 0]} />
        {/* Coffee surface is y=1.125 in the GLB; the shared wisps start at y=0.54. */}
        <group position={[0, 0.585, 0]}><MugSteam reduced={reduced} /></group>
      </group>
      <group position={[4.5, -0.18, -6.2]} scale={2.2}><Candle position={[0, 0, 0]} rot={2.1} reduced={reduced} /></group>
      <DeskModel name="ink" position={[-1.4, -0.18, -6.1]} scale={1.3} yaw={-0.12} />
      <DeskModel name="glasses" position={[-4.8, -0.18, -5.9]} yaw={0.16} />
      <DeskModel name="pen" position={[0.1, -0.18, -7.8]} yaw={-0.15} />
      </group>
      <DeskModel name="stamp" position={[12.1, -0.18, 5.7]} scale={1.6} yaw={0.3} />
    </group>
  );
}
