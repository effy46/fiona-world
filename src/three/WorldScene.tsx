import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Text } from '@react-three/drei';
import { Group, MathUtils, MeshBasicMaterial, Vector3 } from 'three';
import { Leva, useControls } from 'leva';
import { portfolioSections, sectionById, type SectionId } from '../content/portfolio';
import { playCrank, playSolve, playStep } from '../lib/audio';
import { prefersReducedMotion } from '../lib/webgl';
import { crankTargets, type CrankId, useWorldStore } from '../store/worldStore';
import {
  entryPath,
  nodePositions,
  nodeSections,
  pathSegments,
  sectionNodes,
  type NodeId,
} from './worldData';

type WorldSceneProps = {
  onSectionOpen: (id: SectionId) => void;
};

type WorldParams = {
  cameraZoom: number;
  fogOpacity: number;
};

type BoxProps = {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  sideColor?: string;
};

const cream = '#eadfc8';
const creamSide = '#d8cbb7';
const peach = '#e8a699';
const lavender = '#b79acb';
const sage = '#82b7a8';
const sky = '#86bfd0';
const slate = '#4f6175';
const rose = '#d2849b';
const gold = '#d0a25e';

const defaultWorldParams: WorldParams = { cameraZoom: 62, fogOpacity: 0.36 };

function DevWorldTuning({ onChange }: { onChange: (params: WorldParams) => void }) {
  const values = useControls('World', {
    cameraZoom: { value: 62, min: 42, max: 78 },
    fogOpacity: { value: 0.36, min: 0.05, max: 0.6 },
  });

  useEffect(() => {
    onChange(values);
  }, [onChange, values]);

  return <Leva collapsed />;
}

function BasicBox({ position, size, color, sideColor = creamSide }: BoxProps) {
  const materials = useMemo(
    () => [
      new MeshBasicMaterial({ color: sideColor }),
      new MeshBasicMaterial({ color: color }),
      new MeshBasicMaterial({ color: color }),
      new MeshBasicMaterial({ color: sideColor }),
      new MeshBasicMaterial({ color: color }),
      new MeshBasicMaterial({ color: sideColor }),
    ],
    [color, sideColor],
  );

  return (
    <mesh position={position} material={materials}>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Arch({ x, y, z, color }: { x: number; y: number; z: number; color: string }) {
  return (
    <group position={[x, y, z]}>
      <BasicBox position={[-0.28, 0.28, 0]} size={[0.18, 0.56, 0.12]} color={color} />
      <BasicBox position={[0.28, 0.28, 0]} size={[0.18, 0.56, 0.12]} color={color} />
      <BasicBox position={[0, 0.62, 0]} size={[0.74, 0.18, 0.12]} color={color} />
      <mesh position={[0, 0.28, -0.065]}>
        <boxGeometry args={[0.34, 0.46, 0.03]} />
        <meshBasicMaterial color="#365264" transparent opacity={0.46} />
      </mesh>
    </group>
  );
}

function Tower({ section, position }: { section: SectionId; position: [number, number, number] }) {
  const data = sectionById[section];
  const topColor = section === 'contact' ? sky : section === 'skills' ? sage : data.accent;

  return (
    <group position={position} onClick={(event) => event.stopPropagation()}>
      <BasicBox position={[0, 0.35, 0]} size={[1.18, 0.7, 1.18]} color={cream} />
      <BasicBox position={[0, 1.1, 0]} size={[0.84, 0.82, 0.84]} color={data.accent} sideColor="#c9b5b5" />
      <BasicBox position={[0, 1.88, 0]} size={[0.56, 0.78, 0.56]} color={cream} />
      <mesh position={[0, 2.43, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.52, 0.78, 4]} />
        <meshBasicMaterial color={topColor} />
      </mesh>
      <Arch x={0} y={1.04} z={-0.43} color="#f0dcc9" />
      <Arch x={0} y={1.82} z={-0.29} color="#f4e4d2" />
      <Text
        color="#32424d"
        fontSize={0.14}
        maxWidth={1.25}
        anchorX="center"
        anchorY="middle"
        position={[0, 2.95, 0]}
        rotation={[-0.8, 0, 0]}
      >
        {data.worldLabel}
      </Text>
    </group>
  );
}

function Stairs({ start, steps, dir }: { start: [number, number, number]; steps: number; dir: [number, number] }) {
  return (
    <group>
      {Array.from({ length: steps }).map((_, index) => (
        <BasicBox
          key={`${start.join('-')}-${index}`}
          position={[
            start[0] + dir[0] * index * 0.18,
            start[1] + index * 0.045,
            start[2] + dir[1] * index * 0.18,
          ]}
          size={[0.56, 0.08, 0.2]}
          color="#f1e4d0"
          sideColor="#cfc1b2"
        />
      ))}
    </group>
  );
}

function PathBlock({
  from,
  to,
  active,
}: {
  from: Vector3;
  to: Vector3;
  active: boolean;
}) {
  const mid = from.clone().add(to).multiplyScalar(0.5);
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  return (
    <mesh position={[mid.x, mid.y - 0.08, mid.z]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, 0.14, active ? 0.42 : 0.26]} />
      <meshBasicMaterial color={active ? '#f0dcc9' : '#b8b2bd'} transparent opacity={active ? 1 : 0.62} />
    </mesh>
  );
}

function Character({ target, moving }: { target: Vector3; moving: boolean }) {
  const group = useRef<Group>(null);
  const reduced = prefersReducedMotion();

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    if (reduced) {
      group.current.position.copy(target);
    } else {
      group.current.position.lerp(target, Math.min(1, delta * 5.8));
      group.current.position.y = target.y + (moving ? Math.sin(clock.elapsedTime * 12) * 0.035 : 0);
    }
  });

  return (
    <group ref={group} position={target}>
      <mesh position={[0, 0.23, 0]}>
        <boxGeometry args={[0.18, 0.46, 0.14]} />
        <meshBasicMaterial color="#e8dfcf" />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[0.22, 0.28, 0.16]} />
        <meshBasicMaterial color="#86a9c6" />
      </mesh>
      <mesh position={[0.12, 0.53, 0.02]} rotation={[0, 0, -0.28]}>
        <boxGeometry args={[0.08, 0.42, 0.08]} />
        <meshBasicMaterial color="#a8703f" />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#e8bfa6" />
      </mesh>
      <mesh position={[0, 0.92, -0.02]}>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshBasicMaterial color="#222832" />
      </mesh>
      <mesh position={[0, 0.08, 0.07]}>
        <boxGeometry args={[0.32, 0.06, 0.15]} />
        <meshBasicMaterial color="#ecebe3" />
      </mesh>
    </group>
  );
}

function Crank({
  id,
  position,
  solved,
  onRotate,
}: {
  id: CrankId;
  position: [number, number, number];
  solved: boolean;
  onRotate: (id: CrankId, delta: number) => void;
}) {
  const angle = useWorldStore((state) => state.crankAngles[id]);
  const wheel = useRef<Group>(null);
  const dragging = useRef(false);
  const reduced = prefersReducedMotion();
  const targetRotation = MathUtils.degToRad(angle);

  useFrame((_, delta) => {
    if (!wheel.current) return;
    wheel.current.rotation.z = reduced
      ? targetRotation
      : MathUtils.lerp(wheel.current.rotation.z, targetRotation, delta * 9);
  });

  function rotate(delta: number) {
    onRotate(id, delta);
  }

  return (
    <group position={position}>
      <Html center transform distanceFactor={7} position={[0, 0.9, 0]}>
        <button className="crank-label" type="button" aria-label={`Rotate ${id} crank`} onClick={() => rotate(45)}>
          {solved ? 'aligned' : 'rotate'}
        </button>
      </Html>
      <group
        ref={wheel}
        onPointerDown={(event) => {
          event.stopPropagation();
          dragging.current = true;
          rotate(45);
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return;
          event.stopPropagation();
          const movement = Math.abs(event.nativeEvent.movementX) + Math.abs(event.nativeEvent.movementY);
          if (movement > 8) rotate(event.nativeEvent.movementX >= 0 ? 15 : -15);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          dragging.current = false;
        }}
        onPointerLeave={() => {
          dragging.current = false;
        }}
      >
        <mesh>
          <torusGeometry args={[0.34, 0.055, 8, 24]} />
          <meshBasicMaterial color={solved ? gold : slate} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.72, 0.075, 0.075]} />
          <meshBasicMaterial color={solved ? '#d8b56f' : '#657990'} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.075, 0.72, 0.075]} />
          <meshBasicMaterial color={solved ? '#d8b56f' : '#657990'} />
        </mesh>
      </group>
    </group>
  );
}

function RotatingPlatform({
  id,
  position,
  solved,
}: {
  id: CrankId;
  position: [number, number, number];
  solved: boolean;
}) {
  const angle = useWorldStore((state) => state.crankAngles[id]);
  const group = useRef<Group>(null);
  const reduced = prefersReducedMotion();

  useFrame((_, delta) => {
    if (!group.current) return;
    const target = solved ? 0 : MathUtils.degToRad(angle);
    group.current.rotation.y = reduced ? target : MathUtils.lerp(group.current.rotation.y, target, delta * 5);
  });

  return (
    <group ref={group} position={position}>
      <BasicBox position={[0, 0, 0]} size={[0.9, 0.16, 0.36]} color={solved ? '#f0dcc9' : rose} sideColor="#b9859c" />
    </group>
  );
}

function Architecture({
  solvedEdges,
  onMoveTo,
  onRotateCrank,
}: {
  solvedEdges: Record<CrankId, boolean>;
  onMoveTo: (node: NodeId, path?: Vector3[]) => void;
  onRotateCrank: (id: CrankId, delta: number) => void;
}) {
  return (
    <group rotation={[0, -Math.PI / 4, 0]}>
      <mesh position={[0.8, -0.08, 0.4]}>
        <boxGeometry args={[10.8, 0.16, 5.8]} />
        <meshBasicMaterial color="#5f9ea4" transparent opacity={0.24} />
      </mesh>
      <BasicBox position={[-4.2, 0.88, 0]} size={[1.7, 1.76, 1.6]} color="#efc2ba" sideColor="#d5a6a8" />
      <Tower section="entry" position={[-4.2, 1.75, 0]} />
      <BasicBox position={[-1.65, 0.64, 0]} size={[1.44, 1.28, 1.34]} color="#e8d7c4" />
      <Tower section="projects" position={[1.35, 1.48, -1.4]} />
      <Tower section="skills" position={[1.25, 0.78, 1.65]} />
      <Tower section="thoughts" position={[3.65, 1.98, -0.2]} />
      <Tower section="contact" position={[4.95, 2.48, 1.75]} />
      <Stairs start={[-3.72, 1.42, 0.05]} steps={8} dir={[1, 0]} />
      <PathBlock from={entryPath[0]} to={entryPath[1]} active />
      <PathBlock from={entryPath[1]} to={entryPath[2]} active />
      <PathBlock from={entryPath[2]} to={entryPath[3]} active />
      {pathSegments.map((segment) => (
        <group key={segment.id} onClick={() => solvedEdges[segment.id] && onMoveTo(segment.to, segment.points)}>
          {segment.points.slice(1).map((point, index) => (
            <PathBlock
              key={`${segment.id}-${index}`}
              from={segment.points[index]}
              to={point}
              active={solvedEdges[segment.id]}
            />
          ))}
          <RotatingPlatform
            id={segment.id}
            position={[
              (segment.points[1].x + segment.points[2].x) / 2,
              (segment.points[1].y + segment.points[2].y) / 2 - 0.03,
              (segment.points[1].z + segment.points[2].z) / 2,
            ]}
            solved={solvedEdges[segment.id]}
          />
        </group>
      ))}
      <Crank id="projects" position={[-0.02, 1.68, -1.6]} solved={solvedEdges.projects} onRotate={onRotateCrank} />
      <Crank id="skills" position={[-0.06, 1.14, 1.52]} solved={solvedEdges.skills} onRotate={onRotateCrank} />
      <Crank id="thoughts" position={[2.74, 2.42, -1.38]} solved={solvedEdges.thoughts} onRotate={onRotateCrank} />
      <Crank id="contact" position={[3.52, 2.3, 2.12]} solved={solvedEdges.contact} onRotate={onRotateCrank} />
      <group onClick={() => onMoveTo('entry', [...entryPath].reverse())}>
        <mesh position={nodePositions.entry}>
          <sphereGeometry args={[0.24, 8, 8]} />
          <meshBasicMaterial color={peach} transparent opacity={0.01} />
        </mesh>
      </group>
      <group onClick={() => onMoveTo('hub', entryPath)}>
        <mesh position={nodePositions.hub}>
          <sphereGeometry args={[0.24, 8, 8]} />
          <meshBasicMaterial color={cream} transparent opacity={0.01} />
        </mesh>
      </group>
    </group>
  );
}

function FogPlanes({ opacity }: { opacity: number }) {
  return (
    <group>
      <mesh position={[1.2, 2.1, -4.2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[13, 4]} />
        <meshBasicMaterial color="#d9cde4" transparent opacity={opacity * 0.42} depthWrite={false} />
      </mesh>
      <mesh position={[4.8, 1.2, 2.6]} rotation={[0, -0.4, 0]}>
        <planeGeometry args={[8, 3]} />
        <meshBasicMaterial color="#8cc8c5" transparent opacity={opacity * 0.34} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Scene({ onSectionOpen, params }: WorldSceneProps & { params: WorldParams }) {
  const solvedEdges = useWorldStore((state) => state.solvedEdges);
  const audioEnabled = useWorldStore((state) => state.audioEnabled);
  const activeSection = useWorldStore((state) => state.activeSection);
  const setActiveSection = useWorldStore((state) => state.setActiveSection);
  const rotateCrank = useWorldStore((state) => state.rotateCrank);
  const target = useRef(nodePositions.entry.clone());
  const queue = useRef<Vector3[]>([]);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    target.current.copy(nodePositions[sectionNodes[activeSection]]);
  }, [activeSection]);

  const openSection = useCallback(
    (id: SectionId) => {
      setActiveSection(id);
      onSectionOpen(id);
    },
    [onSectionOpen, setActiveSection],
  );

  const moveTo = useCallback(
    (node: NodeId, path?: Vector3[]) => {
      queue.current = (path ?? [nodePositions[node]]).map((point) => point.clone());
      setMoving(true);
      const section = nodeSections[node];
      if (section) openSection(section);
      playStep(audioEnabled);
    },
    [audioEnabled, openSection],
  );

  useFrame(() => {
    const next = queue.current[0];
    if (!next) {
      if (moving) setMoving(false);
      return;
    }
    if (target.current.distanceTo(next) < 0.04) {
      target.current.copy(next);
      queue.current.shift();
      if (queue.current.length) playStep(audioEnabled);
    } else {
      target.current.lerp(next, prefersReducedMotion() ? 1 : 0.08);
    }
  });

  const rotate = useCallback(
    (id: CrankId, delta: number) => {
      const wasSolved = useWorldStore.getState().solvedEdges[id];
      const next = rotateCrank(id, delta);
      const nowSolved = useWorldStore.getState().solvedEdges[id];
      playCrank(audioEnabled, next);
      if (!wasSolved && nowSolved) playSolve(audioEnabled, id);
    },
    [audioEnabled, rotateCrank],
  );

  return (
    <>
      <FogPlanes opacity={params.fogOpacity} />
      <Architecture solvedEdges={solvedEdges} onMoveTo={moveTo} onRotateCrank={rotate} />
      <group rotation={[0, -Math.PI / 4, 0]}>
        <Character target={target.current} moving={moving} />
      </group>
    </>
  );
}

export function WorldScene({ onSectionOpen }: WorldSceneProps) {
  const [params, setParams] = useState(defaultWorldParams);
  const solvedEdges = useWorldStore((state) => state.solvedEdges);
  const crankAngles = useWorldStore((state) => state.crankAngles);
  const rotateCrank = useWorldStore((state) => state.rotateCrank);
  const audioEnabled = useWorldStore((state) => state.audioEnabled);

  function rotateFromOverlay(id: CrankId) {
    const wasSolved = useWorldStore.getState().solvedEdges[id];
    const next = rotateCrank(id, 45);
    const nowSolved = useWorldStore.getState().solvedEdges[id];
    playCrank(audioEnabled, next);
    if (!wasSolved && nowSolved) playSolve(audioEnabled, id);
  }

  return (
    <div className="world-canvas" aria-label="Interactive 3D isometric portfolio world">
      {import.meta.env.DEV && <DevWorldTuning onChange={setParams} />}
      <Canvas
        orthographic
        dpr={[1, 1.7]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [7, 5.8, 7], zoom: params.cameraZoom, near: 0.1, far: 80 }}
      >
        <Scene onSectionOpen={onSectionOpen} params={params} />
      </Canvas>
      <div className="world-help" aria-hidden="true">
        <span>Click paths to walk</span>
        <span>Click or drag crank wheels to align bridges</span>
      </div>
      <div className="crank-controls" aria-label="Crank controls">
        {(Object.keys(crankTargets) as CrankId[]).map((id) => (
          <button
            key={id}
            type="button"
            aria-label={`Rotate ${id} crank`}
            data-solved={solvedEdges[id]}
            onClick={() => rotateFromOverlay(id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                rotateFromOverlay(id);
              }
            }}
          >
            {id}
            <span>{solvedEdges[id] ? 'aligned' : `${Math.round(crankAngles[id])} deg`}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
